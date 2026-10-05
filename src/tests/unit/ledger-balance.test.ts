import { describe, it, expect, vi } from 'vitest';
import { LedgerService } from '@/modules/ledger/ledger-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('LedgerService Unit Tests (Phase 8 - Ledger & Balance Engine)', () => {
  const userId = 'creator-user-uuid-123';

  it('should return zero balance summary when user has no ledger accounts', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const ledgerService = new LedgerService(mockSupabase);
    const balance = await ledgerService.getUserBalanceSummary(userId, 'AOA');

    expect(balance.availableAmount).toBe('0.00');
    expect(balance.pendingAmount).toBe('0.00');
    expect(balance.reservedAmount).toBe('0.00');
    expect(balance.withdrawnAmount).toBe('0.00');
    expect(balance.totalEarningsAmount).toBe('0.00');
    expect(balance.availableAmountMinor).toBe(0n);
  });

  it('should correctly classify recent sales (< 7 days) as pending and mature sales as available', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ledger_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'acc-uuid-1', account_type: 'SELLER_RECEIVABLE' }],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'ledger_entries') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    // Sale mature (10 days ago): 50,000.00 AOA (5,000,000 minor)
                    {
                      id: 'entry-1',
                      direction: 'CREDIT',
                      amount_minor: 5000000n,
                      created_at: tenDaysAgo,
                      ledger_transactions: {
                        id: 'tx-1',
                        transaction_type: 'SALE',
                        reference_id: 'ord-1',
                        created_at: tenDaysAgo,
                      },
                    },
                    // Sale recent (2 days ago): 20,000.00 AOA (2,000,000 minor)
                    {
                      id: 'entry-2',
                      direction: 'CREDIT',
                      amount_minor: 2000000n,
                      created_at: twoDaysAgo,
                      ledger_transactions: {
                        id: 'tx-2',
                        transaction_type: 'SALE',
                        reference_id: 'ord-2',
                        created_at: twoDaysAgo,
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      }),
    } as unknown as SupabaseClient;

    const ledgerService = new LedgerService(mockSupabase);
    const balance = await ledgerService.getUserBalanceSummary(userId, 'AOA');

    // Total earnings: 70,000.00 AOA
    expect(balance.totalEarningsAmount).toBe('70000.00');
    expect(balance.totalEarningsMinor).toBe(7000000n);

    // Pending: 20,000.00 AOA
    expect(balance.pendingAmount).toBe('20000.00');
    expect(balance.pendingAmountMinor).toBe(2000000n);

    // Available: 50,000.00 AOA
    expect(balance.availableAmount).toBe('50000.00');
    expect(balance.availableAmountMinor).toBe(5000000n);
  });

  it('should account for reserved and withdrawn amounts with debits', async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ledger_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'acc-uuid-1', account_type: 'SELLER_RECEIVABLE' }],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'ledger_entries') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    // Sale mature: 100,000.00 AOA
                    {
                      id: 'entry-1',
                      direction: 'CREDIT',
                      amount_minor: 10000000n,
                      created_at: twentyDaysAgo,
                      ledger_transactions: {
                        id: 'tx-1',
                        transaction_type: 'SALE',
                        reference_id: 'ord-1',
                        created_at: twentyDaysAgo,
                      },
                    },
                    // Withdrawal hold (reserved): 30,000.00 AOA
                    {
                      id: 'entry-2',
                      direction: 'DEBIT',
                      amount_minor: 3000000n,
                      created_at: twentyDaysAgo,
                      ledger_transactions: {
                        id: 'tx-2',
                        transaction_type: 'WITHDRAWAL_HOLD',
                        reference_id: 'wth-1',
                        created_at: twentyDaysAgo,
                      },
                    },
                    // Withdrawal released (withdrawn): 20,000.00 AOA
                    {
                      id: 'entry-3',
                      direction: 'DEBIT',
                      amount_minor: 2000000n,
                      created_at: twentyDaysAgo,
                      ledger_transactions: {
                        id: 'tx-3',
                        transaction_type: 'WITHDRAWAL_RELEASE',
                        reference_id: 'wth-2',
                        created_at: twentyDaysAgo,
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      }),
    } as unknown as SupabaseClient;

    const ledgerService = new LedgerService(mockSupabase);
    const balance = await ledgerService.getUserBalanceSummary(userId, 'AOA');

    // Total earnings = 100,000.00
    expect(balance.totalEarningsAmount).toBe('100000.00');

    // Reserved = 30,000.00
    expect(balance.reservedAmount).toBe('30000.00');
    expect(balance.reservedAmountMinor).toBe(3000000n);

    // Withdrawn = 20,000.00
    expect(balance.withdrawnAmount).toBe('20000.00');
    expect(balance.withdrawnAmountMinor).toBe(2000000n);

    // Net balance = 100,000 - 30,000 - 20,000 = 50,000.00
    expect(balance.availableAmount).toBe('50000.00');
    expect(balance.availableAmountMinor).toBe(5000000n);
  });

  it('should fetch formatted account statement chronologically', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ledger_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'acc-uuid-1' }],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'ledger_entries') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'entry-1',
                        direction: 'CREDIT',
                        amount_minor: 1500000n,
                        created_at: '2026-10-05T12:00:00Z',
                        ledger_transactions: {
                          id: 'tx-1',
                          transaction_type: 'SALE',
                          reference_id: 'ord-abc',
                          description: 'Crédito da venda',
                          created_at: '2026-10-05T12:00:00Z',
                        },
                      },
                    ],
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

    const ledgerService = new LedgerService(mockSupabase);
    const statement = await ledgerService.getAccountStatement(userId, 'AOA');

    expect(statement).toHaveLength(1);
    expect(statement[0]).toEqual({
      id: 'entry-1',
      transactionId: 'tx-1',
      referenceId: 'ord-abc',
      transactionType: 'SALE',
      description: 'Crédito da venda',
      direction: 'CREDIT',
      amount: '15000.00',
      amountMinor: 1500000n,
      createdAt: '2026-10-05T12:00:00Z',
    });
  });
});
