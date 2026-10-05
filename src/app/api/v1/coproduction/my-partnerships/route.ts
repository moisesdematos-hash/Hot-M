import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { CoproductionService } from '@/modules/coproduction/coproduction-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const coproductionService = new CoproductionService(supabase);
    const partnerships = await coproductionService.getUserCoProductions(session.id);

    return NextResponse.json({
      success: true,
      partnerships,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar parcerias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
