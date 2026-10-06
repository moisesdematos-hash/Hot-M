import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { NotificationService } from '@/modules/notifications/notification-service';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const notificationService = new NotificationService(supabase);
    const updated = await notificationService.markAsRead(id, session.id);

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar notificação';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
