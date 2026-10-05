import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se houver erro ou código ausente, redireciona para a página de erro ou login
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
