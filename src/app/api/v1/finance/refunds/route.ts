import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { RefundService } from '@/modules/refunds/refund-service';

export async function GET(request: Request) {
  try {
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
        { error: 'Acesso negado: Requer privilégios de moderação' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const refundService = new RefundService(supabase);
    const requests = await refundService.getRefundRequests(status);

    return NextResponse.json({
      success: true,
      refundRequests: requests,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar solicitações de reembolso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
