import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { SponsorshipService, SPONSORSHIP_PLANS } from '@/modules/marketing/sponsorship-service';

describe('SponsorshipService Unit Tests (Phase 22 - Hotplace Ads & Boost)', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  let service: SponsorshipService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SponsorshipService(mockSupabase as unknown as SupabaseClient);
  });

  it('defines 4 valid sponsorship plans with correct pricing', () => {
    expect(SPONSORSHIP_PLANS['3_DAYS']!.priceMinor).toBe(250000n);
    expect(SPONSORSHIP_PLANS['7_DAYS']!.priceMinor).toBe(500000n);
    expect(SPONSORSHIP_PLANS['15_DAYS']!.priceMinor).toBe(900000n);
    expect(SPONSORSHIP_PLANS['30_DAYS']!.priceMinor).toBe(1500000n);
    expect(SPONSORSHIP_PLANS['7_DAYS']!.isPopular).toBe(true);
  });

  it('rejects invalid plan type', async () => {
    await expect(
      service.createSponsorship({
        creatorId: 'c-1',
        productId: 'p-1',
        planType: 'INVALID_PLAN',
      })
    ).rejects.toThrow(/Plano inválido/);
  });

  it('rejects sponsorship if creator does not own product', async () => {
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'p-1', title: 'Curso', creator_id: 'other-creator' },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProductQuery);

    await expect(
      service.createSponsorship({
        creatorId: 'c-1',
        productId: 'p-1',
        planType: '7_DAYS',
      })
    ).rejects.toThrow(/ACESSO_NEGADO/);
  });

  it('rejects sponsorship when creator balance is insufficient', async () => {
    // 1. Ownership ok
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'p-1', title: 'Curso Top', creator_id: 'c-1' },
        error: null,
      }),
    };

    // 2. Ledger account returns low balance (e.g. 1000 Kz = 100000 minor, needed 500000)
    const mockAccountsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    };
    mockAccountsQuery.eq
      .mockReturnValueOnce(mockAccountsQuery)
      .mockReturnValueOnce(
        Promise.resolve({
          data: [{ id: 'acc-1', account_type: 'CREATOR_BALANCE' }],
          error: null,
        })
      );

    const mockEntriesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'e-1',
            direction: 'CREDIT',
            amount_minor: 100000,
            ledger_transactions: { transaction_type: 'SALE' },
          },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') return mockProductQuery;
      if (table === 'ledger_accounts') return mockAccountsQuery;
      if (table === 'ledger_entries') return mockEntriesQuery;
      return {};
    });

    await expect(
      service.createSponsorship({
        creatorId: 'c-1',
        productId: 'p-1',
        planType: '7_DAYS',
      })
    ).rejects.toThrow(/SALDO_INSUFICIENTE/);
  });
});
