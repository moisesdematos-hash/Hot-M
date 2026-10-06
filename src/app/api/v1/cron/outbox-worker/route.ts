import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { OutboxService } from '@/modules/notifications/outbox-service';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'hot-m-cron-secret-local';
    const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;

    const supabase = await createServerSupabaseClient();

    if (!isCronAuthorized) {
      // If not cron secret, check if authenticated admin
      const authService = new AuthService(supabase);
      const session = await authService.getCurrentSession();

      if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.id)
        .maybeSingle();

      if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
        return NextResponse.json(
          { error: 'FORBIDDEN: Apenas administradores ou scheduler autorizado podem executar o outbox worker' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batch') || '20', 10);

    const outboxService = new OutboxService(supabase);
    const result = await outboxService.processPendingEvents(batchSize);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao executar outbox worker';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
