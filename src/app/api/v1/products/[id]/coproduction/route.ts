import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { CoproductionService } from '@/modules/coproduction/coproduction-service';

export async function GET(
  _request: Request,
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

    const coproductionService = new CoproductionService(supabase);
    const result = await coproductionService.getCoProducers(productId, session.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar coprodutores';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
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
    const { partnerEmail, percentage } = body;

    if (!partnerEmail || percentage === undefined) {
      return NextResponse.json(
        { error: 'Campos partnerEmail e percentage são obrigatórios' },
        { status: 400 }
      );
    }

    const coproductionService = new CoproductionService(supabase);
    const coProducer = await coproductionService.addCoProducer(
      session.id,
      productId,
      partnerEmail,
      Number(percentage)
    );

    return NextResponse.json({
      success: true,
      coProducer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao adicionar coprodutor';
    const status = message.includes('FORBIDDEN')
      ? 403
      : message.includes('SELF_COPRODUCTION')
      ? 400
      : message.includes('PERCENTAGE_EXCEEDS')
      ? 422
      : message.includes('NOT_FOUND')
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
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

    const body = await request.json().catch(() => ({}));
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId é obrigatório' }, { status: 400 });
    }

    const coproductionService = new CoproductionService(supabase);
    await coproductionService.removeCoProducer(session.id, productId, partnerId);

    return NextResponse.json({
      success: true,
      message: 'Coprodutor removido com sucesso',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao remover coprodutor';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
