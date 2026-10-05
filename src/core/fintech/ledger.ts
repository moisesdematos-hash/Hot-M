import { Money, CurrencyCode } from './money';

export type LedgerAccountType = 
  | 'PLATFORM_REVENUE'
  | 'CREATOR_BALANCE'
  | 'AFFILIATE_BALANCE'
  | 'COPRODUCER_BALANCE'
  | 'PAYMENT_CLEARING'
  | 'WITHDRAWAL_CLEARING';

export type EntryDirection = 'DEBIT' | 'CREDIT';

export interface LedgerEntryDraft {
  accountId: string;
  accountType: LedgerAccountType;
  direction: EntryDirection;
  amount: bigint; // Minor units, must be > 0
  currency: CurrencyCode;
}

export interface LedgerTransactionDraft {
  referenceId: string; // Order ID, Refund ID, Withdrawal ID
  transactionType: 'SALE' | 'REFUND' | 'WITHDRAWAL_HOLD' | 'WITHDRAWAL_RELEASE' | 'WITHDRAWAL_FAIL_ROLLBACK';
  description: string;
  currency: CurrencyCode;
  entries: LedgerEntryDraft[];
}

export class LedgerValidator {
  /**
   * Enforces INV-006: Total Debits must strictly equal Total Credits.
   * Enforces all entries have the same currency as the transaction.
   * Enforces positive non-zero entry amounts.
   */
  static validate(draft: LedgerTransactionDraft): void {
    if (draft.entries.length < 2) {
      throw new Error(`Ledger transaction ${draft.referenceId} must contain at least 2 balanced entries.`);
    }

    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const entry of draft.entries) {
      if (entry.currency !== draft.currency) {
        throw new Error(
          `Currency mismatch in ledger entry for account ${entry.accountId}: expected ${draft.currency}, got ${entry.currency}`
        );
      }

      if (entry.amount <= 0n) {
        throw new Error(`Ledger entry for account ${entry.accountId} must be strictly positive (got ${entry.amount})`);
      }

      if (entry.direction === 'DEBIT') {
        totalDebits += entry.amount;
      } else if (entry.direction === 'CREDIT') {
        totalCredits += entry.amount;
      } else {
        throw new Error(`Invalid entry direction: ${entry.direction}`);
      }
    }

    if (totalDebits !== totalCredits) {
      throw new Error(
        `LEDGER IMBALANCE: Total Debits (${totalDebits}) does not equal Total Credits (${totalCredits}) for ref ${draft.referenceId}`
      );
    }
  }

  /**
   * Helper to build a balanced Sale transaction splitting between:
   * Clearing (Debit), Platform (Credit), Affiliate (Credit), and Creator (Credit).
   */
  static createSaleDistribution(params: {
    orderId: string;
    totalAmount: Money;
    platformFee: Money;
    affiliateCommission: Money;
    creatorEarnings: Money;
    clearingAccountId: string;
    platformAccountId: string;
    affiliateAccountId?: string;
    creatorAccountId: string;
  }): LedgerTransactionDraft {
    const {
      orderId,
      totalAmount,
      platformFee,
      affiliateCommission,
      creatorEarnings,
      clearingAccountId,
      platformAccountId,
      affiliateAccountId,
      creatorAccountId,
    } = params;

    const currency = totalAmount.currency;
    const sumCredits = platformFee.add(affiliateCommission).add(creatorEarnings);

    if (!sumCredits.equals(totalAmount)) {
      throw new Error(
        `Sale distribution arithmetic error: sum of credits (${sumCredits.toMajorString()}) != total (${totalAmount.toMajorString()})`
      );
    }

    const entries: LedgerEntryDraft[] = [
      {
        accountId: clearingAccountId,
        accountType: 'PAYMENT_CLEARING',
        direction: 'DEBIT',
        amount: totalAmount.amount,
        currency,
      },
      {
        accountId: platformAccountId,
        accountType: 'PLATFORM_REVENUE',
        direction: 'CREDIT',
        amount: platformFee.amount,
        currency,
      },
      {
        accountId: creatorAccountId,
        accountType: 'CREATOR_BALANCE',
        direction: 'CREDIT',
        amount: creatorEarnings.amount,
        currency,
      },
    ];

    if (affiliateAccountId && affiliateCommission.isPositive()) {
      entries.push({
        accountId: affiliateAccountId,
        accountType: 'AFFILIATE_BALANCE',
        direction: 'CREDIT',
        amount: affiliateCommission.amount,
        currency,
      });
    }

    const transaction: LedgerTransactionDraft = {
      referenceId: orderId,
      transactionType: 'SALE',
      description: `Sale order distribution for ${orderId}`,
      currency,
      entries,
    };

    LedgerValidator.validate(transaction);
    return transaction;
  }
}
