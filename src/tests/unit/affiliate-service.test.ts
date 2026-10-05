import { describe, it, expect, vi } from 'vitest';
import { AffiliateService } from '@/modules/affiliates/affiliate-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('AffiliateService Unit Tests (Phase 12 - Affiliate Engine)', () => {
  const creatorId = 'creator-uuid-123';
  const affiliateId = 'affiliate-uuid-456';
  const productId = 'prod-uuid-789';
  const programId = 'prog-uuid-001';

  it('should reject program configuration with invalid commission percentage (>100 or <0)', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new AffiliateService(mockSupabase);

    await expect(
      service.configureProgram(creatorId, productId, {
        isActive: true,
        commissionPercentage: 105, // Invalid > 100%
      })
    ).rejects.toThrow('INVALID_COMMISSION');
  });

  it('should reject program configuration by non-owner (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: productId, creator_id: 'real-creator-uuid' }, // Belongs to real-creator, not creatorId
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new AffiliateService(mockSupabase);

    await expect(
      service.configureProgram(creatorId, productId, {
        isActive: true,
        commissionPercentage: 20,
      })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('should prohibit creator from affiliating with own product (self-affiliation defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: programId,
                product_id: productId,
                is_active: true,
                commission_percentage: 20,
                cookie_duration_days: 30,
                products: { id: productId, creator_id: creatorId }, // Creator attempting to join!
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new AffiliateService(mockSupabase);

    await expect(
      service.joinProgram(creatorId, programId)
    ).rejects.toThrow('SELF_AFFILIATION_PROHIBITED');
  });

  it('should generate unique referral code upon joining an active program', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'affiliate_programs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: programId,
                    product_id: productId,
                    is_active: true,
                    commission_percentage: 30,
                    cookie_duration_days: 30,
                    products: { id: productId, creator_id: 'other-creator', title: 'Curso Pro' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'affiliate_links') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No existing link
                }),
              }),
            }),
            insert: vi.fn().mockImplementation((data: { code: string }) => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'link-new-uuid',
                    program_id: programId,
                    affiliate_id: affiliateId,
                    code: data.code,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            })),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new AffiliateService(mockSupabase);
    const link = await service.joinProgram(affiliateId, programId);

    expect(link.code).toMatch(/^aff_[a-z0-9]+$/);
    expect(link.program?.commissionPercentage).toBe(30);
  });

  it('should resolve referral code with product info and cookie configuration', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'link-1',
                code: 'aff_success',
                affiliate_id: affiliateId,
                affiliate_programs: {
                  is_active: true,
                  cookie_duration_days: 30,
                  product_id: productId,
                  products: { slug: 'curso-financas-pessoais', status: 'PUBLISHED' },
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new AffiliateService(mockSupabase);
    const resolved = await service.resolveReferralCode('aff_success');

    expect(resolved.code).toBe('aff_success');
    expect(resolved.affiliateId).toBe(affiliateId);
    expect(resolved.productSlug).toBe('curso-financas-pessoais');
    expect(resolved.cookieDurationDays).toBe(30);
  });
});
