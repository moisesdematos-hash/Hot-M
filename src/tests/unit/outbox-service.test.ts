import { describe, it, expect, vi } from 'vitest';
import { OutboxService } from '@/modules/notifications/outbox-service';
import type { NotificationService } from '@/modules/notifications/notification-service';
import type { EmailService } from '@/modules/notifications/email-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('OutboxService Unit Tests (Phase 18 - Transactional Outbox Worker)', () => {
  const buyerId = 'buyer-uuid-1';
  const creatorId = 'creator-uuid-2';
  const affiliateId = 'affiliate-uuid-3';
  const eventId = 'outbox-ev-1';

  it('enqueues an event into outbox with PENDING status', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'outbox_events') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: eventId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const outboxService = new OutboxService(mockSupabase);
    const id = await outboxService.enqueueEvent('order.paid', {
      orderId: 'ord-123',
      buyerId,
    });

    expect(id).toBe(eventId);
  });

  it('processes order.paid event: dispatches notifications and email, then marks SENT', async () => {
    const mockEvents = [
      {
        id: eventId,
        event_type: 'order.paid',
        payload: {
          orderId: 'ord-123',
          buyerId,
          creatorId,
          affiliateUserId: affiliateId,
          productTitle: 'Curso de Next.js Pro',
          totalAmount: '20000.00',
          currency: 'AOA',
          buyerEmail: 'comprador@exemplo.com',
          buyerName: 'Carlos M.',
        },
        status: 'PENDING',
        retry_count: 0,
        error_message: null,
        created_at: new Date().toISOString(),
      },
    ];

    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'outbox_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockEvents,
                    error: null,
                  }),
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const mockNotificationService = {
      createNotification: vi.fn().mockResolvedValue({}),
    } as unknown as NotificationService;

    const mockEmailService = {
      createOrderPaidEmail: vi.fn().mockReturnValue({ subject: 'Subj', html: 'Html' }),
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as EmailService;

    const outboxService = new OutboxService(
      mockSupabase,
      mockNotificationService,
      mockEmailService
    );

    const result = await outboxService.processPendingEvents(10);

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    // 1. Notified buyer, creator, and affiliate
    expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(3);
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      buyerId,
      expect.objectContaining({ type: 'SUCCESS' })
    );
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      creatorId,
      expect.objectContaining({ type: 'SALE' })
    );
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      affiliateId,
      expect.objectContaining({ type: 'SALE' })
    );

    // 2. Sent email to buyer
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'comprador@exemplo.com' })
    );

    // 3. Updated event status to SENT
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SENT',
      })
    );
  });

  it('handles event processing failure: increments retry_count and marks FAILED on 3rd attempt', async () => {
    const failingEvent = {
      id: 'failing-ev-1',
      event_type: 'order.paid',
      payload: { buyerId: 'invalid' },
      status: 'PENDING',
      retry_count: 2, // 2 previous attempts
      error_message: 'Previous timeout',
      created_at: new Date().toISOString(),
    };

    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'outbox_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [failingEvent],
                    error: null,
                  }),
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const mockNotificationService = {
      createNotification: vi.fn().mockRejectedValue(new Error('Simulated DB error')),
    } as unknown as NotificationService;

    const outboxService = new OutboxService(
      mockSupabase,
      mockNotificationService,
      undefined
    );

    const result = await outboxService.processPendingEvents(10);

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);

    // Because retry_count was 2, 2 + 1 = 3 -> status must be FAILED
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        retry_count: 3,
        error_message: 'Simulated DB error',
      })
    );
  });
});
