import { SupabaseClient } from '@supabase/supabase-js';

export interface CheckoutSettings {
  productId: string;
  showCountdownTimer: boolean;
  countdownMinutes: number;
  timerHeadline: string;
  showSecurityBadges: boolean;
  guaranteeDays: number;
  showSocialProof: boolean;
  primaryColor: string;
  bannerUrl: string | null;
}

export interface TestimonialItem {
  id: string;
  productId: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  rating: number;
  avatarUrl: string | null;
  createdAt: string;
}

export const DEFAULT_CHECKOUT_SETTINGS: Omit<CheckoutSettings, 'productId'> = {
  showCountdownTimer: true,
  countdownMinutes: 15,
  timerHeadline: 'Oferta com tempo limitado! Garanta sua vaga com desconto:',
  showSecurityBadges: true,
  guaranteeDays: 7,
  showSocialProof: true,
  primaryColor: '#2563eb',
  bannerUrl: null,
};

export class CheckoutCustomizerService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Retrieves checkout customization settings for a product.
   * If not yet customized, returns default high-converting settings.
   */
  async getCheckoutSettings(productId: string): Promise<CheckoutSettings> {
    const { data: record } = await this.client
      .from('checkout_settings')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (!record) {
      return {
        productId,
        ...DEFAULT_CHECKOUT_SETTINGS,
      };
    }

    return {
      productId: record.product_id,
      showCountdownTimer: record.show_countdown_timer,
      countdownMinutes: record.countdown_minutes,
      timerHeadline: record.timer_headline,
      showSecurityBadges: record.show_security_badges,
      guaranteeDays: record.guarantee_days,
      showSocialProof: record.show_social_proof,
      primaryColor: record.primary_color || '#2563eb',
      bannerUrl: record.banner_url || null,
    };
  }

  /**
   * Upserts checkout customization settings.
   * Defesa IDOR: Only creator of the product can modify checkout settings.
   */
  async upsertCheckoutSettings(
    productId: string,
    creatorId: string,
    settings: Partial<Omit<CheckoutSettings, 'productId'>>
  ): Promise<CheckoutSettings> {
    // 1. Verify creator ownership
    const { data: product } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product || product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador legítimo pode personalizar o checkout deste produto.');
    }

    // 2. Prepare payload
    const payload = {
      product_id: productId,
      show_countdown_timer: settings.showCountdownTimer ?? DEFAULT_CHECKOUT_SETTINGS.showCountdownTimer,
      countdown_minutes: settings.countdownMinutes ?? DEFAULT_CHECKOUT_SETTINGS.countdownMinutes,
      timer_headline: settings.timerHeadline ?? DEFAULT_CHECKOUT_SETTINGS.timerHeadline,
      show_security_badges: settings.showSecurityBadges ?? DEFAULT_CHECKOUT_SETTINGS.showSecurityBadges,
      guarantee_days: settings.guaranteeDays ?? DEFAULT_CHECKOUT_SETTINGS.guaranteeDays,
      show_social_proof: settings.showSocialProof ?? DEFAULT_CHECKOUT_SETTINGS.showSocialProof,
      primary_color: settings.primaryColor ?? DEFAULT_CHECKOUT_SETTINGS.primaryColor,
      banner_url: settings.bannerUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await this.client
      .from('checkout_settings')
      .upsert(payload, { onConflict: 'product_id' })
      .select('*')
      .single();

    if (error || !upserted) {
      throw new Error(`SETTINGS_UPDATE_FAILED: ${error?.message || 'Erro ao salvar configurações.'}`);
    }

    return {
      productId: upserted.product_id,
      showCountdownTimer: upserted.show_countdown_timer,
      countdownMinutes: upserted.countdown_minutes,
      timerHeadline: upserted.timer_headline,
      showSecurityBadges: upserted.show_security_badges,
      guaranteeDays: upserted.guarantee_days,
      showSocialProof: upserted.show_social_proof,
      primaryColor: upserted.primary_color,
      bannerUrl: upserted.banner_url,
    };
  }

  /**
   * Retrieves testimonials for a product.
   */
  async getTestimonials(productId: string): Promise<TestimonialItem[]> {
    const { data: records } = await this.client
      .from('product_testimonials')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (!records) return [];

    return records.map((r) => ({
      id: r.id,
      productId: r.product_id,
      authorName: r.author_name,
      authorRole: r.author_role,
      content: r.content,
      rating: r.rating,
      avatarUrl: r.avatar_url,
      createdAt: r.created_at,
    }));
  }

  /**
   * Creates a testimonial for a product.
   * Defesa IDOR: Only creator of the product can add testimonials.
   */
  async createTestimonial(
    productId: string,
    creatorId: string,
    data: {
      authorName: string;
      authorRole?: string;
      content: string;
      rating?: number;
      avatarUrl?: string;
    }
  ): Promise<TestimonialItem> {
    if (!data.authorName || !data.content) {
      throw new Error('INVALID_DATA: Nome do autor e conteúdo do depoimento são obrigatórios.');
    }

    // IDOR verification
    const { data: product } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product || product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Permissão negada para adicionar depoimento neste produto.');
    }

    const rating = Math.min(Math.max(data.rating ?? 5, 1), 5);

    const { data: created, error } = await this.client
      .from('product_testimonials')
      .insert({
        product_id: productId,
        author_name: data.authorName.trim(),
        author_role: data.authorRole?.trim() || null,
        content: data.content.trim(),
        rating,
        avatar_url: data.avatarUrl?.trim() || null,
      })
      .select('*')
      .single();

    if (error || !created) {
      throw new Error(`TESTIMONIAL_CREATION_FAILED: ${error?.message || 'Erro ao adicionar depoimento.'}`);
    }

    return {
      id: created.id,
      productId: created.product_id,
      authorName: created.author_name,
      authorRole: created.author_role,
      content: created.content,
      rating: created.rating,
      avatarUrl: created.avatar_url,
      createdAt: created.created_at,
    };
  }

  /**
   * Deletes a testimonial.
   * Defesa IDOR: Only creator of the parent product can delete.
   */
  async deleteTestimonial(testimonialId: string, creatorId: string): Promise<boolean> {
    const { data: testimonial } = await this.client
      .from('product_testimonials')
      .select('id, product_id, products!product_testimonials_product_id_fkey(creator_id)')
      .eq('id', testimonialId)
      .maybeSingle();

    if (!testimonial) {
      // Fallback
      const { data: rawTestimonial } = await this.client
        .from('product_testimonials')
        .select('id, product_id')
        .eq('id', testimonialId)
        .maybeSingle();

      if (!rawTestimonial) {
        throw new Error('TESTIMONIAL_NOT_FOUND: Depoimento não encontrado.');
      }

      const { data: prod } = await this.client
        .from('products')
        .select('creator_id')
        .eq('id', rawTestimonial.product_id)
        .maybeSingle();

      if (prod?.creator_id !== creatorId) {
        throw new Error('FORBIDDEN: Permissão negada para excluir este depoimento.');
      }
    } else {
      const prodRel = testimonial.products as unknown as { creator_id: string } | null;
      if (prodRel?.creator_id !== creatorId) {
        throw new Error('FORBIDDEN: Permissão negada para excluir este depoimento.');
      }
    }

    const { error } = await this.client
      .from('product_testimonials')
      .delete()
      .eq('id', testimonialId);

    if (error) {
      throw new Error(`DELETE_FAILED: ${error.message}`);
    }

    return true;
  }
}
