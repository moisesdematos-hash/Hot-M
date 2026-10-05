import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { WithdrawalService } from '@/modules/withdrawals/withdrawal-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const withdrawalService = new WithdrawalService(supabase);
    const methods = await withdrawalService.getUserWithdrawalMethods(session.id);

    return NextResponse.json({
      success: true,
      methods,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar métodos de saque';
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
    const { accountNumber, bankName, holderName, methodType } = body;

    const withdrawalService = new WithdrawalService(supabase);
    const method = await withdrawalService.createWithdrawalMethod(session.id, {
      accountNumber,
      bankName,
      holderName,
      methodType,
    });

    return NextResponse.json({
      success: true,
      method,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao cadastrar método de saque';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
