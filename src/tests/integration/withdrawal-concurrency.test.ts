import { describe, it, expect, vi } from 'vitest';
import { WithdrawalService } from '@/modules/withdrawals/withdrawal-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Withdrawal Concurrency & Race Condition Defense (Phase 10 - E2E/Stress)', () => {
  const userId = 'creator-concurrency-uuid';
  const methodId = 'method-concurrency-uuid';
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();

  it('strictly allows only ONE of two concurrent withdrawal requests when balance cannot cover both', async () => {
    // Initial balance: 10,000.00 AOA (1,000,000 minor)
    const ledgerEntries: Array<{
      id: string;
      direction: 'CREDIT' | 'DEBIT';
      amount_minor: bigint;
      created_at: string;
      ledger_transactions: {
        id: string;
        transaction_type: string;
        reference_id: string;
        created_at: string;
      };
    }> = [
      {
        id: 'initial-sale-credit',
        direction: 'CREDIT',
        amount_minor: 1000000n, // 10,000.00 AOA
        created_at: twentyDaysAgo,
        ledger_transactions: {
          id: 'tx-init',
          transaction_type: 'SALE',
          reference_id: 'ord-initial',
          created_at: twentyDaysAgo,
        },
      },
    ];

    let withdrawalCounter = 0;

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'withdrawal_methods') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: methodId,
                    user_id: userId,
                    bank_name: 'BAI',
                    account_number: 'AO06.999',
                    holder_name: 'Concurrent User',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'ledger_accounts') {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn().mockReturnValue(chain);
          chain.eq = vi.fn().mockReturnValue(chain);
          chain.is = vi.fn().mockReturnValue(chain);
          chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'acc-user' }, error: null });
          chain.then = (resolve: (val: unknown) => unknown) =>
            Promise.resolve({
              data: [{ id: 'acc-user', account_type: 'SELLER_RECEIVABLE' }],
              error: null,
            }).then(resolve);
          return chain;
        }

        if (table === 'ledger_entries') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockImplementation(() =>
                  Promise.resolve({
                    data: [...ledgerEntries],
                    error: null,
                  })
                ),
              }),
            }),
            insert: vi.fn().mockImplementation((entries: Array<{ direction: 'CREDIT' | 'DEBIT'; amount_minor: string }>) => {
              for (const e of entries) {
                // If this is user's debit entry, record it in ledgerEntries to affect balance
                if (e.direction === 'DEBIT') {
                  ledgerEntries.push({
                    id: `entry-${Date.now()}-${Math.random()}`,
                    direction: 'DEBIT',
                    amount_minor: BigInt(e.amount_minor),
                    created_at: new Date().toISOString(),
                    ledger_transactions: {
                      id: `tx-hold-${Date.now()}`,
                      transaction_type: 'WITHDRAWAL_HOLD',
                      reference_id: `ref-${Date.now()}`,
                      created_at: new Date().toISOString(),
                    },
                  });
                }
              }
              return Promise.resolve({ error: null });
            }),
          };
        }

        if (table === 'withdrawals') {
          return {
            insert: vi.fn().mockImplementation((data: { amount_minor: string; currency: string }) => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: `wth-${++withdrawalCounter}`,
                    user_id: userId,
                    withdrawal_method_id: methodId,
                    amount_minor: data.amount_minor,
                    currency: data.currency,
                    status: 'REQUESTED',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            })),
          };
        }

        if (table === 'ledger_transactions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'tx-hold-1' }, error: null }),
              }),
            }),
          };
        }

        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }

        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new WithdrawalService(mockSupabase);

    // Two concurrent withdrawal requests of 8,000.00 AOA (800,000 minor)
    // Balance is 10,000.00 AOA.
    // Exactly ONE must succeed and the other must be rejected with INSUFFICIENT_FUNDS!
    const results = await Promise.allSettled([
      service.requestWithdrawal(userId, {
        withdrawalMethodId: methodId,
        amountMinor: 800000n, // 8,000.00 AOA
        currency: 'AOA',
      }),
      service.requestWithdrawal(userId, {
        withdrawalMethodId: methodId,
        amountMinor: 800000n, // 8,000.00 AOA
        currency: 'AOA',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    if (rejected[0]?.status === 'rejected') {
      expect((rejected[0].reason as Error).message).toContain('INSUFFICIENT_FUNDS');
    }
  });
});
