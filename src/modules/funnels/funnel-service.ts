import { SupabaseClient } from '@supabase/supabase-js';
import { Money, CurrencyCode } from '@/core/fintech/money';

export interface OrderBumpItem {
  id: string;
  productId: string;
  bumpProductId: string;
  bumpOfferId: string;
  headline: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  bumpProduct: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
  bumpOffer?: {
    id: string;
    priceAmount: string;
    priceAmountMinor: bigint;
    currency: CurrencyCode;
  };
}

export interface PostPurchaseUpsellItem {
  id: string;
  productId: string;
  upsellProductId: string;
  upsellOfferId: string;
  headline: string;
  description: string | null;
  videoUrl: string | null;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
  upsellProduct: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
  pricing?: {
    originalAmount: string;
    discountedAmount: string;
    currency: CurrencyCode;
  };
}

export class FunnelService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Retrieves active order bumps for a product (used on checkout page).
   */
  async getOrderBumpsForProduct(productId: string, currency: CurrencyCode = 'AOA'): Promise<OrderBumpItem[]> {
    const { data: bumps, error } = await this.client
      .from('order_bumps')
      .select('id, product_id, bump_product_id, bump_offer_id, headline, description, is_active, created_at, products!order_bumps_bump_product_id_fkey(id, title, cover_image_url)')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error || !bumps) {
      // Fallback if join syntax fails in mock or simple client
      const { data: rawBumps } = await this.client
        .from('order_bumps')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (!rawBumps || rawBumps.length === 0) return [];

      const result: OrderBumpItem[] = [];
      for (const b of rawBumps) {
        const { data: prod } = await this.client
          .from('products')
          .select('id, title, cover_image_url')
          .eq('id', b.bump_product_id)
          .maybeSingle();

        const { data: priceRec } = await this.client
          .from('prices')
          .select('amount_minor, currency')
          .eq('offer_id', b.bump_offer_id)
          .eq('currency', currency)
          .maybeSingle();

        const minor = priceRec ? BigInt(priceRec.amount_minor) : 0n;
        const money = Money.fromMinor(minor, currency);

        result.push({
          id: b.id,
          productId: b.product_id,
          bumpProductId: b.bump_product_id,
          bumpOfferId: b.bump_offer_id,
          headline: b.headline,
          description: b.description,
          isActive: b.is_active,
          createdAt: b.created_at,
          bumpProduct: {
            id: prod?.id || b.bump_product_id,
            title: prod?.title || 'Produto Adicional',
            coverImageUrl: prod?.cover_image_url || null,
          },
          bumpOffer: {
            id: b.bump_offer_id,
            priceAmount: money.toMajorString(),
            priceAmountMinor: money.amount,
            currency,
          },
        });
      }
      return result;
    }

    const items: OrderBumpItem[] = [];
    for (const b of bumps) {
      const prodRel = b.products as unknown as { id: string; title: string; cover_image_url: string | null };

      const { data: priceRec } = await this.client
        .from('prices')
        .select('amount_minor, currency')
        .eq('offer_id', b.bump_offer_id)
        .eq('currency', currency)
        .maybeSingle();

      const minor = priceRec ? BigInt(priceRec.amount_minor) : 0n;
      const money = Money.fromMinor(minor, currency);

      items.push({
        id: b.id,
        productId: b.product_id,
        bumpProductId: b.bump_product_id,
        bumpOfferId: b.bump_offer_id,
        headline: b.headline,
        description: b.description,
        isActive: b.is_active,
        createdAt: b.created_at,
        bumpProduct: {
          id: prodRel?.id || b.bump_product_id,
          title: prodRel?.title || 'Produto Adicional',
          coverImageUrl: prodRel?.cover_image_url || null,
        },
        bumpOffer: {
          id: b.bump_offer_id,
          priceAmount: money.toMajorString(),
          priceAmountMinor: money.amount,
          currency,
        },
      });
    }

    return items;
  }

  /**
   * Creates an order bump for a product.
   * Defesa IDOR: Only creator of the parent product can configure bumps.
   */
  async createOrderBump(
    productId: string,
    creatorId: string,
    data: {
      bumpProductId: string;
      bumpOfferId: string;
      headline: string;
      description?: string;
    }
  ): Promise<{ id: string }> {
    if (!data.headline || data.headline.trim() === '') {
      throw new Error('INVALID_DATA: Chamada de destaque (headline) é obrigatória.');
    }

    // 1. Verify creator owns parent product
    const { data: parentProd } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (!parentProd || parentProd.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador pode configurar Order Bumps.');
    }

    // 2. Verify bump product exists
    const { data: bumpProd } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', data.bumpProductId)
      .maybeSingle();

    if (!bumpProd) {
      throw new Error('PRODUCT_NOT_FOUND: Produto de bump não encontrado.');
    }

    // 3. Create bump
    const { data: bumpRecord, error } = await this.client
      .from('order_bumps')
      .insert({
        product_id: productId,
        bump_product_id: data.bumpProductId,
        bump_offer_id: data.bumpOfferId,
        headline: data.headline.trim(),
        description: data.description?.trim() || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !bumpRecord) {
      throw new Error(`ORDER_BUMP_CREATION_FAILED: ${error?.message || 'Erro ao criar bump.'}`);
    }

    return { id: bumpRecord.id };
  }

  /**
   * Deletes an order bump.
   * Defesa IDOR: Only creator of parent product can delete.
   */
  async deleteOrderBump(bumpId: string, creatorId: string): Promise<boolean> {
    const { data: bump } = await this.client
      .from('order_bumps')
      .select('id, product_id, products!order_bumps_product_id_fkey(creator_id)')
      .eq('id', bumpId)
      .maybeSingle();

    if (!bump) {
      // Fallback lookup
      const { data: fallbackBump } = await this.client
        .from('order_bumps')
        .select('id, product_id')
        .eq('id', bumpId)
        .maybeSingle();

      if (!fallbackBump) {
        throw new Error('ORDER_BUMP_NOT_FOUND: Order bump não encontrado.');
      }

      const { data: prod } = await this.client
        .from('products')
        .select('creator_id')
        .eq('id', fallbackBump.product_id)
        .maybeSingle();

      if (prod?.creator_id !== creatorId) {
        throw new Error('FORBIDDEN: Permissão negada para excluir este order bump.');
      }
    } else {
      const prodRel = bump.products as unknown as { creator_id: string } | null;
      if (prodRel?.creator_id !== creatorId) {
        throw new Error('FORBIDDEN: Permissão negada para excluir este order bump.');
      }
    }

    const { error } = await this.client.from('order_bumps').delete().eq('id', bumpId);
    if (error) {
      throw new Error(`DELETE_FAILED: ${error.message}`);
    }
    return true;
  }

  /**
   * Retrieves active post-purchase upsell for a product.
   */
  async getUpsellForProduct(productId: string, currency: CurrencyCode = 'AOA'): Promise<PostPurchaseUpsellItem | null> {
    const { data: upsell } = await this.client
      .from('post_purchase_upsells')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (!upsell) return null;

    const { data: prod } = await this.client
      .from('products')
      .select('id, title, cover_image_url')
      .eq('id', upsell.upsell_product_id)
      .maybeSingle();

    const { data: priceRec } = await this.client
      .from('prices')
      .select('amount_minor, currency')
      .eq('offer_id', upsell.upsell_offer_id)
      .eq('currency', currency)
      .maybeSingle();

    const origMinor = priceRec ? BigInt(priceRec.amount_minor) : 0n;
    const origMoney = Money.fromMinor(origMinor, currency);

    let discountedMoney = origMoney;
    if (upsell.discount_percentage > 0) {
      const discountFraction = upsell.discount_percentage / 100;
      discountedMoney = origMoney.multiply(1 - discountFraction);
    }

    return {
      id: upsell.id,
      productId: upsell.product_id,
      upsellProductId: upsell.upsell_product_id,
      upsellOfferId: upsell.upsell_offer_id,
      headline: upsell.headline,
      description: upsell.description,
      videoUrl: upsell.video_url,
      discountPercentage: upsell.discount_percentage,
      isActive: upsell.is_active,
      createdAt: upsell.created_at,
      upsellProduct: {
        id: prod?.id || upsell.upsell_product_id,
        title: prod?.title || 'Oferta Exclusiva',
        coverImageUrl: prod?.cover_image_url || null,
      },
      pricing: {
        originalAmount: origMoney.toMajorString(),
        discountedAmount: discountedMoney.toMajorString(),
        currency,
      },
    };
  }

  /**
   * Creates a post-purchase upsell offer.
   * Defesa IDOR: Only creator of the parent product can configure upsells.
   */
  async createUpsell(
    productId: string,
    creatorId: string,
    data: {
      upsellProductId: string;
      upsellOfferId: string;
      headline: string;
      description?: string;
      videoUrl?: string;
      discountPercentage?: number;
    }
  ): Promise<{ id: string }> {
    if (!data.headline || data.headline.trim() === '') {
      throw new Error('INVALID_DATA: Headline do upsell é obrigatória.');
    }

    const { data: parentProd } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (!parentProd || parentProd.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador pode configurar upsells pós-compra.');
    }

    const { data: upsellRecord, error } = await this.client
      .from('post_purchase_upsells')
      .insert({
        product_id: productId,
        upsell_product_id: data.upsellProductId,
        upsell_offer_id: data.upsellOfferId,
        headline: data.headline.trim(),
        description: data.description?.trim() || null,
        video_url: data.videoUrl?.trim() || null,
        discount_percentage: data.discountPercentage ?? 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !upsellRecord) {
      throw new Error(`UPSELL_CREATION_FAILED: ${error?.message || 'Erro ao criar upsell.'}`);
    }

    return { id: upsellRecord.id };
  }
}
