import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AffiliateService } from '@/modules/affiliates/affiliate-service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const affiliateService = new AffiliateService(supabase);
    const link = await affiliateService.joinProgram(session.id, programId);

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao afiliar-se';
    const status = message.includes('SELF_AFFILIATION')
      ? 403
      : message.includes('NOT_FOUND')
      ? 404
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
