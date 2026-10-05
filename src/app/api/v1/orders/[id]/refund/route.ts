import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { RefundService } from '@/modules/refunds/refund-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason;

    if (!reason) {
      return NextResponse.json({ error: 'Motivo do reembolso é obrigatório' }, { status: 400 });
    }

    const refundService = new RefundService(supabase);
    const refundRequest = await refundService.requestRefund(session.id, orderId, reason);

    return NextResponse.json({
      success: true,
      refundRequest,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao solicitar reembolso';
    const status = message.includes('FORBIDDEN')
      ? 403
      : message.includes('WARRANTY_EXPIRED')
      ? 400
      : message.includes('ALREADY')
      ? 409
      : message.includes('NOT_FOUND')
      ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
