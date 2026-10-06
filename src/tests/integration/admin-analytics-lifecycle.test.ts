import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from '@/modules/analytics/analytics-service';
import { AdminService } from '@/modules/admin/admin-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Admin & Analytics Lifecycle (Phase 20 - Performance Analytics & Platform Ops)', () => {
  const creatorId = 'creator-e2e-analytics-uuid';
  const superAdminId = 'super-admin-e2e-uuid';
  const customerId = 'customer-e2e-uuid';
  const prodId = 'prod-e2e-analytics-uuid';

  // In-memory data
  const usersStore = new Map<string, { id: string; full_name: string; email: string; role: string; created_at: string }>([
    [creatorId, { id: creatorId, full_name: 'Produtor Alpha', email: 'alpha@exemplo.ao', role: 'CREATOR', created_at: '2026-01-01T00:00:00Z' }],
    [superAdminId, { id: superAdminId, full_name: 'Super Admin HOT-M', email: 'super@hot-m.com', role: 'SUPER_ADMIN', created_at: '2026-01-01T00:00:00Z' }],
    [customerId, { id: customerId, full_name: 'Comprador Beta', email: 'beta@exemplo.ao', role: 'BUYER', created_at: '2026-02-01T00:00:00Z' }],
  ]);

  const settingsStore = new Map<string, { key: string; value: unknown; description: string | null; updated_at: string }>([
    ['platform_fee_percent', { key: 'platform_fee_percent', value: 10, description: 'Taxa base', updated_at: new Date().toISOString() }],
  ]);

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn().mockImplementation((fields?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === 'exact' && opts?.head) {
              return Promise.resolve({ count: usersStore.size, error: null });
            }
            if (fields === 'role') {
              return {
                eq: vi.fn().mockImplementation((_col: string, val: string) => {
                  const user = usersStore.get(val);
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: user ? { role: user.role } : null,
                      error: null,
                    }),
                  };
                }),
              };
            }
            return {
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: Array.from(usersStore.values()),
                  error: null,
                }),
              }),
            };
          }),
          update: vi.fn().mockImplementation((updates: { role: string }) => ({
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              const u = usersStore.get(val);
              if (u) u.role = updates.role;
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === 'user_roles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'products') {
        return {
          select: vi.fn().mockImplementation((fields?: string) => {
            if (fields === 'creator_id') {
              return Promise.resolve({
                data: [{ creator_id: creatorId }],
                error: null,
              });
            }
            return {
              eq: vi.fn().mockReturnValue({
                data: [{ id: prodId, title: 'Formação Avançada Next.js' }],
                error: null,
              }),
            };
          }),
        };
      }

      if (table === 'order_items') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  data: [
                    {
                      product_id: prodId,
                      price_minor: '1500000', // 15,000.00 AOA
                      orders: { id: 'ord-1', status: 'PAID', currency: 'AOA', created_at: '2026-03-01T10:00:00Z' },
                    },
                    {
                      product_id: prodId,
                      price_minor: '1500000', // 15,000.00 AOA
                      orders: { id: 'ord-2', status: 'PAID', currency: 'AOA', created_at: '2026-03-02T10:00:00Z' },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'orders') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { status: 'PAID', total_amount_minor: '1500000', currency: 'AOA' },
              { status: 'PAID', total_amount_minor: '1500000', currency: 'AOA' },
            ],
            error: null,
          }),
        };
      }

      if (table === 'withdrawals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ amount_minor: '500000' }], // 1 pending withdrawal of 5,000 AOA
              error: null,
            }),
          }),
        };
      }

      if (table === 'support_tickets') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        };
      }

      if (table === 'platform_settings') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: settingsStore.get('platform_fee_percent'),
                error: null,
              }),
            }),
            order: vi.fn().mockResolvedValue({
              data: Array.from(settingsStore.values()),
              error: null,
            }),
          })),
          upsert: vi.fn().mockImplementation((rec: { key: string; value: unknown; description?: string }) => {
            settingsStore.set(rec.key, {
              key: rec.key,
              value: rec.value,
              description: rec.description || null,
              updated_at: new Date().toISOString(),
            });
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  it('orchestrates complete admin & analytics lifecycle: creator KPI analysis -> intruder escalation blocked -> SuperAdmin platform audit -> user promotion -> fee setting adjustment', async () => {
    const analyticsService = new AnalyticsService(mockSupabase);
    const adminService = new AdminService(mockSupabase);

    // 1. Creator inspects performance
    const creatorMetrics = await analyticsService.getCreatorAnalytics(creatorId, 'AOA', 30);
    expect(creatorMetrics.grossRevenueMajor).toBe('30000.00'); // 15,000 * 2
    expect(creatorMetrics.completedOrders).toBe(2);
    expect(creatorMetrics.averageOrderValueMajor).toBe('15000.00');
    expect(creatorMetrics.productPerformance[0]?.title).toBe('Formação Avançada Next.js');

    // 2. Normal customer tries to fetch platform admin KPIs -> BLOCKED
    await expect(
      analyticsService.getPlatformAdminMetrics(customerId)
    ).rejects.toThrow('FORBIDDEN');

    // 3. Normal customer tries to modify their own role to ADMIN -> BLOCKED (INV-010)
    await expect(
      adminService.updateUserRole(customerId, customerId, 'ADMIN')
    ).rejects.toThrow('FORBIDDEN');

    // 4. SuperAdmin retrieves global platform metrics
    const platformKpis = await analyticsService.getPlatformAdminMetrics(superAdminId);
    expect(platformKpis.totalOrders).toBe(2);
    expect(platformKpis.paidOrders).toBe(2);
    expect(platformKpis.gmvByCurrency['AOA']).toBe('30000.00');
    expect(platformKpis.totalUsers).toBe(3);
    expect(platformKpis.pendingWithdrawalsCount).toBe(1);
    expect(platformKpis.platformFeePercent).toBe(10);

    // 5. SuperAdmin lists users and promotes customer to CREATOR
    const users = await adminService.listUsers(superAdminId);
    expect(users).toHaveLength(3);

    const promoted = await adminService.updateUserRole(superAdminId, customerId, 'CREATOR');
    expect(promoted).toBe(true);
    expect(usersStore.get(customerId)?.role).toBe('CREATOR');

    // 6. SuperAdmin adjusts platform fee setting from 10% to 8%
    const settingUpdated = await adminService.updatePlatformSetting(
      superAdminId,
      'platform_fee_percent',
      8,
      'Taxa promocional'
    );
    expect(settingUpdated).toBe(true);
    expect(settingsStore.get('platform_fee_percent')?.value).toBe(8);
  });
});
