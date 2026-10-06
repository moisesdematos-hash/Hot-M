import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { NotificationService } from '@/modules/notifications/notification-service';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const notificationService = new NotificationService(supabase);
    const count = await notificationService.markAllAsRead(session.id);

    return NextResponse.json({
      success: true,
      markedCount: count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao marcar notificações';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
