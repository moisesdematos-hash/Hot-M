import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { NotificationService } from '@/modules/notifications/notification-service';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const notificationService = new NotificationService(supabase);
    const data = await notificationService.getUserNotifications(session.id, {
      unreadOnly,
      limit,
    });

    return NextResponse.json({
      success: true,
      notifications: data.notifications,
      unreadCount: data.unreadCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar notificações';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
