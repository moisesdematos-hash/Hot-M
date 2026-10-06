import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AdminService } from '@/modules/admin/admin-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminService = new AdminService(supabase);
    const settings = await adminService.getPlatformSettings(session.id);

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar configurações';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Parâmetros key e value são obrigatórios.' }, { status: 400 });
    }

    const adminService = new AdminService(supabase);
    const success = await adminService.updatePlatformSetting(session.id, key, value, description);

    return NextResponse.json({
      success,
      key,
      value,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar configuração';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
