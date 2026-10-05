import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { RBACManager } from '@/core/security/rbac';
import { ReconciliationService } from '@/modules/ledger/reconciliation-service';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!RBACManager.hasPermission(session.roles, 'finance:reconcile')) {
      return NextResponse.json(
        { error: 'Acesso negado: Requer permissão finance:reconcile' },
        { status: 403 }
      );
    }

    const reconciliationService = new ReconciliationService(supabase);
    const report = await reconciliationService.runReconciliation();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao executar reconciliação';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
