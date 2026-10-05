import { SupabaseClient } from '@supabase/supabase-js';
import { Money, CurrencyCode } from '@/core/fintech/money';

export interface UserBalanceSummary {
  currency: CurrencyCode;
  availableAmount: string;
  pendingAmount: string;
  reservedAmount: string;
  withdrawnAmount: string;
  totalEarningsAmount: string;
  availableAmountMinor: bigint;
  pendingAmountMinor: bigint;
  reservedAmountMinor: bigint;
  withdrawnAmountMinor: bigint;
  totalEarningsMinor: bigint;
}

export interface StatementItem {
  id: string;
  transactionId: string;
  referenceId: string;
  transactionType: string;
  description: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  amountMinor: bigint;
  createdAt: string;
}

export class LedgerService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Computes official wallet balances directly from immutable ledger_entries (Section 31).
   * Invariant INV-005: Balances are strictly calculated from ledger, never stored as mutable numbers.
   */
  async getUserBalanceSummary(userId: string, currency: CurrencyCode = 'AOA'): Promise<UserBalanceSummary> {
    // 1. Find all accounts owned by user for this currency
    const { data: accounts, error: accError } = await this.client
      .from('ledger_accounts')
      .select('id, account_type')
      .eq('owner_id', userId)
      .eq('currency', currency);

    if (accError || !accounts || accounts.length === 0) {
      return this.emptyBalanceSummary(currency);
    }

    const accountIds = accounts.map((a) => a.id);

    // 2. Fetch all entries for these accounts with their transaction metadata
    const { data: entries, error: entriesError } = await this.client
      .from('ledger_entries')
      .select('id, direction, amount_minor, created_at, ledger_transactions(id, transaction_type, reference_id, created_at)')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });

    if (entriesError || !entries || entries.length === 0) {
      return this.emptyBalanceSummary(currency);
    }

    // Default holding period for buyer warranty / refunds: 7 days
    const HOLDING_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    let totalCredits = 0n;
    let totalDebits = 0n;
    let pendingCredits = 0n;
    let reservedDebits = 0n;
    let withdrawnDebits = 0n;

    for (const entry of entries) {
      const amount = BigInt(entry.amount_minor);
      const tx = entry.ledger_transactions as unknown as {
        id: string;
        transaction_type: string;
        created_at: string;
      } | null;

      const txType = tx?.transaction_type || 'SALE';
      const txCreatedAt = new Date(tx?.created_at || entry.created_at).getTime();

      if (entry.direction === 'CREDIT') {
        totalCredits += amount;

        // If it's a sale and within warranty holding period, it's PENDING
        if (txType === 'SALE' && now - txCreatedAt < HOLDING_PERIOD_MS) {
          pendingCredits += amount;
        }
      } else if (entry.direction === 'DEBIT') {
        totalDebits += amount;

        if (txType === 'WITHDRAWAL_HOLD') {
          reservedDebits += amount;
        } else if (txType === 'WITHDRAWAL_RELEASE') {
          withdrawnDebits += amount;
        }
      }
    }

    // Net balance in accounts = Total Credits - Total Debits
    const netBalance = totalCredits > totalDebits ? totalCredits - totalDebits : 0n;

    // Available = Net Balance - Pending Credits (funds still under warranty)
    const availableMinor = netBalance > pendingCredits ? netBalance - pendingCredits : 0n;

    const availableMoney = Money.fromMinor(availableMinor, currency);
    const pendingMoney = Money.fromMinor(pendingCredits, currency);
    const reservedMoney = Money.fromMinor(reservedDebits, currency);
    const withdrawnMoney = Money.fromMinor(withdrawnDebits, currency);
    const totalEarningsMoney = Money.fromMinor(totalCredits, currency);

    return {
      currency,
      availableAmount: availableMoney.toMajorString(),
      pendingAmount: pendingMoney.toMajorString(),
      reservedAmount: reservedMoney.toMajorString(),
      withdrawnAmount: withdrawnMoney.toMajorString(),
      totalEarningsAmount: totalEarningsMoney.toMajorString(),
      availableAmountMinor: availableMinor,
      pendingAmountMinor: pendingCredits,
      reservedAmountMinor: reservedDebits,
      withdrawnAmountMinor: withdrawnDebits,
      totalEarningsMinor: totalCredits,
    };
  }

  /**
   * Returns a detailed chronological audit statement of ledger entries for a user.
   */
  async getAccountStatement(
    userId: string,
    currency: CurrencyCode = 'AOA',
    limit = 50
  ): Promise<StatementItem[]> {
    const { data: accounts } = await this.client
      .from('ledger_accounts')
      .select('id')
      .eq('owner_id', userId)
      .eq('currency', currency);

    if (!accounts || accounts.length === 0) return [];

    const accountIds = accounts.map((a) => a.id);

    const { data: entries, error } = await this.client
      .from('ledger_entries')
      .select('id, direction, amount_minor, created_at, ledger_transactions(id, transaction_type, reference_id, description, created_at)')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !entries) return [];

    return entries.map((entry) => {
      const tx = entry.ledger_transactions as unknown as {
        id: string;
        transaction_type: string;
        reference_id: string;
        description: string;
        created_at: string;
      } | null;

      const money = Money.fromMinor(BigInt(entry.amount_minor), currency);

      return {
        id: entry.id,
        transactionId: tx?.id || '',
        referenceId: tx?.reference_id || '',
        transactionType: tx?.transaction_type || 'TRANSACTION',
        description: tx?.description || 'Lançamento financeiro',
        direction: entry.direction as 'DEBIT' | 'CREDIT',
        amount: money.toMajorString(),
        amountMinor: money.amount,
        createdAt: entry.created_at,
      };
    });
  }

  private emptyBalanceSummary(currency: CurrencyCode): UserBalanceSummary {
    return {
      currency,
      availableAmount: '0.00',
      pendingAmount: '0.00',
      reservedAmount: '0.00',
      withdrawnAmount: '0.00',
      totalEarningsAmount: '0.00',
      availableAmountMinor: 0n,
      pendingAmountMinor: 0n,
      reservedAmountMinor: 0n,
      withdrawnAmountMinor: 0n,
      totalEarningsMinor: 0n,
    };
  }
}
