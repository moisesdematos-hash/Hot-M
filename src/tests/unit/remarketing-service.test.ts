import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { RemarketingService } from '@/modules/marketing/remarketing-service';
import { OutboxService } from '@/modules/notifications/outbox-service';

describe('RemarketingService Unit Tests (Phase 22 - Multicaixa Pending Recovery)', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockOutboxService = {
    enqueueEvent: vi.fn(),
  };

  let service: RemarketingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RemarketingService(
      mockSupabase as unknown as SupabaseClient,
      mockOutboxService as unknown as OutboxService
    );
  });

  it('returns 0 when no eligible pending attempts exist', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await service.processPendingReferenceReminders();
    expect(result.remindedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(mockOutboxService.enqueueEvent).not.toHaveBeenCalled();
  });

  it('enqueues reminder for eligible pending order and skips already reminded', async () => {
    const mockAttempts = [
      {
        id: 'att-1',
        order_id: 'ord-1',
        instructions: {
          entity: '00123',
          reference: '123456789',
          amount: '25.000 Kz',
        },
        amount_minor: 2500000n,
        currency: 'AOA',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date(Date.now() - 7200000).toISOString(),
        orders: {
          id: 'ord-1',
          status: 'PENDING_PAYMENT',
          buyer_id: 'usr-1',
          order_items: [{ products: { title: 'Mestrado em Tráfego' } }],
        },
      },
    ];

    const mockAttemptsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockAttempts,
        error: null,
      }),
    };

    const mockExistingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { full_name: 'António João', email: 'antonio@exemplo.ao' },
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'payment_attempts') return mockAttemptsQuery;
      if (table === 'outbox_events') return mockExistingQuery;
      if (table === 'user_profiles') return mockProfileQuery;
      return {};
    });

    const result = await service.processPendingReferenceReminders();

    expect(result.remindedCount).toBe(1);
    expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
      'order.multicaixa_reminder',
      expect.objectContaining({
        orderId: 'ord-1',
        buyerEmail: 'antonio@exemplo.ao',
        reference: '123456789',
        entity: '00123',
      })
    );
  });
});
