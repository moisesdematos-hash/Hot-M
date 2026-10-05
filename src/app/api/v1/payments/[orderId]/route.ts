import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { PaymentService } from '@/modules/payments/payment-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const paymentService = new PaymentService(supabase);
    const attempt = await paymentService.getPaymentAttemptByOrderId({
      orderId,
      actorId: session.id,
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Nenhuma tentativa de pagamento encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      paymentAttempt: {
        ...attempt,
        amount_minor: attempt.amount_minor.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao recuperar pagamento';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
