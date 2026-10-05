import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { PricingEngine } from '@/modules/pricing/pricing-engine';
import { quoteRequestSchema } from '@/modules/pricing/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = quoteRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros de cotação inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const pricingEngine = new PricingEngine(supabase);

    const quote = await pricingEngine.calculateQuote(parsed.data);

    // Converte BigInt para string antes de serializar JSON
    return NextResponse.json({
      success: true,
      quote: {
        ...quote,
        baseAmountMinor: quote.baseAmountMinor.toString(),
        discountAmountMinor: quote.discountAmountMinor.toString(),
        orderBumpsAmountMinor: quote.orderBumpsAmountMinor.toString(),
        totalAmountMinor: quote.totalAmountMinor.toString(),
        orderBumps: quote.orderBumps.map((b) => ({
          ...b,
          amountMinor: b.amountMinor.toString(),
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao calcular cotação';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
