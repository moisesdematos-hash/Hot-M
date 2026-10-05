import { describe, it, expect, vi } from 'vitest';
import { RefundService } from '@/modules/refunds/refund-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('RefundService Unit Tests (Phase 11 - Refunds Engine)', () => {
  const buyerId = 'buyer-uuid-123';
  const otherBuyerId = 'hacker-uuid-999';
  const orderId = 'order-uuid-456';
  const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago (within warranty)
  const expiredDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days ago (warranty expired)

  it('should reject refund request if order does not belong to buyer (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: orderId,
                buyer_id: buyerId, // Belongs to buyerId, NOT otherBuyerId
                status: 'PAID',
                total_amount_minor: 1000000n,
                currency: 'AOA',
                created_at: recentDate,
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new RefundService(mockSupabase);

    await expect(
      service.requestRefund(otherBuyerId, orderId, 'Produto com defeito')
    ).rejects.toThrow('FORBIDDEN');
  });

  it('should reject refund request when 7-day legal warranty period has expired', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: orderId,
                buyer_id: buyerId,
                status: 'PAID',
                total_amount_minor: 1000000n,
                currency: 'AOA',
                created_at: expiredDate, // 15 days old!
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new RefundService(mockSupabase);

    await expect(
      service.requestRefund(buyerId, orderId, 'Quero cancelar')
    ).rejects.toThrow('WARRANTY_EXPIRED');
  });

  it('should reject duplicate refund request if one is already pending', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: orderId,
                    buyer_id: buyerId,
                    status: 'PAID',
                    total_amount_minor: 1000000n,
                    currency: 'AOA',
                    created_at: recentDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'refund_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'req-existing', status: 'REQUESTED' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new RefundService(mockSupabase);

    await expect(
      service.requestRefund(buyerId, orderId, 'Segunda solicitação')
    ).rejects.toThrow('REFUND_ALREADY_REQUESTED');
  });

  it('should approve refund, reverse double-entry ledger, and revoke entitlements', async () => {
    const mockUpdateEntitlements = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockUpdateOrders = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockInsertRefund = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'ref-record-1' }, error: null }),
      }),
    });
    const mockInsertLedgerTx = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'tx-rev-1' }, error: null }),
      }),
    });
    const mockInsertLedgerEntries = vi.fn().mockResolvedValue({ error: null });
    const mockInsertOutbox = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'refund_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'req-1',
                    order_id: orderId,
                    buyer_id: buyerId,
                    status: 'REQUESTED',
                    reason: 'Insatisfação com o produto',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: orderId,
                    buyer_id: buyerId,
                    total_amount_minor: 1000000n, // 10,000.00 AOA
                    currency: 'AOA',
                    status: 'REFUND_REQUESTED',
                    affiliate_id: 'affiliate-uuid',
                    order_items: [{ product_id: 'prod-1', products: { creator_id: 'creator-uuid' } }],
                  },
                  error: null,
                }),
              }),
            }),
            update: mockUpdateOrders,
          };
        }
        if (table === 'refunds') {
          return { insert: mockInsertRefund };
        }
        if (table === 'ledger_accounts') {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn().mockReturnValue(chain);
          chain.eq = vi.fn().mockReturnValue(chain);
          chain.is = vi.fn().mockReturnValue(chain);
          chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'acc-found' }, error: null });
          return chain;
        }
        if (table === 'ledger_transactions') {
          return { insert: mockInsertLedgerTx };
        }
        if (table === 'ledger_entries') {
          return { insert: mockInsertLedgerEntries };
        }
        if (table === 'entitlements') {
          return { update: mockUpdateEntitlements };
        }
        if (table === 'outbox_events') {
          return { insert: mockInsertOutbox };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new RefundService(mockSupabase);
    const result = await service.approveRefund('req-1', 'admin-uuid');

    expect(result.status).toBe('COMPLETED');
    expect(result.orderId).toBe(orderId);

    // Verify order updated to REFUNDED
    expect(mockUpdateOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REFUNDED' })
    );

    // Verify entitlements revoked
    expect(mockUpdateEntitlements).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );

    // Verify ledger reversal transaction
    expect(mockInsertLedgerTx).toHaveBeenCalledWith(
      expect.objectContaining({ transaction_type: 'REFUND' })
    );

    // Verify ledger entries inserted (reversing debits & credits)
    expect(mockInsertLedgerEntries).toHaveBeenCalled();

    // Verify outbox event emitted
    expect(mockInsertOutbox).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'order.refunded' })
    );
  });

  it('should reject refund request and revert order to PAID', async () => {
    const mockUpdateOrders = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockUpdateReq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'refund_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'req-1', order_id: orderId, status: 'REQUESTED' },
                  error: null,
                }),
              }),
            }),
            update: mockUpdateReq,
          };
        }
        if (table === 'orders') {
          return { update: mockUpdateOrders };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new RefundService(mockSupabase);
    await service.rejectRefund('req-1', 'Produto já consumido integralmente', 'support-officer-uuid');

    expect(mockUpdateReq).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED' })
    );
    expect(mockUpdateOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PAID' })
    );
  });
});
