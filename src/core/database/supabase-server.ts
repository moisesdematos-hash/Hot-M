import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/core/config/env';

interface CookieItem {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function createServerSupabaseClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Can be ignored if called from a Server Component where cookies are read-only
          }
        },
      },
    }
  );
}
