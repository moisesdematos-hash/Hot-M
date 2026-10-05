import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);

    await authService.signOut();

    return NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao encerrar sessão';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
