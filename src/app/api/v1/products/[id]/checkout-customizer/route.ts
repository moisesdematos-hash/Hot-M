import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { CheckoutCustomizerService } from '@/modules/checkout/checkout-customizer-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const service = new CheckoutCustomizerService(supabase);

    const [settings, testimonials] = await Promise.all([
      service.getCheckoutSettings(productId),
      service.getTestimonials(productId),
    ]);

    return NextResponse.json({
      success: true,
      settings,
      testimonials,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar configurações de checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
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
    const service = new CheckoutCustomizerService(supabase);

    const updated = await service.upsertCheckoutSettings(productId, session.id, body);

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar configurações';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
