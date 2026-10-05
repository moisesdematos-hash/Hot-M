import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { CurrencyService, SUPPORTED_CURRENCIES } from '@/modules/fx/currency-service';
import { CurrencyCode } from '@/core/fintech/money';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amountMinor, from, to } = body;

    if (amountMinor === undefined || !from || !to) {
      return NextResponse.json(
        { error: 'Campos amountMinor, from e to são obrigatórios.' },
        { status: 400 }
      );
    }

    const validCodes = SUPPORTED_CURRENCIES.map((c) => c.code);
    if (!validCodes.includes(from) || !validCodes.includes(to)) {
      return NextResponse.json(
        { error: `Moeda inválida. Suportadas: ${validCodes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const fxService = new CurrencyService(supabase);

    const minor = BigInt(amountMinor);
    const converted = await fxService.convert(minor, from as CurrencyCode, to as CurrencyCode);
    const rate = await fxService.getExchangeRate(from as CurrencyCode, to as CurrencyCode);
    const meta = SUPPORTED_CURRENCIES.find((c) => c.code === to);

    return NextResponse.json({
      success: true,
      from,
      to,
      rate,
      originalMinor: amountMinor.toString(),
      convertedMinor: converted.amount.toString(),
      convertedAmount: converted.toMajorString(),
      currencySymbol: meta?.symbol || to,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao converter moedas';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
