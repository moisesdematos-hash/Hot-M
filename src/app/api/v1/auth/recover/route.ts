import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { passwordRecoverySchema } from '@/modules/auth/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = passwordRecoverySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email inválido', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${origin}/auth/reset-password`;

    await authService.sendPasswordRecovery(parsed.data, callbackUrl);

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, as instruções de recuperação foram enviadas.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
