import { SupabaseClient } from '@supabase/supabase-js';
import { ProxyPayAdapter } from './providers/proxypay';
import { Money } from '@/core/fintech/money';
import { AuditLogger } from '@/core/security/audit';
import { getServerEnv } from '@/core/config/env';

export interface PaymentAttemptRecord {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string;
  payment_method: string;
  amount_minor: bigint;
  currency: string;
  status: string;
  instructions: {
    entity?: string;
    reference?: string;
    amount?: string;
    expiresAt?: string;
  };
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export class PaymentService {
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
        // Fallback for isolated test runs
      }

      this.proxypayAdapter = new ProxyPayAdapter(config);
    }
  }

  /**
   * Implements Section 29 (Phase 6):
   * 1. Finds existing Order in PENDING_PAYMENT state (INV-002).
   * 2. Reuses active attempt if not expired (idempotency).
   * 3. Fetches customer profile.
   * 4. Calls ProxyPayAdapter to generate 9-digit Multicaixa reference.
   * 5. Persists payment attempt in payment_attempts.
   * 6. Emits audit log.
   * 7. Returns instructions to customer.
   */
  async initiatePayment(params: {
    orderId: string;
    actorId: string;
    requestId: string;
  }): Promise<PaymentAttemptRecord> {
    const { orderId, actorId, requestId } = params;

    // 1. Fetch Order and enforce state (INV-002)
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error('Pedido não encontrado');
    }

    if (order.buyer_id !== actorId) {
      throw new Error('ACCESS_DENIED: Não tem permissão para pagar este pedido');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error(`STATUS_INVALIDO: O pedido encontra-se no estado ${order.status} e não aceita pagamento`);
    }

    // 2. Check if an active attempt already exists
    const now = new Date();
    const { data: existingAttempts } = await this.client
      .from('payment_attempts')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (existingAttempts && existingAttempts.length > 0) {
      const latest = existingAttempts[0];
      if (latest && new Date(latest.expires_at) > now) {
        return {
          ...latest,
          amount_minor: BigInt(latest.amount_minor),
        } as PaymentAttemptRecord;
      }
    }

    // 3. Fetch Buyer Profile
    const { data: profile } = await this.client
      .from('user_profiles')
      .select('email, full_name, phone_number')
      .eq('id', actorId)
      .maybeSingle();

    const customerEmail = profile?.email || 'cliente@hot-m.ao';
    const customerName = profile?.full_name || 'Comprador HOT-M';

    // 4. Invoke ProxyPay Gateway
    const moneyAmount = Money.fromMinor(BigInt(order.total_amount_minor), order.currency);
    const creationResult = await this.proxypayAdapter.createPayment({
      orderId: order.id,
      amount: moneyAmount,
      customer: {
        id: actorId,
        email: customerEmail,
        name: customerName,
        phone: profile?.phone_number || undefined,
      },
    });

    // 5. Persist Payment Attempt
    const { data: attemptRecord, error: attemptError } = await this.client
      .from('payment_attempts')
      .insert({
        order_id: order.id,
        provider: 'PROXYPAY',
        provider_reference: creationResult.providerReference,
        payment_method: creationResult.paymentMethod,
        amount_minor: order.total_amount_minor,
        currency: order.currency,
        status: 'PENDING',
        instructions: creationResult.instructions,
        expires_at: creationResult.instructions.expiresAt,
      })
      .select()
      .single();

    if (attemptError || !attemptRecord) {
      throw new Error(`Falha ao registrar tentativa de pagamento: ${attemptError?.message || 'Erro'}`);
    }

    // 6. Record Audit Log
    try {
      const auditPayload = AuditLogger.createEntry({
        actorId,
        actorRole: 'BUYER',
        action: 'payment:attempt_created',
        entity: 'payment_attempts',
        entityId: attemptRecord.id,
        beforeState: null,
        afterState: {
          orderId: order.id,
          reference: creationResult.providerReference,
          amount: moneyAmount.toMajorString(),
          currency: order.currency,
        },
        requestId,
      });

      await this.client.from('audit_logs').insert({
        actor_id: auditPayload.actorId,
        actor_role: auditPayload.actorRole,
        action: auditPayload.action,
        entity: auditPayload.entity,
        entity_id: auditPayload.entityId,
        before_state: auditPayload.beforeState,
        after_state: auditPayload.afterState,
        request_id: auditPayload.requestId,
      });
    } catch {
      // Non-blocking
    }

    return {
      ...attemptRecord,
      amount_minor: BigInt(attemptRecord.amount_minor),
    } as PaymentAttemptRecord;
  }

  async getPaymentAttemptByOrderId(params: {
    orderId: string;
    actorId: string;
  }): Promise<PaymentAttemptRecord | null> {
    const { orderId, actorId } = params;

    const { data: order } = await this.client
      .from('orders')
      .select('buyer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order || order.buyer_id !== actorId) {
      throw new Error('ACCESS_DENIED: Não tem permissão para visualizar este pagamento');
    }

    const { data: attempt } = await this.client
      .from('payment_attempts')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!attempt) return null;

    return {
      ...attempt,
      amount_minor: BigInt(attempt.amount_minor),
    } as PaymentAttemptRecord;
  }
}
