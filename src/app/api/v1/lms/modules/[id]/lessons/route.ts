import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { LmsService, LessonContentType } from '@/modules/lms/lms-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: moduleId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, contentType, contentUrl, bodyText, orderIndex } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Título da aula é obrigatório' }, { status: 400 });
    }

    const validTypes: LessonContentType[] = ['VIDEO', 'AUDIO', 'PDF', 'TEXT'];
    if (!contentType || !validTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Tipo de conteúdo inválido (VIDEO, AUDIO, PDF, TEXT)' }, { status: 400 });
    }

    const lmsService = new LmsService(supabase);
    const lesson = await lmsService.createLesson(moduleId, session.id, {
      title,
      contentType,
      contentUrl,
      bodyText,
      orderIndex: typeof orderIndex === 'number' ? orderIndex : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        lesson,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao criar aula';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
