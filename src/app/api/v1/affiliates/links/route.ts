import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AffiliateService } from '@/modules/affiliates/affiliate-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const affiliateService = new AffiliateService(supabase);
    const links = await affiliateService.getUserAffiliateLinks(session.id);

    return NextResponse.json({
      success: true,
      links,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar links de afiliado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
