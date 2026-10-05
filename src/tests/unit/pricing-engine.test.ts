import { describe, it, expect, vi } from 'vitest';
import { PricingEngine } from '@/modules/pricing/pricing-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('PricingEngine Core Calculations (Section 26 & INV-001)', () => {
  it('should compute exact base quote without discount or bumps', async () => {
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
                        amount_minor: 1000000n, // 10,000.00 AOA
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
        if (table === 'pricing_quotes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quote-uuid-001' },
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

    const quote = await pricingEngine.calculateQuote({
      offerId: 'off-1',
      currency: 'AOA',
      orderBumpOfferIds: [],
    });

    expect(quote.quoteId).toBe('quote-uuid-001');
    expect(quote.baseAmount).toBe('10000.00');
    expect(quote.discountAmount).toBe('0.00');
    expect(quote.totalAmount).toBe('10000.00');
    expect(quote.totalAmountMinor).toBe(1000000n);
  });

  it('should correctly apply percentage coupon and order bumps', async () => {
    // Base: 10,000.00 AOA
    // Cupom 20% OFF: -2,000.00 AOA
    // Order Bump: +3,000.00 AOA
    // Total esperado: 11,000.00 AOA
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: string) => ({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockImplementation(async () => {
                      if (val === 'bump-1') {
                        return {
                          data: {
                            amount_minor: 300000n, // 3,000.00 AOA
                            offer_id: 'bump-1',
                            offers: { product_id: 'prod-2' },
                          },
                          error: null,
                        };
                      }
                      return {
                        data: {
                          amount_minor: 1000000n, // 10,000.00 AOA
                          offer_id: 'off-base',
                          offers: { product_id: 'prod-1' },
                        },
                        error: null,
                      };
                    }),
                  }),
                }),
              })),
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
                      id: 'coup-uuid-20',
                      code: 'PROMO20',
                      discount_type: 'PERCENTAGE',
                      discount_value: 20, // 20%
                      is_active: true,
                      times_used: 5,
                      max_uses: 100,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'pricing_quotes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'quote-uuid-002' },
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

    const quote = await pricingEngine.calculateQuote({
      offerId: 'off-base',
      currency: 'AOA',
      couponCode: 'PROMO20',
      orderBumpOfferIds: ['bump-1'],
    });

    expect(quote.baseAmount).toBe('10000.00');
    expect(quote.discountAmount).toBe('2000.00');
    expect(quote.orderBumpsAmount).toBe('3000.00');
    expect(quote.totalAmount).toBe('11000.00');
    expect(quote.totalAmountMinor).toBe(1100000n);
  });
});
