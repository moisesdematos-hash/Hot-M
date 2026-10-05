import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { LmsService } from '@/modules/lms/lms-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    const lmsService = new LmsService(supabase);
    const curriculum = await lmsService.getCourseCurriculum(productId, session?.id);

    return NextResponse.json({
      success: true,
      ...curriculum,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao obter curso';
    const status = message.includes('NOT_FOUND') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
