import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { AdminService } from '@/modules/admin/admin-service';
import { UserRole } from '@/core/security/rbac';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Papel (role) é obrigatório.' }, { status: 400 });
    }

    const adminService = new AdminService(supabase);
    const success = await adminService.updateUserRole(session.id, id, role as UserRole);

    return NextResponse.json({
      success,
      updatedUserId: id,
      newRole: role,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar papel do utilizador';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
