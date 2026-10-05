import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { PricingEngine } from '@/modules/pricing/pricing-engine';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const pricingEngine = new PricingEngine(supabase);

    const quote = await pricingEngine.getValidQuote(id);

    return NextResponse.json({
      success: true,
      quote: {
        ...quote,
        baseAmountMinor: quote.baseAmountMinor.toString(),
        discountAmountMinor: quote.discountAmountMinor.toString(),
        orderBumpsAmountMinor: quote.orderBumpsAmountMinor.toString(),
        totalAmountMinor: quote.totalAmountMinor.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao buscar cotação';
    const status = message.includes('QUOTE_EXPIRED') ? 410 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
