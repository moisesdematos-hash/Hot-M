import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { ProductService } from '@/modules/products/product-service';
import { createProductSchema } from '@/modules/products/schemas';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const productService = new ProductService(supabase);

    const products = await productService.listPublishedProducts();
    return NextResponse.json({ success: true, products });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar produtos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = createProductSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const productService = new ProductService(supabase);
    const requestId = crypto.randomUUID();

    const product = await productService.createProduct({
      creatorId: session.id,
      roles: session.roles,
      input: parsed.data,
      requestId,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao processar criação de produto';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
