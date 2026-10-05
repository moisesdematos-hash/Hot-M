import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { ProductService } from '@/modules/products/product-service';
import { transitionProductStatusSchema } from '@/modules/products/schemas';

export async function POST(
  request: Request,
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

    const json = await request.json();
    const parsed = transitionProductStatusSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const productService = new ProductService(supabase);
    const requestId = crypto.randomUUID();

    const updated = await productService.transitionStatus({
      actorId: session.id,
      roles: session.roles,
      productId: id,
      nextStatus: parsed.data.status,
      reason: parsed.data.reason,
      requestId,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha na transição de status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
