import { describe, it, expect, vi } from 'vitest';
import { FunnelService } from '@/modules/funnels/funnel-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('FunnelService Unit Tests (Phase 15 - Order Bumps & Upsells)', () => {
  const creatorId = 'creator-funnel-1';
  const strangerId = 'stranger-funnel-2';
  const productId = 'prod-main-uuid';
  const bumpProductId = 'prod-bump-uuid';
  const bumpOfferId = 'offer-bump-uuid';
  const bumpId = 'bump-uuid-1';
  const upsellProductId = 'prod-upsell-uuid';
  const upsellOfferId = 'offer-upsell-uuid';
  const upsellId = 'upsell-uuid-1';

  it('rejects order bump creation from non-owner (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const funnelService = new FunnelService(mockSupabase);

    await expect(
      funnelService.createOrderBump(productId, strangerId, {
        bumpProductId,
        bumpOfferId,
        headline: 'Oferta Especial',
      })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('creates order bump for legitimate creator', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation((_col: string, val: string) => {
                  return Promise.resolve({
                    data: {
                      id: val,
                      creator_id: creatorId,
                      title: val === productId ? 'Curso Principal' : 'Ebook Bônus',
                    },
                    error: null,
                  });
                }),
              }),
            }),
          };
        }
        if (table === 'order_bumps') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: bumpId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const funnelService = new FunnelService(mockSupabase);
    const result = await funnelService.createOrderBump(productId, creatorId, {
      bumpProductId,
      bumpOfferId,
      headline: 'Leve também o Ebook Exclusivo',
      description: 'Por apenas 2.500 AOA adicionais!',
    });

    expect(result.id).toBe(bumpId);
  });

  it('retrieves active bumps with product and price details', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'order_bumps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: bumpId,
                      product_id: productId,
                      bump_product_id: bumpProductId,
                      bump_offer_id: bumpOfferId,
                      headline: 'Leve também o Ebook Exclusivo',
                      description: 'Por apenas 2.500 AOA adicionais!',
                      is_active: true,
                      created_at: new Date().toISOString(),
                      products: {
                        id: bumpProductId,
                        title: 'Ebook Exclusivo',
                        cover_image_url: 'https://cdn.example.com/cover.png',
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { amount_minor: 250000n, currency: 'AOA' }, // 2,500.00 AOA
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const funnelService = new FunnelService(mockSupabase);
    const bumps = await funnelService.getOrderBumpsForProduct(productId, 'AOA');

    expect(bumps).toHaveLength(1);
    expect(bumps[0]?.id).toBe(bumpId);
    expect(bumps[0]?.headline).toBe('Leve também o Ebook Exclusivo');
    expect(bumps[0]?.bumpOffer?.priceAmount).toBe('2500.00');
  });

  it('creates and calculates post-purchase upsell with discount percentage', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation((_col: string, val: string) =>
                  Promise.resolve({
                    data: {
                      id: val,
                      creator_id: creatorId,
                      title: 'Mentoria Premium 1-on-1',
                    },
                    error: null,
                  })
                ),
              }),
            }),
          };
        }
        if (table === 'post_purchase_upsells') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: upsellId },
                  error: null,
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: upsellId,
                      product_id: productId,
                      upsell_product_id: upsellProductId,
                      upsell_offer_id: upsellOfferId,
                      headline: 'Espere! Leve nossa mentoria VIP com 50% OFF',
                      description: 'Oferta exclusiva de 1 clique',
                      discount_percentage: 50,
                      is_active: true,
                      created_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { amount_minor: 1000000n, currency: 'AOA' }, // 10,000.00 AOA
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const funnelService = new FunnelService(mockSupabase);

    // 1. Create upsell
    const createResult = await funnelService.createUpsell(productId, creatorId, {
      upsellProductId,
      upsellOfferId,
      headline: 'Espere! Leve nossa mentoria VIP com 50% OFF',
      discountPercentage: 50,
    });
    expect(createResult.id).toBe(upsellId);

    // 2. Query upsell and verify 50% discounted price calculation
    const upsellItem = await funnelService.getUpsellForProduct(productId, 'AOA');
    expect(upsellItem).not.toBeNull();
    expect(upsellItem?.pricing?.originalAmount).toBe('10000.00');
    expect(upsellItem?.pricing?.discountedAmount).toBe('5000.00'); // 50% of 10,000.00
  });
});
