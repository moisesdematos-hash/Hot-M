import { SupabaseClient } from '@supabase/supabase-js';

export interface ReconciliationAnomaly {
  code: 'PAID_GATEWAY_PENDING_ORDER' | 'PAID_ORDER_MISSING_LEDGER' | 'PAID_ORDER_MISSING_ENTITLEMENT' | 'LEDGER_IMBALANCE';
  severity: 'SEV-1' | 'SEV-2';
  entityId: string;
  description: string;
  detectedAt: string;
}

export interface ReconciliationReport {
  timestamp: string;
  totalChecks: number;
  anomaliesCount: number;
  anomalies: ReconciliationAnomaly[];
  status: 'HEALTHY' | 'ANOMALIES_DETECTED';
}

export class ReconciliationService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Executes Section 57 automatic reconciliation routines detecting financial & access discrepancies.
   */
  async runReconciliation(): Promise<ReconciliationReport> {
    const anomalies: ReconciliationAnomaly[] = [];
    const now = new Date().toISOString();

    // 1. Detectar: payment provider paid MAS order pending
    const { data: paidAttempts } = await this.client
      .from('payment_attempts')
      .select('id, order_id, provider_reference, orders(id, status)')
      .eq('status', 'PAID');

    if (paidAttempts) {
      for (const att of paidAttempts) {
        const order = att.orders as unknown as { id: string; status: string } | null;
        if (order && order.status === 'PENDING_PAYMENT') {
          anomalies.push({
            code: 'PAID_GATEWAY_PENDING_ORDER',
            severity: 'SEV-1',
            entityId: order.id,
            description: `Gateway marcou tentativa ${att.id} como PAID, mas o pedido ${order.id} ainda permanece PENDING_PAYMENT`,
            detectedAt: now,
          });
        }
      }
    }

    // 2. Detectar: order paid MAS ledger inexistente
    const { data: paidOrders } = await this.client
      .from('orders')
      .select('id, status, order_items(product_id)')
      .eq('status', 'PAID');

    if (paidOrders) {
      for (const order of paidOrders) {
        const { data: tx } = await this.client
          .from('ledger_transactions')
          .select('id')
          .eq('reference_id', order.id)
          .maybeSingle();

        if (!tx) {
          anomalies.push({
            code: 'PAID_ORDER_MISSING_LEDGER',
            severity: 'SEV-1',
            entityId: order.id,
            description: `Pedido ${order.id} está PAID, mas nenhuma transação foi lançada no livro-razão (ledger)`,
            detectedAt: now,
          });
        }

        // 3. Detectar: order paid MAS entitlement inexistente
        if (order.order_items && order.order_items.length > 0) {
          for (const item of order.order_items) {
            const { data: ent } = await this.client
              .from('entitlements')
              .select('id, is_active')
              .eq('order_id', order.id)
              .eq('product_id', item.product_id)
              .maybeSingle();

            if (!ent || !ent.is_active) {
              anomalies.push({
                code: 'PAID_ORDER_MISSING_ENTITLEMENT',
                severity: 'SEV-1',
                entityId: order.id,
                description: `Pedido ${order.id} está PAID, mas o direito de acesso (entitlement) para o produto ${item.product_id} não existe ou está inativo`,
                detectedAt: now,
              });
            }
          }
        }
      }
    }

    // 4. Detectar: ledger imbalanced (débitos != créditos)
    const { data: transactions } = await this.client
      .from('ledger_transactions')
      .select('id, reference_id, ledger_entries(direction, amount_minor)');

    if (transactions) {
      for (const t of transactions) {
        const entries = (t.ledger_entries || []) as unknown as Array<{ direction: string; amount_minor: string }>;
        let debits = 0n;
        let credits = 0n;

        for (const e of entries) {
          if (e.direction === 'DEBIT') debits += BigInt(e.amount_minor);
          if (e.direction === 'CREDIT') credits += BigInt(e.amount_minor);
        }

        if (debits !== credits) {
          anomalies.push({
            code: 'LEDGER_IMBALANCE',
            severity: 'SEV-1',
            entityId: t.id,
            description: `Transação ${t.id} (ref: ${t.reference_id}) desbalanceada: Débitos (${debits}) != Créditos (${credits})`,
            detectedAt: now,
          });
        }
      }
    }

    return {
      timestamp: now,
      totalChecks: (paidAttempts?.length || 0) + (paidOrders?.length || 0) + (transactions?.length || 0),
      anomaliesCount: anomalies.length,
      anomalies,
      status: anomalies.length === 0 ? 'HEALTHY' : 'ANOMALIES_DETECTED',
    };
  }
}
