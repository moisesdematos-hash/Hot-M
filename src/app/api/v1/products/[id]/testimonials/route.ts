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
    const testimonials = await service.getTestimonials(productId);

    return NextResponse.json({
      success: true,
      testimonials,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar depoimentos';
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
    const { authorName, authorRole, content, rating, avatarUrl } = body;

    const service = new CheckoutCustomizerService(supabase);
    const testimonial = await service.createTestimonial(productId, session.id, {
      authorName,
      authorRole,
      content,
      rating,
      avatarUrl,
    });

    return NextResponse.json(
      {
        success: true,
        testimonial,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao cadastrar depoimento';
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
    const testimonialId = searchParams.get('testimonialId');

    if (!testimonialId) {
      return NextResponse.json({ error: 'Parâmetro testimonialId é obrigatório' }, { status: 400 });
    }

    const service = new CheckoutCustomizerService(supabase);
    await service.deleteTestimonial(testimonialId, session.id);

    return NextResponse.json({
      success: true,
      message: 'Depoimento excluído com sucesso.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir depoimento';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
