import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AnalyticsService } from '@/modules/analytics/analytics-service';
import { CurrencyCode } from '@/core/fintech/money';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get('currency') || 'AOA') as CurrencyCode;
    const days = parseInt(searchParams.get('days') || '30', 10);

    const analyticsService = new AnalyticsService(supabase);
    const analytics = await analyticsService.getCreatorAnalytics(session.id, currency, days);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar dados analíticos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
