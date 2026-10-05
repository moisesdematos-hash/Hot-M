import { describe, it, expect } from 'vitest';
import { LedgerValidator, LedgerTransactionDraft } from '@/core/fintech/ledger';
import { Money } from '@/core/fintech/money';

describe('Double-Entry Ledger Engine (INV-005, INV-006)', () => {
  it('should validate a perfectly balanced sale transaction', () => {
    // Sale 100 AOA: Platform 10, Affiliate 20, Creator 70
    // Total Debits = 100, Total Credits = 10 + 20 + 70 = 100
    const tx: LedgerTransactionDraft = {
      referenceId: 'order-123',
      transactionType: 'SALE',
      description: 'Order 123 distribution',
      currency: 'AOA',
      entries: [
        {
          accountId: 'clearing-acc',
          accountType: 'PAYMENT_CLEARING',
          direction: 'DEBIT',
          amount: 10000n,
          currency: 'AOA',
        },
        {
          accountId: 'platform-acc',
          accountType: 'PLATFORM_REVENUE',
          direction: 'CREDIT',
          amount: 1000n,
          currency: 'AOA',
        },
        {
          accountId: 'affiliate-acc',
          accountType: 'AFFILIATE_BALANCE',
          direction: 'CREDIT',
          amount: 2000n,
          currency: 'AOA',
        },
        {
          accountId: 'creator-acc',
          accountType: 'CREATOR_BALANCE',
          direction: 'CREDIT',
          amount: 7000n,
          currency: 'AOA',
        },
      ],
    };

    expect(() => LedgerValidator.validate(tx)).not.toThrow();
  });

  it('should reject an imbalanced ledger transaction (INV-006 violation)', () => {
    const imbalancedTx: LedgerTransactionDraft = {
      referenceId: 'order-bad',
      transactionType: 'SALE',
      description: 'Bad distribution',
      currency: 'AOA',
      entries: [
        {
          accountId: 'clearing-acc',
          accountType: 'PAYMENT_CLEARING',
          direction: 'DEBIT',
          amount: 10000n,
          currency: 'AOA',
        },
        {
          accountId: 'creator-acc',
          accountType: 'CREATOR_BALANCE',
          direction: 'CREDIT',
          amount: 9000n, // Missing 1000n!
          currency: 'AOA',
        },
      ],
    };

    expect(() => LedgerValidator.validate(imbalancedTx)).toThrow('LEDGER IMBALANCE');
  });

  it('should correctly build sale distribution using LedgerValidator helper', () => {
    const distribution = LedgerValidator.createSaleDistribution({
      orderId: 'order-auto',
      totalAmount: Money.fromMinor(10000, 'AOA'),
      platformFee: Money.fromMinor(1000, 'AOA'),
      affiliateCommission: Money.fromMinor(2000, 'AOA'),
      creatorEarnings: Money.fromMinor(7000, 'AOA'),
      clearingAccountId: 'clr-1',
      platformAccountId: 'plt-1',
      affiliateAccountId: 'aff-1',
      creatorAccountId: 'crt-1',
    });

    expect(distribution.entries.length).toBe(4);
    expect(() => LedgerValidator.validate(distribution)).not.toThrow();
  });
});
