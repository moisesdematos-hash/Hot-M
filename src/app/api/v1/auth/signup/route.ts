import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { signUpSchema } from '@/modules/auth/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = signUpSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${origin}/api/v1/auth/callback`;

    const result = await authService.signUp(parsed.data, callbackUrl);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
      message: 'Cadastro efetuado com sucesso. Verifique seu email para confirmação.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno de servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
