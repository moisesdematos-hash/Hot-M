import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { EntitlementService } from '@/modules/entitlements/entitlement-service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const entitlementService = new EntitlementService(supabase);
    const result = await entitlementService.getSignedDownloadUrl(session.id, id, 900);

    return NextResponse.json({
      success: true,
      downloadUrl: result.downloadUrl,
      expiresInSeconds: result.expiresInSeconds,
      fileName: result.fileName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar link de download';
    const status = message.includes('FORBIDDEN') ? 403 : message.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
