import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { WithdrawalService } from '@/modules/withdrawals/withdrawal-service';
import { RBACManager } from '@/core/security/rbac';

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

    if (!RBACManager.hasPermission(session.roles, 'finance:approve_withdrawal')) {
      return NextResponse.json(
        { error: 'Acesso negado: Requer permissão finance:approve_withdrawal' },
        { status: 403 }
      );
    }

    const withdrawalService = new WithdrawalService(supabase);
    await withdrawalService.approveWithdrawal(id, session.id);

    return NextResponse.json({
      success: true,
      message: 'Saque aprovado com sucesso',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao aprovar saque';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
