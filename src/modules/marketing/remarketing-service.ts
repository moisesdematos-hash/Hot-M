import { SupabaseClient } from '@supabase/supabase-js';
import { OutboxService } from '@/modules/notifications/outbox-service';

export interface RemarketingResult {
  remindedCount: number;
  skippedCount: number;
}

export class RemarketingService {
  private client: SupabaseClient;
  private outboxService: OutboxService;

  constructor(client: SupabaseClient, outboxService?: OutboxService) {
    this.client = client;
    this.outboxService = outboxService || new OutboxService(client);
  }

  /**
   * Scans for pending Multicaixa payment attempts that:
   * 1. Are currently PENDING.
   * 2. Have not yet expired.
   * 3. Were created at least 2 hours ago.
   * 4. Have not already received a reminder email.
   *
   * Enqueues an `order.multicaixa_reminder` event into the transactional outbox.
   */
  async processPendingReferenceReminders(limit = 25): Promise<RemarketingResult> {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    // 1. Fetch eligible pending attempts
    const { data: attempts, error } = await this.client
      .from('payment_attempts')
      .select(`
        id,
        order_id,
        instructions,
        amount_minor,
        currency,
        expires_at,
        created_at,
        orders (
          id,
          status,
          buyer_id,
          order_items (
            product_id,
            products (
              title
            )
          )
        )
      `)
      .eq('status', 'PENDING')
      .gt('expires_at', nowIso)
      .lte('created_at', twoHoursAgo)
      .limit(limit);

    if (error || !attempts || attempts.length === 0) {
      return { remindedCount: 0, skippedCount: 0 };
    }

    let remindedCount = 0;
    let skippedCount = 0;

    for (const attempt of attempts) {
      const order = attempt.orders as unknown as {
        id: string;
        status: string;
        buyer_id: string;
        order_items?: Array<{ products?: { title: string } }>;
      } | null;

      // Ignore if order is already paid or cancelled
      if (!order || order.status !== 'PENDING_PAYMENT') {
        skippedCount++;
        continue;
      }

      // Check if reminder was already enqueued
      const { data: existingReminder } = await this.client
        .from('outbox_events')
        .select('id')
        .eq('event_type', 'order.multicaixa_reminder')
        .filter('payload->>orderId', 'eq', order.id)
        .maybeSingle();

      if (existingReminder) {
        skippedCount++;
        continue;
      }

      // Fetch buyer profile for name & email
      const { data: buyerProfile } = await this.client
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', order.buyer_id)
        .maybeSingle();

      const instructions = attempt.instructions as {
        entity?: string;
        reference?: string;
        amount?: string;
        expiresAt?: string;
      } | null;

      const entity = instructions?.entity || '99999';
      const reference = instructions?.reference || '';
      const productTitle = order.order_items?.[0]?.products?.title || 'Curso / Infoproduto HOT-M';
      const major = (Number(attempt.amount_minor) / 100).toLocaleString('pt-AO');
      const formattedExpires = instructions?.expiresAt || new Date(attempt.expires_at).toLocaleString('pt-AO');

      if (buyerProfile?.email && reference) {
        await this.outboxService.enqueueEvent('order.multicaixa_reminder', {
          orderId: order.id,
          paymentAttemptId: attempt.id,
          buyerEmail: buyerProfile.email,
          buyerName: buyerProfile.full_name || 'Cliente',
          productTitle,
          entity,
          reference,
          amount: major,
          currency: attempt.currency || 'AOA',
          expiresAt: formattedExpires,
        });

        remindedCount++;
      } else {
        skippedCount++;
      }
    }

    return { remindedCount, skippedCount };
  }
}
