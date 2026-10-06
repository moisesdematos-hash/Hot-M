import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { SupportService } from '@/modules/support/support-service';

export async function GET(
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.id)
      .maybeSingle();

    const isStaff = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' || profile?.role === 'SUPPORT';

    const supportService = new SupportService(supabase);
    const ticket = await supportService.getTicketDetails(id, session.id, isStaff);

    return NextResponse.json({
      success: true,
      ticket,
      isStaff,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar ticket';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
