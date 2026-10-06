import { describe, it, expect, vi } from 'vitest';
import { OutboxService, OutboxEventRow } from '@/modules/notifications/outbox-service';
import { NotificationService } from '@/modules/notifications/notification-service';
import { EmailService } from '@/modules/notifications/email-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Notification & Outbox Worker Lifecycle (Phase 18 - Transactional Notifications)', () => {
  const buyerId = 'buyer-e2e-notif-uuid';
  const intruderId = 'intruder-notif-uuid';
  const creatorId = 'creator-e2e-notif-uuid';

  // In-memory data structures
  const outboxStore: OutboxEventRow[] = [];
  const notificationsStore: Array<{
    id: string;
    user_id: string;
    title: string;
    message: string;
    link: string | null;
    type: string;
    is_read: boolean;
    created_at: string;
  }> = [];

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'outbox_events') {
        return {
          insert: vi.fn().mockImplementation((rec: {
            event_type: string;
            payload: Record<string, unknown>;
            destination_url?: string;
            status: string;
            retry_count: number;
          }) => {
            const newRow: OutboxEventRow = {
              id: `evt-${outboxStore.length + 1}`,
              event_type: rec.event_type,
              payload: rec.payload,
              destination_url: rec.destination_url || null,
              status: 'PENDING',
              retry_count: 0,
              error_message: null,
              created_at: new Date().toISOString(),
              processed_at: null,
            };
            outboxStore.push(newRow);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: newRow.id },
                  error: null,
                }),
              }),
            };
          }),

          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((_col: string, statusVal: string) => ({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation((limit: number) => {
                  const filtered = outboxStore
                    .filter((e) => e.status === statusVal)
                    .slice(0, limit);
                  return Promise.resolve({
                    data: filtered,
                    error: null,
                  });
                }),
              }),
            })),
          })),

          update: vi.fn().mockImplementation((updates: Partial<OutboxEventRow>) => ({
            eq: vi.fn().mockImplementation((_col: string, idVal: string) => {
              const item = outboxStore.find((e) => e.id === idVal);
              if (item) {
                Object.assign(item, updates);
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === 'notifications') {
        return {
          insert: vi.fn().mockImplementation((rec: {
            user_id: string;
            title: string;
            message: string;
            link?: string;
            type: string;
            is_read: boolean;
          }) => {
            const newNotif = {
              id: `notif-${notificationsStore.length + 1}`,
              user_id: rec.user_id,
              title: rec.title,
              message: rec.message,
              link: rec.link || null,
              type: rec.type,
              is_read: false,
              created_at: new Date().toISOString(),
            };
            notificationsStore.push(newNotif);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newNotif,
                  error: null,
                }),
              }),
            };
          }),

          select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === 'exact' && opts?.head) {
              return {
                eq: vi.fn().mockImplementation((_col1: string, uId: string) => ({
                  eq: vi.fn().mockImplementation((_col2: string, readVal: boolean) => {
                    const count = notificationsStore.filter(
                      (n) => n.user_id === uId && n.is_read === readVal
                    ).length;
                    return Promise.resolve({ count, error: null });
                  }),
                })),
              };
            }

            return {
              eq: vi.fn().mockImplementation((_col: string, uId: string) => ({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockImplementation((limit: number) => {
                    const filtered = notificationsStore
                      .filter((n) => n.user_id === uId)
                      .slice(0, limit);
                    return Promise.resolve({ data: filtered, error: null });
                  }),
                }),
              })),
            };
          }),

          update: vi.fn().mockImplementation((updates: { is_read: boolean }) => ({
            eq: vi.fn().mockImplementation((col1: string, val1: string) => ({
              eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                let updatedItem: unknown = null;
                for (const n of notificationsStore) {
                  if (col1 === 'id' && n.id === val1 && col2 === 'user_id' && n.user_id === val2) {
                    n.is_read = updates.is_read;
                    updatedItem = { id: n.id };
                  }
                }
                return {
                  select: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: updatedItem,
                      error: null,
                    }),
                  }),
                };
              }),
            })),
          })),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  it('executes full transactional notification flow: domain event enqueued -> worker processes batch -> in-app & email dispatched -> user reads notification -> unauthorized mutation blocked', async () => {
    const notificationService = new NotificationService(mockSupabase);
    const emailService = new EmailService(undefined); // simulation mode
    const outboxService = new OutboxService(mockSupabase, notificationService, emailService);

    // 1. Transactional event order.paid is committed to outbox
    const eventId = await outboxService.enqueueEvent('order.paid', {
      orderId: 'order-e2e-1234',
      buyerId,
      creatorId,
      productTitle: 'Dominando o Mercado Digital em Angola',
      totalAmount: '12500.00',
      currency: 'AOA',
      buyerEmail: 'comprador.ao@exemplo.com',
      buyerName: 'Manuel V.',
    });

    expect(eventId).toBe('evt-1');
    expect(outboxStore[0]?.status).toBe('PENDING');

    // 2. Outbox Worker executes batch job
    const workerResult = await outboxService.processPendingEvents(10);
    expect(workerResult.processed).toBe(1);
    expect(workerResult.succeeded).toBe(1);
    expect(workerResult.failed).toBe(0);

    // 3. Outbox event is marked SENT
    expect(outboxStore[0]?.status).toBe('SENT');
    expect(outboxStore[0]?.processed_at).toBeDefined();

    // 4. In-App notifications were generated for buyer and creator
    expect(notificationsStore).toHaveLength(2);

    const buyerNotif = notificationsStore.find((n) => n.user_id === buyerId);
    expect(buyerNotif).toBeDefined();
    expect(buyerNotif?.title).toBe('🎉 Pagamento Confirmado!');
    expect(buyerNotif?.is_read).toBe(false);

    const creatorNotif = notificationsStore.find((n) => n.user_id === creatorId);
    expect(creatorNotif).toBeDefined();
    expect(creatorNotif?.title).toBe('💰 Nova Venda Realizada!');

    // 5. Buyer queries notifications: sees 1 unread notification
    const buyerInbox = await notificationService.getUserNotifications(buyerId);
    expect(buyerInbox.unreadCount).toBe(1);
    expect(buyerInbox.notifications).toHaveLength(1);

    // 6. Intruder attempts to mark buyer's notification as read -> BLOCKED
    const tamperResult = await notificationService.markAsRead(buyerNotif!.id, intruderId);
    expect(tamperResult).toBe(false);

    // 7. Legitimate buyer marks as read
    const legitimateResult = await notificationService.markAsRead(buyerNotif!.id, buyerId);
    expect(legitimateResult).toBe(true);

    // 8. Inbox now reflects 0 unread notifications
    const updatedInbox = await notificationService.getUserNotifications(buyerId);
    expect(updatedInbox.unreadCount).toBe(0);
  });
});
