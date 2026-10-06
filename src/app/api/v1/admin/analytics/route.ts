import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AnalyticsService } from '@/modules/analytics/analytics-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const analyticsService = new AnalyticsService(supabase);
    const metrics = await analyticsService.getPlatformAdminMetrics(session.id);

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar métricas da plataforma';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
