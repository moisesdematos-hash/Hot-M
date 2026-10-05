import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { CurrencyService } from '@/modules/fx/currency-service';
import { CurrencyCode } from '@/core/fintech/money';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const fxService = new CurrencyService(supabase);

    const [currencies, rates] = await Promise.all([
      fxService.getSupportedCurrencies(),
      fxService.getAllRates(),
    ]);

    return NextResponse.json({
      success: true,
      currencies,
      rates,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar taxas de câmbio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { from, to, rate } = body;

    if (!from || !to || typeof rate !== 'number' || rate <= 0) {
      return NextResponse.json({ error: 'Parâmetros from, to e rate (> 0) são obrigatórios.' }, { status: 400 });
    }

    const fxService = new CurrencyService(supabase);
    const result = await fxService.updateExchangeRate(
      from as CurrencyCode,
      to as CurrencyCode,
      rate,
      session.id
    );

    return NextResponse.json({
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar taxa de câmbio';
    const status = message.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
