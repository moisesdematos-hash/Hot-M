import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { OrderService } from '@/modules/orders/order-service';
import { createOrderSchema } from '@/modules/orders/schemas';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const orderService = new OrderService(supabase);
    const orders = await orderService.listBuyerOrders(session.id);

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        ...o,
        total_amount_minor: o.total_amount_minor.toString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar pedidos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    // Enforce Section 24: No guest for financial operations
    authService.assertNotGuestForFinancialOperation(session);

    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const orderService = new OrderService(supabase);
    const requestId = crypto.randomUUID();

    const result = await orderService.createOrder({
      buyerId: session!.id,
      input: parsed.data,
      requestId,
    });

    return NextResponse.json(
      {
        success: true,
        order: {
          ...result.order,
          total_amount_minor: result.order.total_amount_minor.toString(),
        },
        items: result.items.map((item) => ({
          ...item,
          unit_amount_minor: item.unit_amount_minor.toString(),
        })),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao criar pedido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
