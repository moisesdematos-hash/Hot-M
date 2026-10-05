import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { EntitlementService } from '@/modules/entitlements/entitlement-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const entitlementService = new EntitlementService(supabase);
    const entitlements = await entitlementService.getUserEntitlements(session.id);

    return NextResponse.json({
      success: true,
      entitlements,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar acessos do usuário';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
