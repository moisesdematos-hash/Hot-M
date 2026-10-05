import { describe, it, expect, vi } from 'vitest';
import { PricingEngine } from '@/modules/pricing/pricing-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Pricing Security, Invariants & Coupon Abuse Prevention (INV-001, Section 26)', () => {
  it('ATTACK SCENARIO: Expired coupon must be rejected', async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Expired yesterday

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        amount_minor: 500000n,
                        offer_id: 'off-1',
                        offers: { product_id: 'prod-1' },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'coupons') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'coup-exp',
                      code: 'EXPIRED10',
                      discount_type: 'PERCENTAGE',
                      discount_value: 10,
                      is_active: true,
                      valid_until: expiredDate,
                    },
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

    const pricingEngine = new PricingEngine(mockSupabase);

    await expect(
      pricingEngine.calculateQuote({
        offerId: 'off-1',
        currency: 'AOA',
        couponCode: 'EXPIRED10',
        orderBumpOfferIds: [],
      })
    ).rejects.toThrow("Cupom 'EXPIRED10' expirado");
  });

  it('ATTACK SCENARIO: Coupon with max uses reached must be rejected', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        amount_minor: 500000n,
                        offer_id: 'off-1',
                        offers: { product_id: 'prod-1' },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'coupons') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'coup-max',
                      code: 'SOLDOUT',
                      discount_type: 'PERCENTAGE',
                      discount_value: 50,
                      is_active: true,
                      times_used: 10,
                      max_uses: 10, // Full
                    },
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

    const pricingEngine = new PricingEngine(mockSupabase);

    await expect(
      pricingEngine.calculateQuote({
        offerId: 'off-1',
        currency: 'AOA',
        couponCode: 'SOLDOUT',
        orderBumpOfferIds: [],
      })
    ).rejects.toThrow("Cupom 'SOLDOUT' atingiu o limite máximo de utilização");
  });

  it('EXPIRATION ENFORCEMENT: Expired quote must be rejected when fetched', async () => {
    const pastDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins ago

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pricing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'quote-old',
                    offer_id: 'off-1',
                    currency: 'AOA',
                    base_amount_minor: 1000000n,
                    discount_amount_minor: 0n,
                    order_bumps_amount_minor: 0n,
                    total_amount_minor: 1000000n,
                    expires_at: pastDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const pricingEngine = new PricingEngine(mockSupabase);

    await expect(pricingEngine.getValidQuote('quote-old')).rejects.toThrow(
      'QUOTE_EXPIRED: A cotação expirou'
    );
  });
});
