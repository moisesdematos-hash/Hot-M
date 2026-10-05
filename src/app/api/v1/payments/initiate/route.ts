import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { PaymentService } from '@/modules/payments/payment-service';

const initiatePaymentSchema = z.object({
  orderId: z.string().uuid('ID do pedido inválido'),
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    // Bloqueia convidados de emitir ordens de pagamento (Seção 24)
    authService.assertNotGuestForFinancialOperation(session);

    const json = await request.json();
    const parsed = initiatePaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const paymentService = new PaymentService(supabase);
    const requestId = crypto.randomUUID();

    const attempt = await paymentService.initiatePayment({
      orderId: parsed.data.orderId,
      actorId: session!.id,
      requestId,
    });

    return NextResponse.json({
      success: true,
      paymentAttempt: {
        ...attempt,
        amount_minor: attempt.amount_minor.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao iniciar pagamento';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
