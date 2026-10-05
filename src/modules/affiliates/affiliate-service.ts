import { SupabaseClient } from '@supabase/supabase-js';
import { CurrencyCode, Money } from '@/core/fintech/money';

export interface AffiliateProgramRecord {
  id: string;
  productId: string;
  isActive: boolean;
  commissionPercentage: number;
  cookieDurationDays: number;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    coverImageUrl: string | null;
    creatorId: string;
    priceAmount?: string;
    currency?: CurrencyCode;
  };
}

export interface AffiliateLinkRecord {
  id: string;
  programId: string;
  affiliateId: string;
  code: string;
  createdAt: string;
  program?: {
    commissionPercentage: number;
    cookieDurationDays: number;
    product?: {
      id: string;
      title: string;
      slug: string;
      coverImageUrl: string | null;
    };
  };
  stats?: {
    conversionsCount: number;
    totalEarningsAmount: string;
    currency: CurrencyCode;
  };
}

export interface ReferralResolutionResult {
  code: string;
  affiliateId: string;
  productId: string;
  productSlug: string;
  cookieDurationDays: number;
}

export interface AffiliatePerformanceSummary {
  totalLinks: number;
  totalConversions: number;
  totalCommissionsAmount: string;
  currency: CurrencyCode;
  links: AffiliateLinkRecord[];
}

export class AffiliateService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Configures or updates an affiliate program for a product (Creator action).
   * Validates ownership (IDOR defense) and commission boundaries (0-100%).
   */
  async configureProgram(
    creatorId: string,
    productId: string,
    input: {
      isActive: boolean;
      commissionPercentage: number;
      cookieDurationDays?: number;
    }
  ): Promise<AffiliateProgramRecord> {
    if (input.commissionPercentage < 0 || input.commissionPercentage > 100) {
      throw new Error('INVALID_COMMISSION: A comissão de afiliado deve estar entre 0% e 100%');
    }

    // IDOR Defense: verify creator owns the product
    const { data: product, error: prodError } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (prodError || !product) {
      throw new Error('PRODUCT_NOT_FOUND: Produto não encontrado');
    }

    if (product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador do produto pode configurar o programa de afiliados');
    }

    // Upsert into affiliate_programs (one program per product)
    const { data: existing } = await this.client
      .from('affiliate_programs')
      .select('id')
      .eq('product_id', productId)
      .maybeSingle();

    let savedProgram;
    if (existing) {
      const { data, error } = await this.client
        .from('affiliate_programs')
        .update({
          is_active: input.isActive,
          commission_percentage: input.commissionPercentage,
          cookie_duration_days: input.cookieDurationDays || 30,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error || !data) throw new Error(`Falha ao atualizar programa: ${error?.message || 'Erro'}`);
      savedProgram = data;
    } else {
      const { data, error } = await this.client
        .from('affiliate_programs')
        .insert({
          product_id: productId,
          is_active: input.isActive,
          commission_percentage: input.commissionPercentage,
          cookie_duration_days: input.cookieDurationDays || 30,
        })
        .select('*')
        .single();

      if (error || !data) throw new Error(`Falha ao criar programa: ${error?.message || 'Erro'}`);
      savedProgram = data;
    }

    return {
      id: savedProgram.id,
      productId: savedProgram.product_id,
      isActive: savedProgram.is_active,
      commissionPercentage: savedProgram.commission_percentage,
      cookieDurationDays: savedProgram.cookie_duration_days,
      createdAt: savedProgram.created_at,
    };
  }

  /**
   * Retrieves all published products with active affiliate programs for the marketplace.
   */
  async getAvailablePrograms(): Promise<AffiliateProgramRecord[]> {
    const { data, error } = await this.client
      .from('affiliate_programs')
      .select('id, product_id, is_active, commission_percentage, cookie_duration_days, created_at, products(id, title, slug, description, cover_image_url, creator_id, offers(prices(amount_minor, currency)))')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item) => {
      const prod = item.products as unknown as {
        id: string;
        title: string;
        slug: string;
        description: string | null;
        cover_image_url: string | null;
        creator_id: string;
        offers?: Array<{ prices?: Array<{ amount_minor: string; currency: string }> }>;
      } | null;

      const firstPrice = prod?.offers?.[0]?.prices?.[0];
      const currency = (firstPrice?.currency || 'AOA') as CurrencyCode;
      const priceAmount = firstPrice?.amount_minor
        ? Money.fromMinor(BigInt(firstPrice.amount_minor), currency).toMajorString()
        : '0.00';

      return {
        id: item.id,
        productId: item.product_id,
        isActive: item.is_active,
        commissionPercentage: item.commission_percentage,
        cookieDurationDays: item.cookie_duration_days,
        createdAt: item.created_at,
        product: prod
          ? {
              id: prod.id,
              title: prod.title,
              slug: prod.slug,
              description: prod.description,
              coverImageUrl: prod.cover_image_url,
              creatorId: prod.creator_id,
              priceAmount,
              currency,
            }
          : undefined,
      };
    });
  }

  /**
   * Joins an affiliate program and issues a unique referral link.
   * Prohibits self-affiliation (creator cannot affiliate with own product).
   */
  async joinProgram(
    affiliateId: string,
    programId: string
  ): Promise<AffiliateLinkRecord> {
    const { data: program, error: progError } = await this.client
      .from('affiliate_programs')
      .select('id, product_id, is_active, commission_percentage, cookie_duration_days, products(id, creator_id, title, slug, cover_image_url)')
      .eq('id', programId)
      .maybeSingle();

    if (progError || !program) {
      throw new Error('PROGRAM_NOT_FOUND: Programa de afiliados não encontrado');
    }

    if (!program.is_active) {
      throw new Error('PROGRAM_INACTIVE: Este programa de afiliação não está ativo no momento');
    }

    const prod = program.products as unknown as {
      id: string;
      creator_id: string;
      title: string;
      slug: string;
      cover_image_url: string | null;
    } | null;

    // Self-affiliation defense
    if (prod && prod.creator_id === affiliateId) {
      throw new Error('SELF_AFFILIATION_PROHIBITED: Você é o produtor deste infoproduto e não pode se auto-afiliar');
    }

    // Check if user already joined
    const { data: existingLink } = await this.client
      .from('affiliate_links')
      .select('id, program_id, affiliate_id, code, created_at')
      .eq('program_id', programId)
      .eq('affiliate_id', affiliateId)
      .maybeSingle();

    if (existingLink) {
      return {
        id: existingLink.id,
        programId: existingLink.program_id,
        affiliateId: existingLink.affiliate_id,
        code: existingLink.code,
        createdAt: existingLink.created_at,
        program: {
          commissionPercentage: program.commission_percentage,
          cookieDurationDays: program.cookie_duration_days,
          product: prod
            ? {
                id: prod.id,
                title: prod.title,
                slug: prod.slug,
                coverImageUrl: prod.cover_image_url,
              }
            : undefined,
        },
      };
    }

    // Generate unique code (e.g. aff_abc123)
    const randomHex = Math.random().toString(36).substring(2, 9);
    const code = `aff_${randomHex}`;

    const { data: newLink, error: linkError } = await this.client
      .from('affiliate_links')
      .insert({
        program_id: programId,
        affiliate_id: affiliateId,
        code,
      })
      .select('*')
      .single();

    if (linkError || !newLink) {
      throw new Error(`Falha ao gerar link de afiliação: ${linkError?.message || 'Erro'}`);
    }

    return {
      id: newLink.id,
      programId: newLink.program_id,
      affiliateId: newLink.affiliate_id,
      code: newLink.code,
      createdAt: newLink.created_at,
      program: {
        commissionPercentage: program.commission_percentage,
        cookieDurationDays: program.cookie_duration_days,
        product: prod
          ? {
              id: prod.id,
              title: prod.title,
              slug: prod.slug,
              coverImageUrl: prod.cover_image_url,
            }
          : undefined,
      },
    };
  }

  /**
   * Resolves a referral code when a user clicks /r/[code]
   */
  async resolveReferralCode(code: string): Promise<ReferralResolutionResult> {
    const { data: link, error } = await this.client
      .from('affiliate_links')
      .select('id, code, affiliate_id, affiliate_programs(is_active, cookie_duration_days, product_id, products(slug, status))')
      .eq('code', code)
      .maybeSingle();

    if (error || !link) {
      throw new Error('INVALID_REFERRAL_CODE: Código de afiliado inválido');
    }

    const prog = link.affiliate_programs as unknown as {
      is_active: boolean;
      cookie_duration_days: number;
      product_id: string;
      products: { slug: string; status: string } | null;
    } | null;

    if (!prog || !prog.is_active) {
      throw new Error('AFFILIATE_PROGRAM_INACTIVE: O programa de afiliados deste link foi desativado');
    }

    return {
      code: link.code,
      affiliateId: link.affiliate_id,
      productId: prog.product_id,
      productSlug: prog.products?.slug || '',
      cookieDurationDays: prog.cookie_duration_days || 30,
    };
  }

  /**
   * Retrieves all affiliate links and performance metrics for the affiliate user.
   */
  async getUserAffiliateLinks(affiliateId: string): Promise<AffiliateLinkRecord[]> {
    const { data, error } = await this.client
      .from('affiliate_links')
      .select('id, program_id, affiliate_id, code, created_at, affiliate_programs(commission_percentage, cookie_duration_days, products(id, title, slug, cover_image_url)), affiliate_attributions(id, affiliate_commissions(amount_minor, currency))')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item) => {
      const prog = item.affiliate_programs as unknown as {
        commission_percentage: number;
        cookie_duration_days: number;
        products: { id: string; title: string; slug: string; cover_image_url: string | null } | null;
      } | null;

      const attributions = (item.affiliate_attributions || []) as unknown as Array<{
        id: string;
        affiliate_commissions?: Array<{ amount_minor: string; currency: string }>;
      }>;

      let totalMinor = 0n;
      let currency: CurrencyCode = 'AOA';

      for (const attr of attributions) {
        if (attr.affiliate_commissions && attr.affiliate_commissions.length > 0) {
          for (const comm of attr.affiliate_commissions) {
            totalMinor += BigInt(comm.amount_minor);
            currency = comm.currency as CurrencyCode;
          }
        }
      }

      return {
        id: item.id,
        programId: item.program_id,
        affiliateId: item.affiliate_id,
        code: item.code,
        createdAt: item.created_at,
        program: {
          commissionPercentage: prog?.commission_percentage || 0,
          cookieDurationDays: prog?.cookie_duration_days || 30,
          product: prog?.products
            ? {
                id: prog.products.id,
                title: prog.products.title,
                slug: prog.products.slug,
                coverImageUrl: prog.products.cover_image_url,
              }
            : undefined,
        },
        stats: {
          conversionsCount: attributions.length,
          totalEarningsAmount: Money.fromMinor(totalMinor, currency).toMajorString(),
          currency,
        },
      };
    });
  }

  /**
   * Records frozen attribution when order is created (INV-013).
   */
  async recordAttribution(
    orderId: string,
    affiliateId: string,
    linkCode?: string
  ): Promise<string> {
    let linkId: string | null = null;
    if (linkCode) {
      const { data: link } = await this.client
        .from('affiliate_links')
        .select('id')
        .eq('code', linkCode)
        .maybeSingle();

      linkId = link?.id || null;
    }

    const { data: attr, error } = await this.client
      .from('affiliate_attributions')
      .insert({
        order_id: orderId,
        affiliate_id: affiliateId,
        link_id: linkId,
      })
      .select('id')
      .single();

    if (error || !attr) {
      throw new Error(`Falha ao registrar atribuição de afiliado: ${error?.message || 'Erro'}`);
    }

    return attr.id;
  }
}
