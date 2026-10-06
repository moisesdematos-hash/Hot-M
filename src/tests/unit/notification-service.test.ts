import { describe, it, expect, vi } from 'vitest';
import { NotificationService } from '@/modules/notifications/notification-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('NotificationService Unit Tests (Phase 18 - In-App Notifications)', () => {
  const userId = 'user-notif-uuid';
  const otherUserId = 'other-user-uuid';
  const notificationId = 'notif-123-uuid';

  it('validates required fields when creating a notification', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new NotificationService(mockSupabase);

    await expect(
      service.createNotification(userId, {
        title: '',
        message: 'Mensagem válida',
      })
    ).rejects.toThrow('INVALID_NOTIFICATION');

    await expect(
      service.createNotification(userId, {
        title: 'Título válido',
        message: '',
      })
    ).rejects.toThrow('INVALID_NOTIFICATION');
  });

  it('creates notification and returns normalized object', async () => {
    const mockRecord = {
      id: notificationId,
      user_id: userId,
      title: 'Venda Concluída',
      message: 'Você recebeu uma comissão de 5.000 Kz',
      link: '/dashboard/finance',
      type: 'SALE',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockRecord,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new NotificationService(mockSupabase);
    const created = await service.createNotification(userId, {
      title: 'Venda Concluída',
      message: 'Você recebeu uma comissão de 5.000 Kz',
      link: '/dashboard/finance',
      type: 'SALE',
    });

    expect(created.id).toBe(notificationId);
    expect(created.userId).toBe(userId);
    expect(created.type).toBe('SALE');
    expect(created.isRead).toBe(false);
  });

  it('retrieves user notifications and unread count', async () => {
    const mockList = [
      {
        id: 'n-1',
        user_id: userId,
        title: 'Nova notificação',
        message: 'Teste 1',
        link: null,
        type: 'INFO',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count === 'exact' && opts?.head) {
                return {
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                      count: 1,
                      error: null,
                    }),
                  }),
                };
              }
              return {
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockList,
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new NotificationService(mockSupabase);
    const result = await service.getUserNotifications(userId);

    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]?.title).toBe('Nova notificação');
  });

  it('marks specific notification as read ensuring ownership defense', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'id' && val === notificationId) {
                  return {
                    eq: vi.fn().mockImplementation((_col2: string, val2: string) => {
                      return {
                        select: vi.fn().mockReturnValue({
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: val2 === userId ? { id: notificationId } : null,
                            error: null,
                          }),
                        }),
                      };
                    }),
                  };
                }
                return {};
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new NotificationService(mockSupabase);

    // Legitimate owner marks as read -> true
    const success = await service.markAsRead(notificationId, userId);
    expect(success).toBe(true);

    // Other user attempts to mark -> false
    const denied = await service.markAsRead(notificationId, otherUserId);
    expect(denied).toBe(false);
  });

  it('marks all unread notifications as read for a user', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: 'n-1' }, { id: 'n-2' }],
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

    const service = new NotificationService(mockSupabase);
    const count = await service.markAllAsRead(userId);
    expect(count).toBe(2);
  });
});
