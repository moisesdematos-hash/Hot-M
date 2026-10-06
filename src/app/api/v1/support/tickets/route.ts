import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { SupportService, TicketCategory, TicketPriority } from '@/modules/support/support-service';

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supportService = new SupportService(supabase);
    const tickets = await supportService.getTickets(session.id, {
      isStaff,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      tickets,
      isStaff,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar tickets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, description, category, priority, orderId } = body;

    const supportService = new SupportService(supabase);
    const ticket = await supportService.createTicket(session.id, {
      subject,
      description,
      category: category as TicketCategory,
      priority: priority as TicketPriority,
      orderId,
    });

    return NextResponse.json({
      success: true,
      ticket,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao criar ticket';
    const status = message.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
