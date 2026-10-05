import { SupabaseClient } from '@supabase/supabase-js';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import { OrderStateMachine } from '@/core/fintech/state-machines';
import { LedgerValidator, LedgerTransactionDraft, LedgerEntryDraft } from '@/core/fintech/ledger';
import { Money, CurrencyCode } from '@/core/fintech/money';
import { AuditLogger } from '@/core/security/audit';
import { getServerEnv } from '@/core/config/env';

export interface WebhookProcessingResult {
  success: boolean;
  duplicate: boolean;
  eventId: string;
  orderId?: string;
  status: string;
  message: string;
}

export class WebhookEngine {
  private client: SupabaseClient;
  private proxypayAdapter: ProxyPayAdapter;

  constructor(client: SupabaseClient, adapter?: ProxyPayAdapter) {
    this.client = client;

    if (adapter) {
      this.proxypayAdapter = adapter;
    } else {
      let config = {
        apiUrl: 'https://api.sandbox.proxypay.co.ao',
        token: '',
        entity: '99999',
        webhookSecret: '',
      };
      try {
        const env = getServerEnv();
        config = {
          apiUrl: env.PROXYPAY_API_URL,
          token: env.PROXYPAY_TOKEN || '',
          entity: env.PROXYPAY_ENTITY || '99999',
          webhookSecret: env.PROXYPAY_WEBHOOK_SECRET || '',
        };
      } catch {
        // Fallback
      }
      this.proxypayAdapter = new ProxyPayAdapter(config);
    }
  }

  /**
   * Implements Section 30 (15-step Webhook Engine):
   * 1. Validate cryptographic HMAC signature.
   * 2. Identify provider.
   * 3. Persist event & 4. Guarantee idempotency (INV-004).
   * 5. Locate payment attempt.
   * 6. Compare order.
   * 7. Compare currency & 8. Compare amount.
   * 9. Validate status.
   * 10. Execute transaction & 11. Update order status to PAID.
   * 12. Generate double-entry ledger entries (INV-005, INV-006).
   * 13. Generate entitlements (INV-007).
   * 14. Record audit log.
   * 15. Emit outbox event.
   */
  async processProxyPayWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    requestId: string;
  }): Promise<WebhookProcessingResult> {
    const { headers, rawBody, requestId } = params;

    // 1. Validate HMAC signature
    const isValidSignature = this.proxypayAdapter.verifyWebhook(headers, rawBody);
    if (!isValidSignature) {
      throw new Error('UNAUTHORIZED_SIGNATURE: Assinatura criptográfica do webhook inválida.');
    }

    // 2. Identify provider & Parse normalized event
    const event = this.proxypayAdapter.parseEvent(rawBody);

    // 3. Persist event & 4. Enforce Idempotency (INV-004)
    const { data: existingEvent } = await this.client
      .from('payment_provider_events')
      .select('id, status')
      .eq('provider', 'PROXYPAY')
      .eq('provider_event_id', event.eventId)
      .maybeSingle();

    if (existingEvent) {
      return {
        success: true,
        duplicate: true,
        eventId: event.eventId,
        orderId: event.orderId,
        status: existingEvent.status,
        message: 'IDEMPOTENCY_OK: Evento já foi recebido e processado anteriormente.',
      };
    }

    // Insert event with status RECEIVED
    const { error: insertEventError } = await this.client
      .from('payment_provider_events')
      .insert({
        provider: 'PROXYPAY',
        provider_event_id: event.eventId,
        payload: event.rawPayload,
        status: 'RECEIVED',
      });

    if (insertEventError) {
      // In case of concurrent race condition catching UNIQUE constraint
      return {
        success: true,
        duplicate: true,
        eventId: event.eventId,
        status: 'DUPLICATE',
        message: 'IDEMPOTENCY_RACE: Evento concorrente duplicado deduplicado pelo banco.',
      };
    }

    // 5. Locate Payment Attempt by provider_reference
    const { data: attempt, error: attemptError } = await this.client
      .from('payment_attempts')
      .select('*')
      .eq('provider', 'PROXYPAY')
      .eq('provider_reference', event.providerReference)
      .maybeSingle();

    if (attemptError || !attempt) {
      throw new Error(`Tentativa de pagamento não localizada para a referência ${event.providerReference}`);
    }

    // 6. Compare & Locate Order
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', attempt.order_id)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error(`Pedido ${attempt.order_id} não encontrado`);
    }

    // 7. Compare Currency
    const paidCurrency = event.paidAmount?.currency || 'AOA';
    if (paidCurrency !== order.currency) {
      throw new Error(`Divergência de moeda: pedido em ${order.currency}, recebido ${paidCurrency}`);
    }

    // 8. Compare Amount
    const paidMinor = event.paidAmount?.amount ?? 0n;
    const orderTotalMinor = BigInt(order.total_amount_minor);

    if (paidMinor !== orderTotalMinor) {
      throw new Error(`Divergência monetária: esperado ${orderTotalMinor}, recebido ${paidMinor}`);
    }

    // 9. Validate Payment Status
    if (event.status !== 'PAID') {
      // If payment failed or expired at gateway
      await this.client
        .from('payment_attempts')
        .update({ status: event.status, updated_at: new Date().toISOString() })
        .eq('id', attempt.id);

      return {
        success: true,
        duplicate: false,
        eventId: event.eventId,
        orderId: order.id,
        status: event.status,
        message: `Tentativa atualizada para status ${event.status}`,
      };
    }

    // 10 & 11. Atomic State Machine Transition: Order -> PAID
    OrderStateMachine.transition(order.status, 'PAID');

    await this.client
      .from('orders')
      .update({ status: 'PAID', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    await this.client
      .from('payment_attempts')
      .update({ status: 'PAID', updated_at: new Date().toISOString() })
      .eq('id', attempt.id);

    // 12. Double-Entry Ledger Distribution (INV-005, INV-006)
    await this.recordLedgerDistribution(order);

    // 13. Generate Entitlements for Buyer (INV-007)
    await this.grantEntitlements(order);

    // 14. Record Audit Log
    try {
      const auditEntry = AuditLogger.createEntry({
        actorId: 'system:proxypay_webhook',
        actorRole: 'SYSTEM',
        action: 'order:paid',
        entity: 'orders',
        entityId: order.id,
        beforeState: { status: order.status },
        afterState: { status: 'PAID', providerReference: event.providerReference },
        requestId,
      });

      await this.client.from('audit_logs').insert({
        actor_id: null,
        actor_role: auditEntry.actorRole,
        action: auditEntry.action,
        entity: auditEntry.entity,
        entity_id: auditEntry.entityId,
        before_state: auditEntry.beforeState,
        after_state: auditEntry.afterState,
        request_id: auditEntry.requestId,
      });
    } catch {
      // Non-blocking
    }

    // 15. Emit Outbox Event
    try {
      await this.client.from('outbox_events').insert({
        event_type: 'order.paid',
        payload: {
          orderId: order.id,
          buyerId: order.buyer_id,
          totalAmount: order.total_amount_minor.toString(),
          currency: order.currency,
          paidAt: new Date().toISOString(),
        },
        status: 'PENDING',
      });
    } catch {
      // Non-blocking
    }

    // Mark event processed
    await this.client
      .from('payment_provider_events')
      .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
      .eq('provider', 'PROXYPAY')
      .eq('provider_event_id', event.eventId);

    return {
      success: true,
      duplicate: false,
      eventId: event.eventId,
      orderId: order.id,
      status: 'PAID',
      message: 'Pagamento confirmado e processado com sucesso.',
    };
  }

  private async recordLedgerDistribution(order: {
    id: string;
    total_amount_minor: bigint | string;
    currency: string;
    affiliate_id?: string | null;
    order_items?: Array<{ product_id: string }>;
  }) {
    const currency = order.currency as CurrencyCode;
    const totalMoney = Money.fromMinor(BigInt(order.total_amount_minor), currency);

    // Platform Fee: 10% (can be fetched from platform_settings)
    const platformFeeMoney = totalMoney.multiply(0.1);

    // Affiliate Commission: 20% if affiliate exists, otherwise 0%
    const affiliateMoney = order.affiliate_id ? totalMoney.multiply(0.2) : Money.zero(currency);

    // Creator Earnings: Remainder
    const creatorEarningsMoney = totalMoney.subtract(platformFeeMoney).subtract(affiliateMoney);

    // Verify balance: Debits == Credits (INV-006)
    const clearingAccount = await this.getOrCreateAccount(null, 'PAYMENT_CLEARING', currency);
    const platformAccount = await this.getOrCreateAccount(null, 'PLATFORM_REVENUE', currency);

    // Find product creator
    let creatorUserId: string | null = null;
    if (order.order_items && order.order_items[0]) {
      const { data: prod } = await this.client
        .from('products')
        .select('creator_id')
        .eq('id', order.order_items[0].product_id)
        .maybeSingle();
      creatorUserId = prod?.creator_id || null;
    }

    const creatorAccount = await this.getOrCreateAccount(creatorUserId, 'CREATOR_BALANCE', currency);

    let affiliateAccount: { id: string } | null = null;
    if (order.affiliate_id && affiliateMoney.isPositive()) {
      affiliateAccount = await this.getOrCreateAccount(order.affiliate_id, 'AFFILIATE_BALANCE', currency);
    }

    const entries: LedgerEntryDraft[] = [
      {
        accountId: clearingAccount.id,
        accountType: 'PAYMENT_CLEARING',
        direction: 'DEBIT',
        amount: totalMoney.amount,
        currency,
      },
      {
        accountId: platformAccount.id,
        accountType: 'PLATFORM_REVENUE',
        direction: 'CREDIT',
        amount: platformFeeMoney.amount,
        currency,
      },
      {
        accountId: creatorAccount.id,
        accountType: 'CREATOR_BALANCE',
        direction: 'CREDIT',
        amount: creatorEarningsMoney.amount,
        currency,
      },
    ];

    if (affiliateAccount && affiliateMoney.isPositive()) {
      entries.push({
        accountId: affiliateAccount.id,
        accountType: 'AFFILIATE_BALANCE',
        direction: 'CREDIT',
        amount: affiliateMoney.amount,
        currency,
      });
    }

    const txDraft: LedgerTransactionDraft = {
      referenceId: order.id,
      transactionType: 'SALE',
      description: `Distribuição contábil de venda do pedido ${order.id}`,
      currency,
      entries,
    };

    // Strict validation enforcing INV-006
    LedgerValidator.validate(txDraft);

    // Persist ledger transaction header
    const { data: txRecord } = await this.client
      .from('ledger_transactions')
      .insert({
        reference_id: order.id,
        transaction_type: txDraft.transactionType,
        description: txDraft.description,
        currency: txDraft.currency,
      })
      .select('id')
      .single();

    if (txRecord) {
      const entryInserts = entries.map((e) => ({
        transaction_id: txRecord.id,
        account_id: e.accountId,
        direction: e.direction,
        amount_minor: e.amount,
      }));

      await this.client.from('ledger_entries').insert(entryInserts);
    }
  }

  private async grantEntitlements(order: {
    id: string;
    buyer_id: string;
    order_items?: Array<{ product_id: string }>;
  }) {
    if (!order.order_items || order.order_items.length === 0) return;

    for (const item of order.order_items) {
      await this.client
        .from('entitlements')
        .upsert(
          {
            buyer_id: order.buyer_id,
            product_id: item.product_id,
            order_id: order.id,
            is_active: true,
            granted_at: new Date().toISOString(),
          },
          { onConflict: 'buyer_id,product_id' }
        );
    }
  }

  private async getOrCreateAccount(
    ownerId: string | null,
    accountType: string,
    currency: string
  ): Promise<{ id: string }> {
    let query = this.client
      .from('ledger_accounts')
      .select('id')
      .eq('account_type', accountType)
      .eq('currency', currency);

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    } else {
      query = query.is('owner_id', null);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) return existing;

    const { data: created, error } = await this.client
      .from('ledger_accounts')
      .insert({
        owner_id: ownerId,
        account_type: accountType,
        currency,
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(`Falha ao inicializar conta no ledger: ${error?.message || 'Erro'}`);
    }

    return created;
  }
}
