import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from '@/modules/analytics/analytics-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('AnalyticsService Unit Tests (Phase 20 - Creator & Platform Analytics)', () => {
  const creatorId = 'creator-analytics-uuid-1';
  const buyerId = 'buyer-analytics-uuid-2';
  const adminId = 'admin-analytics-uuid-3';
  const prodId1 = 'prod-1-uuid';
  const prodId2 = 'prod-2-uuid';

  it('returns clean zeroed metrics when creator has no products', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AnalyticsService(mockSupabase);
    const result = await service.getCreatorAnalytics(creatorId, 'AOA', 30);

    expect(result.grossRevenueMinor).toBe('0');
    expect(result.completedOrders).toBe(0);
    expect(result.productPerformance).toEqual([]);
  });

  it('computes creator revenue, AOV, and product rankings correctly', async () => {
    const mockProducts = [
      { id: prodId1, title: 'Curso de React' },
      { id: prodId2, title: 'Ebook de TypeScript' },
    ];

    const mockOrderItems = [
      {
        product_id: prodId1,
        price_minor: '1000000', // 10,000.00 AOA
        orders: { id: 'ord-1', status: 'PAID', currency: 'AOA', created_at: '2026-03-01T10:00:00Z' },
      },
      {
        product_id: prodId1,
        price_minor: '1000000', // 10,000.00 AOA
        orders: { id: 'ord-2', status: 'PAID', currency: 'AOA', created_at: '2026-03-01T11:00:00Z' },
      },
      {
        product_id: prodId2,
        price_minor: '500000', // 5,000.00 AOA
        orders: { id: 'ord-3', status: 'REFUNDED', currency: 'AOA', created_at: '2026-03-02T12:00:00Z' },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockProducts,
                error: null,
              }),
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockResolvedValue({
                    data: mockOrderItems,
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

    const service = new AnalyticsService(mockSupabase);
    const result = await service.getCreatorAnalytics(creatorId, 'AOA', 30);

    // Gross paid: 10,000 + 10,000 = 20,000.00 AOA = 2,000,000 minor
    expect(result.grossRevenueMinor).toBe('2000000');
    expect(result.grossRevenueMajor).toBe('20000.00');
    expect(result.completedOrders).toBe(2);
    expect(result.totalOrders).toBe(3); // ord-1, ord-2, ord-3
    expect(result.refundedOrders).toBe(1);
    expect(result.refundRatePercent).toBe(33.33);
    // AOV = 20,000 / 2 = 10,000.00
    expect(result.averageOrderValueMajor).toBe('10000.00');

    // Product ranking
    expect(result.productPerformance).toHaveLength(2);
    expect(result.productPerformance[0]?.title).toBe('Curso de React');
    expect(result.productPerformance[0]?.salesCount).toBe(2);
    expect(result.productPerformance[1]?.title).toBe('Ebook de TypeScript');
    expect(result.productPerformance[1]?.salesCount).toBe(0);
  });

  it('rejects global platform metrics query from non-admin user (RBAC defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'BUYER' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AnalyticsService(mockSupabase);

    await expect(
      service.getPlatformAdminMetrics(buyerId)
    ).rejects.toThrow('FORBIDDEN');
  });

  it('computes platform-wide global metrics for authorized administrator', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockImplementation((_fields?: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count === 'exact' && opts?.head) {
                return Promise.resolve({ count: 50, error: null });
              }
              return {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: 'ADMIN' },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { status: 'PAID', total_amount_minor: '1000000', currency: 'AOA' },
                { status: 'PAID', total_amount_minor: '5000', currency: 'USD' },
                { status: 'PENDING', total_amount_minor: '2000000', currency: 'AOA' },
              ],
              error: null,
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ creator_id: 'c1' }, { creator_id: 'c2' }],
              error: null,
            }),
          };
        }
        if (table === 'withdrawals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ amount_minor: '500000' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                count: 3,
                error: null,
              }),
            }),
          };
        }
        if (table === 'platform_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { value: 10 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AnalyticsService(mockSupabase);
    const metrics = await service.getPlatformAdminMetrics(adminId);

    expect(metrics.totalOrders).toBe(3);
    expect(metrics.paidOrders).toBe(2);
    expect(metrics.gmvByCurrency['AOA']).toBe('10000.00');
    expect(metrics.gmvByCurrency['USD']).toBe('50.00');
    expect(metrics.totalUsers).toBe(50);
    expect(metrics.creatorsCount).toBe(2);
    expect(metrics.pendingWithdrawalsCount).toBe(1);
    expect(metrics.platformFeePercent).toBe(10);
  });
});
