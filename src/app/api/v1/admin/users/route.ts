import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AdminService } from '@/modules/admin/admin-service';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const adminService = new AdminService(supabase);
    const users = await adminService.listUsers(session.id, { search, limit });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar utilizadores';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
