import { describe, it, expect, vi } from 'vitest';
import { AffiliateService } from '@/modules/affiliates/affiliate-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Affiliate Lifecycle & Attribution Integration Tests (Phase 12 - INV-013)', () => {
  const creatorId = 'creator-canonical-uuid';
  const affiliateId = 'affiliate-canonical-uuid';
  const productId = 'prod-canonical-uuid';
  const programId = 'prog-canonical-uuid';

  it('runs full cycle: configure program -> join -> resolve -> attribute order (INV-013)', async () => {
    let programState = {
      id: programId,
      product_id: productId,
      is_active: true,
      commission_percentage: 25,
      cookie_duration_days: 30,
      created_at: new Date().toISOString(),
    };

    let linkState = {
      id: 'link-uuid-1',
      program_id: programId,
      affiliate_id: affiliateId,
      code: 'aff_test123',
      created_at: new Date().toISOString(),
    };

    const attributions: Array<{ id: string; order_id: string; affiliate_id: string }> = [];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: productId,
                    creator_id: creatorId,
                    title: 'Curso Completo de Negócios',
                    slug: 'curso-negocios',
                    status: 'PUBLISHED',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'affiliate_programs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'product_id') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: programState.product_id === val ? programState : null,
                      error: null,
                    }),
                  };
                }
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      ...programState,
                      products: {
                        id: productId,
                        creator_id: creatorId,
                        title: 'Curso Completo de Negócios',
                        slug: 'curso-negocios',
                      },
                    },
                    error: null,
                  }),
                };
              }),
            }),
            insert: vi.fn().mockImplementation((data: typeof programState) => {
              programState = { ...programState, ...data };
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: programState, error: null }),
                }),
              };
            }),
            update: vi.fn().mockImplementation((data: Partial<typeof programState>) => {
              programState = { ...programState, ...data };
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: programState, error: null }),
                  }),
                }),
              };
            }),
          };
        }

        if (table === 'affiliate_links') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, _val: string) => {
                if (col === 'program_id') {
                  return {
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  };
                }
                if (col === 'code') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        ...linkState,
                        affiliate_programs: {
                          ...programState,
                          products: { slug: 'curso-negocios', status: 'PUBLISHED' },
                        },
                      },
                      error: null,
                    }),
                  };
                }
                if (col === 'affiliate_id') {
                  return {
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          ...linkState,
                          affiliate_programs: {
                            commission_percentage: programState.commission_percentage,
                            cookie_duration_days: programState.cookie_duration_days,
                            products: { id: productId, title: 'Curso Completo', slug: 'curso-negocios', cover_image_url: null },
                          },
                          affiliate_attributions: attributions,
                        },
                      ],
                      error: null,
                    }),
                  };
                }
                return {};
              }),
            }),
            insert: vi.fn().mockImplementation((data: typeof linkState) => {
              linkState = { ...linkState, ...data };
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: linkState, error: null }),
                }),
              };
            }),
          };
        }

        if (table === 'affiliate_attributions') {
          return {
            insert: vi.fn().mockImplementation((data: { order_id: string; affiliate_id: string }) => {
              const attr = { id: `attr-${Date.now()}`, ...data };
              attributions.push(attr);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: attr, error: null }),
                }),
              };
            }),
          };
        }

        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AffiliateService(mockSupabase);

    // 1. Creator configures affiliate program
    const prog = await service.configureProgram(creatorId, productId, {
      isActive: true,
      commissionPercentage: 25,
      cookieDurationDays: 30,
    });
    expect(prog.commissionPercentage).toBe(25);
    expect(prog.isActive).toBe(true);

    // 2. Affiliate joins program
    const link = await service.joinProgram(affiliateId, programId);
    expect(link.affiliateId).toBe(affiliateId);
    expect(link.code).toBeDefined();

    // 3. Buyer clicks link -> referral resolved
    const resolved = await service.resolveReferralCode(link.code);
    expect(resolved.affiliateId).toBe(affiliateId);
    expect(resolved.productSlug).toBe('curso-negocios');
    expect(resolved.cookieDurationDays).toBe(30);

    // 4. Order created -> record frozen attribution (INV-013)
    const attributionId = await service.recordAttribution('ord-canonical-1', affiliateId, link.code);
    expect(attributionId).toBeDefined();
    expect(attributions).toHaveLength(1);
    expect(attributions[0]?.affiliate_id).toBe(affiliateId);

    // 5. Affiliate lists links -> 1 conversion reported
    const userLinks = await service.getUserAffiliateLinks(affiliateId);
    expect(userLinks).toHaveLength(1);
    expect(userLinks[0]?.stats?.conversionsCount).toBe(1);
  });
});
