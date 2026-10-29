import { describe, it, expect, vi } from 'vitest';
import { WithdrawalService } from '@/modules/withdrawals/withdrawal-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('WithdrawalService Unit Tests (Phase 10 - Withdrawals Engine)', () => {
  const userId = 'creator-uuid-123';
  const methodId = 'method-uuid-456';

  it('should reject withdrawal below minimum threshold (5,000 AOA)', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new WithdrawalService(mockSupabase);

    await expect(
      service.requestWithdrawal(userId, {
        withdrawalMethodId: methodId,
        amountMinor: 200000n, // 2,000.00 AOA (< 5,000.00)
        currency: 'AOA',
      })
    ).rejects.toThrow('MINIMUM_WITHDRAWAL_NOT_MET');
  });

  it('should reject withdrawal when available balance is insufficient', async () => {
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
                    account_number: 'AO06.123',
                    holder_name: 'Creator',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ledger_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'acc-1', account_type: 'SELLER_RECEIVABLE' }],
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
                  data: [], // No sales -> balance = 0
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new WithdrawalService(mockSupabase);

    await expect(
      service.requestWithdrawal(userId, {
        withdrawalMethodId: methodId,
        amountMinor: 1000000n, // 10,000.00 AOA
        currency: 'AOA',
      })
    ).rejects.toThrow('INSUFFICIENT_FUNDS');
  });

  it('should transition status on approval and record audit log', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'withdrawals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'wth-1', status: 'REQUESTED' },
                  error: null,
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        if (table === 'audit_logs') {
          return { insert: mockAuditInsert };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new WithdrawalService(mockSupabase);
    await service.approveWithdrawal('wth-1', 'finance-officer-uuid');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED', reviewed_by: 'finance-officer-uuid' })
    );
    expect(mockAuditInsert).toHaveBeenCalled();
  });

  it('should execute double-entry ledger reversal upon rejection', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockLedgerTxInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'tx-rev-1' }, error: null }),
      }),
    });
    const mockLedgerEntriesInsert = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'withdrawals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'wth-1',
                    user_id: userId,
                    amount_minor: 500000n,
                    currency: 'AOA',
                    status: 'REQUESTED',
                  },
                  error: null,
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        if (table === 'ledger_accounts') {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn().mockReturnValue(chain);
          chain.eq = vi.fn().mockReturnValue(chain);
          chain.is = vi.fn().mockReturnValue(chain);
          chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'acc-found' }, error: null });
          return chain;
        }
        if (table === 'ledger_transactions') {
          return { insert: mockLedgerTxInsert };
        }
        if (table === 'ledger_entries') {
          return { insert: mockLedgerEntriesInsert };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new WithdrawalService(mockSupabase);
    await service.rejectWithdrawal('wth-1', 'IBAN inválido no sistema bancário', 'finance-officer-uuid');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED', rejection_reason: 'IBAN inválido no sistema bancário' })
    );
    expect(mockLedgerTxInsert).toHaveBeenCalledWith(
      expect.objectContaining({ transaction_type: 'WITHDRAWAL_REVERSAL' })
    );
    expect(mockLedgerEntriesInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ direction: 'DEBIT' }),
        expect.objectContaining({ direction: 'CREDIT' }),
      ])
    );
  });

  it('createWithdrawalMethod rejects invalid Angolan IBAN with detailed reason', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new WithdrawalService(mockSupabase);

    await expect(
      service.createWithdrawalMethod(userId, {
        accountNumber: 'AO06.123', // Too short, invalid MOD-97
        bankName: 'BAI',
        holderName: 'Valid Holder',
        methodType: 'IBAN_AO',
      })
    ).rejects.toThrow('INVALID_IBAN_AO');
  });

  it('createWithdrawalMethod accepts valid Angolan IBAN and formats properly', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'new-method-id',
            user_id: userId,
            account_number: 'AO69.0040.0000.1234.5678.9010.0',
            bank_name: 'BAI (BAI — Banco Angolano de Investimentos)',
            holder_name: 'Valid Holder',
            method_type: 'IBAN_AO',
            is_verified: true,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'withdrawal_methods') {
          return { insert: mockInsert };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new WithdrawalService(mockSupabase);
    const result = await service.createWithdrawalMethod(userId, {
      accountNumber: 'AO69004000001234567890100',
      bankName: 'BAI',
      holderName: 'Valid Holder',
      methodType: 'IBAN_AO',
    });

    expect(result.id).toBe('new-method-id');
    expect(result.accountNumber).toContain('AO69');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        account_number: 'AO69.0040.0000.1234.5678.9010.0',
        method_type: 'IBAN_AO',
      })
    );
  });
});
