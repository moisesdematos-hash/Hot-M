import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { SupportService, TicketStatus } from '@/modules/support/support-service';

export async function PATCH(
  request: Request,
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.id)
      .maybeSingle();

    const isStaff = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' || profile?.role === 'SUPPORT';

    const body = await request.json();
    const { status } = body;

    const supportService = new SupportService(supabase);
    const updated = await supportService.updateTicketStatus(
      id,
      session.id,
      status as TicketStatus,
      isStaff
    );

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar status';
    const httpStatus = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
