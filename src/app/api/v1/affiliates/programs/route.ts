import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AffiliateService } from '@/modules/affiliates/affiliate-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const affiliateService = new AffiliateService(supabase);
    const programs = await affiliateService.getAvailablePrograms();

    return NextResponse.json({
      success: true,
      programs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar programas de afiliados';
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
    const { productId, isActive, commissionPercentage, cookieDurationDays } = body;

    if (!productId || commissionPercentage === undefined) {
      return NextResponse.json(
        { error: 'Campos productId e commissionPercentage são obrigatórios' },
        { status: 400 }
      );
    }

    const affiliateService = new AffiliateService(supabase);
    const program = await affiliateService.configureProgram(session.id, productId, {
      isActive: Boolean(isActive),
      commissionPercentage: Number(commissionPercentage),
      cookieDurationDays: cookieDurationDays ? Number(cookieDurationDays) : 30,
    });

    return NextResponse.json({
      success: true,
      program,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao configurar programa';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
