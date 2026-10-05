import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { FunnelService } from '@/modules/funnels/funnel-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const funnelService = new FunnelService(supabase);
    const upsell = await funnelService.getUpsellForProduct(productId);

    return NextResponse.json({
      success: true,
      upsell,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar upsell';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { upsellProductId, upsellOfferId, headline, description, videoUrl, discountPercentage } = body;

    if (!upsellProductId || !upsellOfferId || !headline) {
      return NextResponse.json(
        { error: 'Campos upsellProductId, upsellOfferId e headline são obrigatórios.' },
        { status: 400 }
      );
    }

    const funnelService = new FunnelService(supabase);
    const result = await funnelService.createUpsell(productId, session.id, {
      upsellProductId,
      upsellOfferId,
      headline,
      description,
      videoUrl,
      discountPercentage: typeof discountPercentage === 'number' ? discountPercentage : 0,
    });

    return NextResponse.json(
      {
        success: true,
        upsell: result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao configurar upsell';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
