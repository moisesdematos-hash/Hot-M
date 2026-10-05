import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { LedgerService } from '@/modules/ledger/ledger-service';
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const ledgerService = new LedgerService(supabase);
    const statement = await ledgerService.getAccountStatement(session.id, currency, limit);

    return NextResponse.json({
      success: true,
      statement: statement.map((item) => ({
        ...item,
        amountMinor: item.amountMinor.toString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar extrato';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
