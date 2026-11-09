import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { OutboxService } from '@/modules/notifications/outbox-service';
import { RemarketingService } from '@/modules/marketing/remarketing-service';

async function handleWorker(request: Request) {
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

    // Executa a recuperação de referências Multicaixa pendentes (Pilar 3)
    const remarketingService = new RemarketingService(supabase);
    const remarketing = await remarketingService
      .processPendingReferenceReminders(batchSize)
      .catch(() => ({ remindedCount: 0, skippedCount: 0 }));

    const outboxService = new OutboxService(supabase);
    const result = await outboxService.processPendingEvents(batchSize);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      outbox: result,
      remarketing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao executar outbox worker';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleWorker(request);
}

export async function POST(request: Request) {
  return handleWorker(request);
}
