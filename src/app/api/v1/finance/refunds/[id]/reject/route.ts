import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { RefundService } from '@/modules/refunds/refund-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const hasPermission = session.roles.some((role) =>
      ['SUPPORT', 'COMPLIANCE', 'FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Acesso negado: Requer privilégios de moderação de suporte ou financeiro' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Reembolso recusado pela equipe de moderação';

    const refundService = new RefundService(supabase);
    await refundService.rejectRefund(id, reason, session.id);

    return NextResponse.json({
      success: true,
      message: 'Solicitação de reembolso rejeitada e pedido retornado para PAID',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao rejeitar reembolso';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
