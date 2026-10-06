import { describe, it, expect, vi } from 'vitest';
import { AdminService } from '@/modules/admin/admin-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('AdminService Unit Tests (Phase 20 - User Management & Platform Settings)', () => {
  const superAdminId = 'super-admin-uuid';
  const regularAdminId = 'regular-admin-uuid';
  const buyerId = 'buyer-uuid';
  const targetUserId = 'target-user-uuid';

  it('rejects user listing if caller is not an administrator', async () => {
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

    const service = new AdminService(mockSupabase);

    await expect(service.listUsers(buyerId)).rejects.toThrow('FORBIDDEN');
  });

  it('lists registered users for legitimate administrator', async () => {
    const mockUsers = [
      { id: 'u1', full_name: 'António Silva', email: 'antonio@exemplo.ao', role: 'CREATOR', created_at: new Date().toISOString() },
      { id: 'u2', full_name: 'Maria Costa', email: 'maria@exemplo.ao', role: 'BUYER', created_at: new Date().toISOString() },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockImplementation((fields?: string) => {
              if (fields === 'role') {
                return {
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { role: 'ADMIN' },
                      error: null,
                    }),
                  }),
                };
              }
              return {
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockUsers,
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AdminService(mockSupabase);
    const users = await service.listUsers(regularAdminId);

    expect(users).toHaveLength(2);
    expect(users[0]?.fullName).toBe('António Silva');
  });

  it('rejects role update if caller is NOT SUPER_ADMIN (INV-010 Defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'ADMIN' }, // Regular admin cannot promote to admin
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AdminService(mockSupabase);

    await expect(
      service.updateUserRole(regularAdminId, targetUserId, 'ADMIN')
    ).rejects.toThrow('FORBIDDEN');
  });

  it('updates user role when executed by SUPER_ADMIN', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'SUPER_ADMIN' },
                  error: null,
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        if (table === 'user_roles') {
          return {
            upsert: upsertSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AdminService(mockSupabase);
    const success = await service.updateUserRole(superAdminId, targetUserId, 'ADMIN');

    expect(success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ role: 'ADMIN' });
    expect(upsertSpy).toHaveBeenCalledWith(
      { user_id: targetUserId, role: 'ADMIN' },
      { onConflict: 'user_id,role' }
    );
  });

  it('retrieves and updates platform settings', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'ADMIN' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'platform_settings') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { key: 'platform_fee_percent', value: 10, description: 'Taxa', updated_at: new Date().toISOString() },
                ],
                error: null,
              }),
            }),
            upsert: upsertSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AdminService(mockSupabase);
    const settings = await service.getPlatformSettings(regularAdminId);

    expect(settings).toHaveLength(1);
    expect(settings[0]?.key).toBe('platform_fee_percent');

    const updated = await service.updatePlatformSetting(
      regularAdminId,
      'platform_fee_percent',
      8,
      'Taxa reduzida'
    );
    expect(updated).toBe(true);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'platform_fee_percent',
        value: 8,
      }),
      { onConflict: 'key' }
    );
  });
});
