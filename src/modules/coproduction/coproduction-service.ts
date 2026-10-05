import { SupabaseClient } from '@supabase/supabase-js';

export interface CoProducerRecord {
  id: string;
  productId: string;
  partnerId: string;
  percentage: number;
  createdAt: string;
  partner: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface UserCoProductionItem {
  id: string;
  productId: string;
  percentage: number;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    creatorName: string;
  };
}

export interface CoProductionSplitResult {
  partners: Array<{
    partnerId: string;
    percentage: number;
    amountMinor: bigint;
  }>;
  primaryCreatorAmountMinor: bigint;
}

export class CoproductionService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Retrieves all co-producers configured for a product.
   */
  async getCoProducers(productId: string, creatorId: string): Promise<{
    coProducers: CoProducerRecord[];
    totalAllocatedPercentage: number;
    primaryCreatorPercentage: number;
  }> {
    // 1. Verify creator owns product (IDOR defense)
    const { data: product, error: prodError } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (prodError || !product) {
      throw new Error('PRODUCT_NOT_FOUND: Produto não encontrado');
    }

    if (product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador do produto pode gerenciar coprodutores');
    }

    // 2. Fetch revenue shares
    const { data: shares, error: sharesError } = await this.client
      .from('revenue_shares')
      .select('id, product_id, partner_id, percentage, created_at, user_profiles(id, full_name, email)')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (sharesError || !shares) {
      return { coProducers: [], totalAllocatedPercentage: 0, primaryCreatorPercentage: 100 };
    }

    let totalAllocated = 0;
    const coProducers: CoProducerRecord[] = [];

    for (const s of shares) {
      totalAllocated += s.percentage;
      const profile = s.user_profiles as unknown as { id: string; full_name: string; email: string } | null;
      coProducers.push({
        id: s.id,
        productId: s.product_id,
        partnerId: s.partner_id,
        percentage: s.percentage,
        createdAt: s.created_at,
        partner: {
          id: profile?.id || s.partner_id,
          fullName: profile?.full_name || 'Parceiro',
          email: profile?.email || '',
        },
      });
    }

    return {
      coProducers,
      totalAllocatedPercentage: totalAllocated,
      primaryCreatorPercentage: 100 - totalAllocated,
    };
  }

  /**
   * Adds or updates a co-producer with revenue percentage.
   * Enforces: percentage > 0 and sum of shares < 100.
   */
  async addCoProducer(
    creatorId: string,
    productId: string,
    partnerEmail: string,
    percentage: number
  ): Promise<CoProducerRecord> {
    if (percentage <= 0 || percentage >= 100) {
      throw new Error('INVALID_PERCENTAGE: A porcentagem de coprodução deve ser entre 1% e 99%');
    }

    // 1. Verify product ownership
    const { data: product, error: prodError } = await this.client
      .from('products')
      .select('id, creator_id, title')
      .eq('id', productId)
      .maybeSingle();

    if (prodError || !product) {
      throw new Error('PRODUCT_NOT_FOUND: Produto não encontrado');
    }

    if (product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador do produto pode adicionar coprodutores');
    }

    // 2. Find partner by email
    const { data: partner, error: partError } = await this.client
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('email', partnerEmail.trim().toLowerCase())
      .maybeSingle();

    if (partError || !partner) {
      throw new Error('USER_NOT_FOUND: Nenhum usuário cadastrado com este e-mail');
    }

    // Prohibit self-coproduction
    if (partner.id === creatorId) {
      throw new Error('SELF_COPRODUCTION_PROHIBITED: Você é o produtor principal e já detém o faturamento base');
    }

    // 3. Verify total allocated percentage does not exceed 100%
    const { data: existingShares } = await this.client
      .from('revenue_shares')
      .select('partner_id, percentage')
      .eq('product_id', productId);

    let otherAllocated = 0;
    if (existingShares) {
      for (const s of existingShares) {
        if (s.partner_id !== partner.id) {
          otherAllocated += s.percentage;
        }
      }
    }

    if (otherAllocated + percentage >= 100) {
      throw new Error(
        `PERCENTAGE_EXCEEDS_LIMIT: A soma das cotas de coprodução não pode atingir ou ultrapassar 100% (restante disponível para parceiros: ${100 - otherAllocated - 1}%)`
      );
    }

    // 4. Upsert product_partners
    await this.client.from('product_partners').upsert(
      {
        product_id: productId,
        partner_id: partner.id,
      },
      { onConflict: 'product_id,partner_id' }
    );

    // 5. Upsert revenue_shares
    const { data: shareRecord, error: shareError } = await this.client
      .from('revenue_shares')
      .upsert(
        {
          product_id: productId,
          partner_id: partner.id,
          percentage,
        },
        { onConflict: 'product_id,partner_id' }
      )
      .select('*')
      .single();

    if (shareError || !shareRecord) {
      throw new Error(`Falha ao registrar cota de coprodução: ${shareError?.message || 'Erro'}`);
    }

    // 6. Audit log
    await this.client.from('audit_logs').insert({
      actor_id: creatorId,
      actor_role: 'CREATOR',
      action: 'COPRODUCER_ADDED',
      entity: 'products',
      entity_id: productId,
      request_id: `coprod_${Date.now()}`,
      reason: `Coprodutor ${partner.email} adicionado com ${percentage}% de receita`,
    });

    return {
      id: shareRecord.id,
      productId: shareRecord.product_id,
      partnerId: shareRecord.partner_id,
      percentage: shareRecord.percentage,
      createdAt: shareRecord.created_at,
      partner: {
        id: partner.id,
        fullName: partner.full_name,
        email: partner.email,
      },
    };
  }

  /**
   * Removes a co-producer from a product.
   */
  async removeCoProducer(
    creatorId: string,
    productId: string,
    partnerId: string
  ): Promise<void> {
    const { data: product } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product || product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador do produto pode remover coprodutores');
    }

    await this.client
      .from('revenue_shares')
      .delete()
      .eq('product_id', productId)
      .eq('partner_id', partnerId);

    await this.client
      .from('product_partners')
      .delete()
      .eq('product_id', productId)
      .eq('partner_id', partnerId);

    await this.client.from('audit_logs').insert({
      actor_id: creatorId,
      actor_role: 'CREATOR',
      action: 'COPRODUCER_REMOVED',
      entity: 'products',
      entity_id: productId,
      request_id: `rem_coprod_${Date.now()}`,
      reason: `Coprodutor ${partnerId} removido do produto`,
    });
  }

  /**
   * Retrieves products where the authenticated user is a co-producer.
   */
  async getUserCoProductions(userId: string): Promise<UserCoProductionItem[]> {
    const { data, error } = await this.client
      .from('revenue_shares')
      .select('id, product_id, percentage, created_at, products(id, title, slug, cover_image_url, user_profiles(full_name))')
      .eq('partner_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item) => {
      const prod = item.products as unknown as {
        id: string;
        title: string;
        slug: string;
        cover_image_url: string | null;
        user_profiles?: { full_name: string } | null;
      } | null;

      return {
        id: item.id,
        productId: item.product_id,
        percentage: item.percentage,
        createdAt: item.created_at,
        product: {
          id: prod?.id || item.product_id,
          title: prod?.title || 'Produto',
          slug: prod?.slug || '',
          coverImageUrl: prod?.cover_image_url || null,
          creatorName: prod?.user_profiles?.full_name || 'Produtor Principal',
        },
      };
    });
  }

  /**
   * Helper: Computes exact minor-unit split between partners and primary creator.
   * Invariant INV-006: Sum of partner splits + primary creator split == netPoolMinor.
   */
  async calculateSplit(
    productId: string,
    netPoolMinor: bigint
  ): Promise<CoProductionSplitResult> {
    const { data: shares } = await this.client
      .from('revenue_shares')
      .select('partner_id, percentage')
      .eq('product_id', productId);

    if (!shares || shares.length === 0) {
      return {
        partners: [],
        primaryCreatorAmountMinor: netPoolMinor,
      };
    }

    let allocatedMinor = 0n;
    const partners: Array<{ partnerId: string; percentage: number; amountMinor: bigint }> = [];

    for (const s of shares) {
      // Split = (netPoolMinor * percentage) / 100
      const partnerShareMinor = (netPoolMinor * BigInt(s.percentage)) / 100n;
      allocatedMinor += partnerShareMinor;

      partners.push({
        partnerId: s.partner_id,
        percentage: s.percentage,
        amountMinor: partnerShareMinor,
      });
    }

    // Remainder strictly goes to primary creator
    const primaryCreatorAmountMinor = netPoolMinor > allocatedMinor ? netPoolMinor - allocatedMinor : 0n;

    return {
      partners,
      primaryCreatorAmountMinor,
    };
  }
}
