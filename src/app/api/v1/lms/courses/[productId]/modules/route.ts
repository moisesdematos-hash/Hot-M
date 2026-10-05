import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { LmsService } from '@/modules/lms/lms-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, orderIndex } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Título do módulo é obrigatório' }, { status: 400 });
    }

    const lmsService = new LmsService(supabase);
    const moduleItem = await lmsService.createModule(productId, session.id, {
      title,
      orderIndex: typeof orderIndex === 'number' ? orderIndex : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        module: moduleItem,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao criar módulo';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
