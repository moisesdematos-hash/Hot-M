import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { RefundService } from '@/modules/refunds/refund-service';

export async function POST(
  _request: Request,
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
      ['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Acesso negado: Requer permissão financeira para aprovação de estorno' },
        { status: 403 }
      );
    }

    const refundService = new RefundService(supabase);
    const result = await refundService.approveRefund(id, session.id);

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        reversedAmountMinor: result.reversedAmountMinor.toString(),
      },
      message: 'Reembolso aprovado, saldo estornado e acessos revogados com sucesso',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao aprovar reembolso';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
