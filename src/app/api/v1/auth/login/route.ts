import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { signInSchema } from '@/modules/auth/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = signInSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Credenciais inválidas', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);

    const result = await authService.signIn(parsed.data);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        email: result.user?.email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na autenticação';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
