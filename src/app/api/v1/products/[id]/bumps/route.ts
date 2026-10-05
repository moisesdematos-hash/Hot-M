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
    const bumps = await funnelService.getOrderBumpsForProduct(productId);

    return NextResponse.json({
      success: true,
      bumps,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar order bumps';
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
    const { bumpProductId, bumpOfferId, headline, description } = body;

    if (!bumpProductId || !bumpOfferId || !headline) {
      return NextResponse.json(
        { error: 'Campos bumpProductId, bumpOfferId e headline são obrigatórios.' },
        { status: 400 }
      );
    }

    const funnelService = new FunnelService(supabase);
    const result = await funnelService.createOrderBump(productId, session.id, {
      bumpProductId,
      bumpOfferId,
      headline,
      description,
    });

    return NextResponse.json(
      {
        success: true,
        bump: result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao criar order bump';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bumpId = searchParams.get('bumpId');

    if (!bumpId) {
      return NextResponse.json({ error: 'Parâmetro bumpId é obrigatório' }, { status: 400 });
    }

    const funnelService = new FunnelService(supabase);
    await funnelService.deleteOrderBump(bumpId, session.id);

    return NextResponse.json({
      success: true,
      message: 'Order bump removido com sucesso.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir order bump';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
