import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);

    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: session,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao recuperar sessão';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
