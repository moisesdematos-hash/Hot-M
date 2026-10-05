import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { createOfferSchema } from '@/modules/pricing/schemas';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = createOfferSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, name, isDefault, prices } = parsed.data;

    // Verificar se o produto pertence ao criador (ou se é ADMIN)
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (prodError || !product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    if (
      product.creator_id !== session.id &&
      !session.roles.includes('ADMIN') &&
      !session.roles.includes('SUPER_ADMIN')
    ) {
      return NextResponse.json({ error: 'Acesso negado para este produto' }, { status: 403 });
    }

    // Criar oferta
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        product_id: productId,
        name,
        is_default: isDefault,
        is_active: true,
      })
      .select()
      .single();

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Falha ao criar oferta' }, { status: 500 });
    }

    // Inserir preços da oferta
    const priceRecords = prices.map((p) => ({
      offer_id: offer.id,
      currency: p.currency,
      amount_minor: p.amountMinor,
      is_active: true,
    }));

    const { error: priceError } = await supabase.from('prices').insert(priceRecords);

    if (priceError) {
      return NextResponse.json({ error: 'Falha ao cadastrar preços da oferta' }, { status: 500 });
    }

    return NextResponse.json({ success: true, offer, prices: priceRecords }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar oferta';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
