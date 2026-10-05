import { SupabaseClient } from '@supabase/supabase-js';
import { CurrencyCode, Money } from '@/core/fintech/money';
import { OrderStateMachine, OrderStatus } from '@/core/fintech/state-machines';

export interface RefundRequestRecord {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    totalAmountMinor: string;
    currency: CurrencyCode;
    status: OrderStatus;
    createdAt: string;
  };
}

export interface ApproveRefundResult {
  refundId: string;
  orderId: string;
  status: 'COMPLETED';
  reversedAmountMinor: bigint;
  currency: CurrencyCode;
}

export class RefundService {
  private client: SupabaseClient;
  static readonly WARRANTY_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days legal guarantee

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Buyer requests a refund for a paid order within the 7-day warranty window.
   */
  async requestRefund(
    buyerId: string,
    orderId: string,
    reason: string
  ): Promise<RefundRequestRecord> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('INVALID_REASON: Motivo do reembolso deve ter no mínimo 5 caracteres');
    }

    // 1. Fetch Order and check ownership and status
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('id, buyer_id, status, total_amount_minor, currency, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error('ORDER_NOT_FOUND: Pedido não encontrado');
    }

    if (order.buyer_id !== buyerId) {
      throw new Error('FORBIDDEN: Este pedido não pertence ao usuário solicitante');
    }

    if (order.status === 'REFUNDED') {
      throw new Error('ORDER_ALREADY_REFUNDED: Este pedido já foi reembolsado anteriormente');
    }

    if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
      throw new Error(`INVALID_ORDER_STATUS: Não é possível solicitar reembolso para pedido com status ${order.status}`);
    }

    // 2. Check 7-day warranty period
    const orderAgeMs = Date.now() - new Date(order.created_at).getTime();
    if (orderAgeMs > RefundService.WARRANTY_PERIOD_MS) {
      throw new Error('WARRANTY_EXPIRED: O período de garantia legal de 7 dias para este pedido expirou');
    }

    // 3. Check for existing pending request
    const { data: existingReq } = await this.client
      .from('refund_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('status', 'REQUESTED')
      .maybeSingle();

    if (existingReq) {
      throw new Error('REFUND_ALREADY_REQUESTED: Já existe uma solicitação de reembolso em análise para este pedido');
    }

    // 4. Update order state to REFUND_REQUESTED
    const nextStatus = OrderStateMachine.transition(order.status as OrderStatus, 'REFUND_REQUESTED');
    await this.client
      .from('orders')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    // 5. Insert refund request
    const { data: refundReq, error: reqError } = await this.client
      .from('refund_requests')
      .insert({
        order_id: orderId,
        buyer_id: buyerId,
        reason: reason.trim(),
        status: 'REQUESTED',
      })
      .select('*')
      .single();

    if (reqError || !refundReq) {
      throw new Error(`Falha ao registrar solicitação de reembolso: ${reqError?.message || 'Erro'}`);
    }

    // 6. Audit log
    await this.client.from('audit_logs').insert({
      actor_id: buyerId,
      actor_role: 'BUYER',
      action: 'REFUND_REQUESTED',
      entity: 'orders',
      entity_id: orderId,
      request_id: `ref_req_${Date.now()}`,
      reason: reason.trim(),
    });

    return {
      id: refundReq.id,
      orderId: refundReq.order_id,
      buyerId: refundReq.buyer_id,
      reason: refundReq.reason,
      status: refundReq.status,
      reviewedBy: null,
      createdAt: refundReq.created_at,
      updatedAt: refundReq.updated_at,
    };
  }

  /**
   * Approves a refund request:
   * 1. Creates refund record
   * 2. Moves order to REFUNDED
   * 3. Reverses ledger distribution proportionally (INV-005, INV-006)
   * 4. Revokes entitlements immediately (INV-007)
   * 5. Emits outbox event and audit log
   */
  async approveRefund(
    refundRequestId: string,
    reviewerId: string
  ): Promise<ApproveRefundResult> {
    const { data: req, error: reqError } = await this.client
      .from('refund_requests')
      .select('id, order_id, buyer_id, status, reason')
      .eq('id', refundRequestId)
      .maybeSingle();

    if (reqError || !req) {
      throw new Error('REFUND_REQUEST_NOT_FOUND: Solicitação de reembolso não encontrada');
    }

    if (req.status !== 'REQUESTED') {
      throw new Error(`INVALID_STATUS: Solicitação já se encontra como ${req.status}`);
    }

    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('id, buyer_id, total_amount_minor, currency, status, affiliate_id, order_items(product_id, products(creator_id))')
      .eq('id', req.order_id)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error('ORDER_NOT_FOUND: Pedido associado não encontrado');
    }

    const totalMinor = BigInt(order.total_amount_minor);
    const currency = order.currency as CurrencyCode;

    // 1. Insert official refund record
    const { data: refundRecord, error: refundError } = await this.client
      .from('refunds')
      .insert({
        refund_request_id: req.id,
        order_id: order.id,
        amount_minor: totalMinor.toString(),
        currency,
        status: 'COMPLETED',
      })
      .select('id')
      .single();

    if (refundError || !refundRecord) {
      throw new Error(`Falha ao registrar reembolso: ${refundError?.message || 'Erro'}`);
    }

    // 2. Update refund request status
    await this.client
      .from('refund_requests')
      .update({
        status: 'APPROVED',
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    // 3. Move order to REFUNDED
    let currentStatus = order.status as OrderStatus;
    if (currentStatus === 'REFUND_REQUESTED') {
      currentStatus = OrderStateMachine.transition(currentStatus, 'REFUND_PROCESSING');
    }
    const finalOrderStatus = OrderStateMachine.transition(currentStatus, 'REFUNDED');

    await this.client
      .from('orders')
      .update({
        status: finalOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // 4. Reverse double-entry ledger distribution (INV-005, INV-006)
    await this.recordLedgerReversal(order);

    // 5. Revoke buyer entitlements immediately (INV-007)
    await this.client
      .from('entitlements')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: `Reembolso aprovado (Solicitação #${req.id})`,
      })
      .eq('order_id', order.id);

    // 6. Outbox event
    await this.client.from('outbox_events').insert({
      event_type: 'order.refunded',
      payload: {
        orderId: order.id,
        buyerId: order.buyer_id,
        refundId: refundRecord.id,
        amountMinor: totalMinor.toString(),
        currency,
      },
    });

    // 7. Audit log
    await this.client.from('audit_logs').insert({
      actor_id: reviewerId,
      actor_role: 'FINANCE',
      action: 'REFUND_APPROVED',
      entity: 'orders',
      entity_id: order.id,
      request_id: `ref_appr_${Date.now()}`,
      reason: req.reason,
    });

    return {
      refundId: refundRecord.id,
      orderId: order.id,
      status: 'COMPLETED',
      reversedAmountMinor: totalMinor,
      currency,
    };
  }

  /**
   * Rejects a refund request with justification and returns order to PAID.
   */
  async rejectRefund(
    refundRequestId: string,
    reason: string,
    reviewerId: string
  ): Promise<void> {
    const { data: req, error: reqError } = await this.client
      .from('refund_requests')
      .select('id, order_id, status')
      .eq('id', refundRequestId)
      .maybeSingle();

    if (reqError || !req) {
      throw new Error('REFUND_REQUEST_NOT_FOUND: Solicitação de reembolso não encontrada');
    }

    if (req.status !== 'REQUESTED') {
      throw new Error(`INVALID_STATUS: Solicitação já se encontra como ${req.status}`);
    }

    // 1. Update refund request
    await this.client
      .from('refund_requests')
      .update({
        status: 'REJECTED',
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    // 2. Revert order status to PAID
    await this.client
      .from('orders')
      .update({
        status: 'PAID',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.order_id);

    // 3. Audit log
    await this.client.from('audit_logs').insert({
      actor_id: reviewerId,
      actor_role: 'FINANCE',
      action: 'REFUND_REJECTED',
      entity: 'orders',
      entity_id: req.order_id,
      request_id: `ref_rej_${Date.now()}`,
      reason,
    });
  }

  /**
   * Lists refund requests for finance and support moderation.
   */
  async getRefundRequests(status?: string): Promise<RefundRequestRecord[]> {
    let query = this.client
      .from('refund_requests')
      .select('id, order_id, buyer_id, reason, status, reviewed_by, created_at, updated_at, orders(total_amount_minor, currency, status, created_at)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((item) => {
      const ord = item.orders as unknown as {
        total_amount_minor: string;
        currency: CurrencyCode;
        status: OrderStatus;
        created_at: string;
      } | null;

      return {
        id: item.id,
        orderId: item.order_id,
        buyerId: item.buyer_id,
        reason: item.reason,
        status: item.status,
        reviewedBy: item.reviewed_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        order: ord
          ? {
              totalAmountMinor: ord.total_amount_minor,
              currency: ord.currency,
              status: ord.status,
              createdAt: ord.created_at,
            }
          : undefined,
      };
    });
  }

  /**
   * Executes exact proportional reversal on the double-entry ledger (INV-005, INV-006).
   * Debits Seller, Affiliate, and Platform fee accounts.
   * Credits Clearing payment account.
   */
  private async recordLedgerReversal(order: {
    id: string;
    total_amount_minor: bigint | string;
    currency: string;
    affiliate_id?: string | null;
    order_items?: Array<{
      product_id: string;
      products?: unknown;
    }>;
  }) {
    const currency = order.currency as CurrencyCode;
    const totalMoney = Money.fromMinor(BigInt(order.total_amount_minor), currency);

    // Platform Fee: 10%
    const platformFeeMoney = totalMoney.multiply(0.1);

    // Affiliate Commission: 20% if affiliate exists
    const affiliateMoney = order.affiliate_id ? totalMoney.multiply(0.2) : Money.zero(currency);

    // Creator Share: Total - Platform Fee - Affiliate Commission
    const creatorMoney = totalMoney.subtract(platformFeeMoney).subtract(affiliateMoney);

    // Accounts
    const clearingAccount = await this.getOrCreateAccount(null, 'CLEARING_PAYMENT', currency);
    const platformAccount = await this.getOrCreateAccount(null, 'PLATFORM_REVENUE', currency);

    let creatorId: string | null = null;
    if (order.order_items && order.order_items.length > 0) {
      const prod = order.order_items[0]?.products;
      if (Array.isArray(prod)) {
        creatorId = (prod[0] as { creator_id?: string })?.creator_id || null;
      } else if (prod && typeof prod === 'object' && 'creator_id' in prod) {
        creatorId = (prod as { creator_id: string }).creator_id || null;
      }
    }
    const creatorAccount = await this.getOrCreateAccount(creatorId, 'SELLER_RECEIVABLE', currency);

    // Header in ledger_transactions
    const { data: txRecord, error: txError } = await this.client
      .from('ledger_transactions')
      .insert({
        reference_id: order.id,
        transaction_type: 'REFUND',
        description: `Estorno contábil do pedido #${order.id}`,
        currency,
      })
      .select('id')
      .single();

    if (txError || !txRecord) {
      throw new Error(`Falha ao criar transação de estorno: ${txError?.message || 'Erro'}`);
    }

    const entries: Array<{
      transaction_id: string;
      account_id: string;
      direction: 'DEBIT' | 'CREDIT';
      amount_minor: string;
    }> = [];

    // Reverse Creator Credit -> DEBIT
    if (creatorMoney.amount > 0n) {
      entries.push({
        transaction_id: txRecord.id,
        account_id: creatorAccount.id,
        direction: 'DEBIT',
        amount_minor: creatorMoney.amount.toString(),
      });
    }

    // Reverse Affiliate Credit -> DEBIT
    if (affiliateMoney.amount > 0n && order.affiliate_id) {
      const affiliateAccount = await this.getOrCreateAccount(order.affiliate_id, 'SELLER_RECEIVABLE', currency);
      entries.push({
        transaction_id: txRecord.id,
        account_id: affiliateAccount.id,
        direction: 'DEBIT',
        amount_minor: affiliateMoney.amount.toString(),
      });
    }

    // Reverse Platform Fee Credit -> DEBIT
    if (platformFeeMoney.amount > 0n) {
      entries.push({
        transaction_id: txRecord.id,
        account_id: platformAccount.id,
        direction: 'DEBIT',
        amount_minor: platformFeeMoney.amount.toString(),
      });
    }

    // Reverse Clearing Debit -> CREDIT
    entries.push({
      transaction_id: txRecord.id,
      account_id: clearingAccount.id,
      direction: 'CREDIT',
      amount_minor: totalMoney.amount.toString(),
    });

    await this.client.from('ledger_entries').insert(entries);
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
