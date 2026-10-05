import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { WithdrawalService } from '@/modules/withdrawals/withdrawal-service';
import { CurrencyCode, Money } from '@/core/fintech/money';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const withdrawalService = new WithdrawalService(supabase);
    const withdrawals = await withdrawalService.getUserWithdrawals(session.id);

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals.map((w) => ({
        ...w,
        amountMinor: w.amountMinor.toString(),
        amount: Money.fromMinor(w.amountMinor, w.currency).toMajorString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar saques';
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
    const { withdrawalMethodId, amount, currency = 'AOA' } = body;

    if (!withdrawalMethodId || !amount) {
      return NextResponse.json(
        { error: 'Campos withdrawalMethodId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    const money = Money.fromMajor(amount.toString(), currency as CurrencyCode);

    const withdrawalService = new WithdrawalService(supabase);
    const withdrawal = await withdrawalService.requestWithdrawal(session.id, {
      withdrawalMethodId,
      amountMinor: money.amount,
      currency: currency as CurrencyCode,
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        ...withdrawal,
        amountMinor: withdrawal.amountMinor.toString(),
        amount: money.toMajorString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao solicitar saque';
    const status = message.includes('INSUFFICIENT_FUNDS')
      ? 422
      : message.includes('MINIMUM_WITHDRAWAL')
      ? 400
      : message.includes('NOT_FOUND')
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
