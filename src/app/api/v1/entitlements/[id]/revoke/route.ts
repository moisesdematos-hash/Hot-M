import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { EntitlementService } from '@/modules/entitlements/entitlement-service';

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
      ['COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Acesso negado: Requer privilégios administrativos ou de compliance' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Revogação manual por operador';

    const entitlementService = new EntitlementService(supabase);
    await entitlementService.revokeEntitlement(id, reason, session.id);

    return NextResponse.json({
      success: true,
      message: 'Direito de acesso revogado com sucesso',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao revogar acesso';
    const status = message.includes('NOT_FOUND') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
