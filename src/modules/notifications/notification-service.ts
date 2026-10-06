import { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'SALE';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
}

export class NotificationService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Retrieves notifications for a given user, along with total unread count.
   */
  async getUserNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<GetNotificationsResult> {
    const limit = options.limit || 50;

    // 1. Fetch unread count
    const { count: unreadCount, error: countErr } = await this.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (countErr) {
      throw new Error(`NOTIFICATION_FETCH_FAILED: ${countErr.message}`);
    }

    // 2. Fetch list
    let query = this.client
      .from('notifications')
      .select('id, user_id, title, message, link, type, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: rows, error: listErr } = await query;

    if (listErr) {
      throw new Error(`NOTIFICATION_FETCH_FAILED: ${listErr.message}`);
    }

    const notifications: NotificationItem[] = (rows || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      link: r.link || null,
      type: (r.type as NotificationType) || 'INFO',
      isRead: r.is_read,
      createdAt: r.created_at,
    }));

    return {
      notifications,
      unreadCount: unreadCount || 0,
    };
  }

  /**
   * Creates an in-app notification for a user.
   */
  async createNotification(
    userId: string,
    data: {
      title: string;
      message: string;
      link?: string;
      type?: NotificationType;
    }
  ): Promise<NotificationItem> {
    if (!data.title || !data.message) {
      throw new Error('INVALID_NOTIFICATION: Título e mensagem são obrigatórios.');
    }

    const { data: record, error } = await this.client
      .from('notifications')
      .insert({
        user_id: userId,
        title: data.title,
        message: data.message,
        link: data.link || null,
        type: data.type || 'INFO',
        is_read: false,
      })
      .select()
      .single();

    if (error || !record) {
      throw new Error(`NOTIFICATION_CREATE_FAILED: ${error?.message || 'Erro desconhecido'}`);
    }

    return {
      id: record.id,
      userId: record.user_id,
      title: record.title,
      message: record.message,
      link: record.link || null,
      type: (record.type as NotificationType) || 'INFO',
      isRead: record.is_read,
      createdAt: record.created_at,
    };
  }

  /**
   * Marks a specific notification as read, ensuring ownership defense.
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { data: updated, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(`NOTIFICATION_UPDATE_FAILED: ${error.message}`);
    }

    return !!updated;
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const { data: updated, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      throw new Error(`NOTIFICATION_UPDATE_FAILED: ${error.message}`);
    }

    return (updated || []).length;
  }
}
