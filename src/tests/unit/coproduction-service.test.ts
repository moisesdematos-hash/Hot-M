import { describe, it, expect, vi } from 'vitest';
import { CoproductionService } from '@/modules/coproduction/coproduction-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('CoproductionService Unit Tests (Phase 13 - Coproduction Engine)', () => {
  const creatorId = 'creator-uuid-123';
  const partnerId = 'partner-uuid-456';
  const productId = 'prod-uuid-789';

  it('should reject invalid percentage (<=0 or >=100)', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new CoproductionService(mockSupabase);

    await expect(
      service.addCoProducer(creatorId, productId, 'partner@hot-m.com', 0)
    ).rejects.toThrow('INVALID_PERCENTAGE');

    await expect(
      service.addCoProducer(creatorId, productId, 'partner@hot-m.com', 100)
    ).rejects.toThrow('INVALID_PERCENTAGE');
  });

  it('should prohibit self-coproduction (creator cannot invite self)', async () => {
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
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: creatorId, email: 'creator@hot-m.com' }, // Same ID as creator!
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CoproductionService(mockSupabase);

    await expect(
      service.addCoProducer(creatorId, productId, 'creator@hot-m.com', 20)
    ).rejects.toThrow('SELF_COPRODUCTION_PROHIBITED');
  });

  it('should reject co-producer percentage if sum of shares exceeds 100%', async () => {
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
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: partnerId, email: 'partner@hot-m.com' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'revenue_shares') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ partner_id: 'other-partner', percentage: 70 }], // Already 70% allocated
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CoproductionService(mockSupabase);

    // 70% existing + 35% requested = 105% (> 100%) -> must reject!
    await expect(
      service.addCoProducer(creatorId, productId, 'partner@hot-m.com', 35)
    ).rejects.toThrow('PERCENTAGE_EXCEEDS_LIMIT');
  });

  it('should correctly calculate minor unit split with zero remainder leakage (INV-006)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { partner_id: 'partner-a', percentage: 20 },
              { partner_id: 'partner-b', percentage: 10 },
            ],
            error: null,
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new CoproductionService(mockSupabase);
    const netPoolMinor = 1000000n; // 10,000.00 AOA

    const split = await service.calculateSplit(productId, netPoolMinor);

    expect(split.partners).toHaveLength(2);
    expect(split.partners[0]?.amountMinor).toBe(200000n); // 20% of 1,000,000 = 200,000
    expect(split.partners[1]?.amountMinor).toBe(100000n); // 10% of 1,000,000 = 100,000
    expect(split.primaryCreatorAmountMinor).toBe(700000n); // 70% of 1,000,000 = 700,000

    // Strict balance: Sum of partners + primary creator == netPool
    const totalDistributed =
      split.partners[0]!.amountMinor +
      split.partners[1]!.amountMinor +
      split.primaryCreatorAmountMinor;
    expect(totalDistributed).toBe(netPoolMinor);
  });
});
