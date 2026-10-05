import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { OrderService } from '@/modules/orders/order-service';

export async function GET(
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

    const orderService = new OrderService(supabase);
    const result = await orderService.getOrderById({
      orderId: id,
      actorId: session.id,
      roles: session.roles,
    });

    if (!result) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...result.order,
        total_amount_minor: result.order.total_amount_minor.toString(),
      },
      items: result.items.map((item) => ({
        ...item,
        unit_amount_minor: item.unit_amount_minor.toString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao recuperar pedido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
