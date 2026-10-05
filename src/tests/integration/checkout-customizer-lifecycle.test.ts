import { describe, it, expect, vi } from 'vitest';
import { CheckoutCustomizerService } from '@/modules/checkout/checkout-customizer-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Checkout Customizer & Social Proof Lifecycle (Phase 16 - Conversion Optimization)', () => {
  const creatorId = 'creator-customizer-uuid';
  const intruderId = 'intruder-customizer-uuid';
  const productId = 'prod-customizer-e2e-uuid';

  // In-memory store
  let savedSettings: Record<string, unknown> | null = null;
  const testimonialsStore: Array<{
    id: string;
    product_id: string;
    author_name: string;
    author_role: string | null;
    content: string;
    rating: number;
    avatar_url: string | null;
    created_at: string;
  }> = [];

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_col: string, val: string) => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: val === productId ? { id: productId, creator_id: creatorId } : null,
                error: null,
              }),
            })),
          }),
        };
      }

      if (table === 'checkout_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  data: savedSettings,
                  error: null,
                })
              ),
            }),
          }),
          upsert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            savedSettings = { ...data };
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: savedSettings,
                  error: null,
                }),
              }),
            };
          }),
        };
      }

      if (table === 'product_testimonials') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  data: testimonialsStore,
                  error: null,
                })
              ),
            }),
          }),
          insert: vi.fn().mockImplementation((rec: {
            product_id: string;
            author_name: string;
            author_role?: string;
            content: string;
            rating: number;
            avatar_url?: string;
          }) => {
            const item = {
              id: `testim-${testimonialsStore.length + 1}`,
              product_id: rec.product_id,
              author_name: rec.author_name,
              author_role: rec.author_role || null,
              content: rec.content,
              rating: rec.rating,
              avatar_url: rec.avatar_url || null,
              created_at: new Date().toISOString(),
            };
            testimonialsStore.push(item);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: item,
                  error: null,
                }),
              }),
            };
          }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  it('orchestrates complete checkout customizer flow: creator updates timer/badges -> adds testimonials -> intruder is blocked -> buyer loads high-converting checkout', async () => {
    const service = new CheckoutCustomizerService(mockSupabase);

    // 1. Initial state returns defaults
    const initialSettings = await service.getCheckoutSettings(productId);
    expect(initialSettings.showCountdownTimer).toBe(true);
    expect(initialSettings.countdownMinutes).toBe(15);
    expect(initialSettings.guaranteeDays).toBe(7);

    // 2. Intruder attempts to tamper with checkout settings -> BLOCKED
    await expect(
      service.upsertCheckoutSettings(productId, intruderId, {
        countdownMinutes: 99,
      })
    ).rejects.toThrow('FORBIDDEN');

    // 3. Creator personalizes checkout: 25 minutes timer, 30 days guarantee, Emerald color
    const custom = await service.upsertCheckoutSettings(productId, creatorId, {
      countdownMinutes: 25,
      timerHeadline: 'Vagas exclusivas terminam em breve!',
      guaranteeDays: 30,
      primaryColor: '#059669',
      showSocialProof: true,
    });
    expect(custom.countdownMinutes).toBe(25);
    expect(custom.guaranteeDays).toBe(30);
    expect(custom.primaryColor).toBe('#059669');

    // 4. Intruder tries to inject testimonial -> BLOCKED
    await expect(
      service.createTestimonial(productId, intruderId, {
        authorName: 'Fake User',
        content: 'Spam review',
      })
    ).rejects.toThrow('FORBIDDEN');

    // 5. Creator publishes real customer testimonials
    await service.createTestimonial(productId, creatorId, {
      authorName: 'Maria Santos',
      authorRole: 'Empreendedora Digital (Luanda)',
      content: 'O curso mudou completamente meus resultados.',
      rating: 5,
    });

    await service.createTestimonial(productId, creatorId, {
      authorName: 'Paulo Silva',
      authorRole: 'Desenvolvedor Frontend',
      content: 'Excelente didática e material de apoio impecável.',
      rating: 5,
    });

    // 6. Buyer loads checkout page: verifies all conversion triggers are available
    const [buyerSettings, buyerTestimonials] = await Promise.all([
      service.getCheckoutSettings(productId),
      service.getTestimonials(productId),
    ]);

    expect(buyerSettings.countdownMinutes).toBe(25);
    expect(buyerSettings.guaranteeDays).toBe(30);
    expect(buyerSettings.primaryColor).toBe('#059669');
    expect(buyerTestimonials).toHaveLength(2);
    expect(buyerTestimonials[0]?.authorName).toBe('Maria Santos');
    expect(buyerTestimonials[1]?.authorName).toBe('Paulo Silva');
  });
});
