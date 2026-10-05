import { SupabaseClient } from '@supabase/supabase-js';
import { CurrencyCode, Money } from '@/core/fintech/money';
import { WithdrawalStateMachine, WithdrawalStatus } from '@/core/fintech/state-machines';
import { LedgerService } from '@/modules/ledger/ledger-service';

export interface WithdrawalMethodRecord {
  id: string;
  userId: string;
  methodType: string;
  accountNumber: string;
  bankName: string;
  holderName: string;
  isVerified: boolean;
  createdAt: string;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  withdrawalMethodId: string;
  amountMinor: bigint;
  currency: CurrencyCode;
  status: WithdrawalStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  payoutReference?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  method?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
}

export interface RequestWithdrawalInput {
  withdrawalMethodId: string;
  amountMinor: bigint;
  currency: CurrencyCode;
}

export interface CreateWithdrawalMethodInput {
  methodType?: string;
  accountNumber: string;
  bankName: string;
  holderName: string;
}

export class WithdrawalService {
  private client: SupabaseClient;
  // Per-user in-memory serialization lock for concurrent requests
  private static userLocks: Map<string, Promise<unknown>> = new Map();

  // Minimum withdrawal thresholds
  static readonly MINIMUM_WITHDRAWAL_MINOR: Record<CurrencyCode, bigint> = {
    AOA: 500000n, // 5,000.00 AOA
    USD: 1000n,   // 10.00 USD
    EUR: 1000n,   // 10.00 EUR
    BRL: 5000n,   // 50.00 BRL
  };

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Serializes execution for a specific user to prevent race conditions on balance.
   */
  private async withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const currentLock = WithdrawalService.userLocks.get(userId) || Promise.resolve();
    let releaseLock: () => void = () => {};

    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    WithdrawalService.userLocks.set(userId, nextLock);

    try {
      await currentLock;
      return await fn();
    } finally {
      releaseLock();
      if (WithdrawalService.userLocks.get(userId) === nextLock) {
        WithdrawalService.userLocks.delete(userId);
      }
    }
  }

  /**
   * Retrieves withdrawal history for a user.
   */
  async getUserWithdrawals(userId: string): Promise<WithdrawalRecord[]> {
    const { data, error } = await this.client
      .from('withdrawals')
      .select('*, withdrawal_methods(bank_name, account_number, holder_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      withdrawalMethodId: item.withdrawal_method_id,
      amountMinor: BigInt(item.amount_minor),
      currency: item.currency as CurrencyCode,
      status: item.status as WithdrawalStatus,
      reviewedBy: item.reviewed_by,
      reviewedAt: item.reviewed_at,
      payoutReference: item.payout_reference,
      rejectionReason: item.rejection_reason,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      method: item.withdrawal_methods
        ? {
            bankName: item.withdrawal_methods.bank_name,
            accountNumber: item.withdrawal_methods.account_number,
            holderName: item.withdrawal_methods.holder_name,
          }
        : undefined,
    }));
  }

  /**
   * Retrieves registered payout methods for a user.
   */
  async getUserWithdrawalMethods(userId: string): Promise<WithdrawalMethodRecord[]> {
    const { data, error } = await this.client
      .from('withdrawal_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      methodType: item.method_type,
      accountNumber: item.account_number,
      bankName: item.bank_name,
      holderName: item.holder_name,
      isVerified: item.is_verified,
      createdAt: item.created_at,
    }));
  }

  /**
   * Registers a new payout method (IBAN Angola).
   */
  async createWithdrawalMethod(
    userId: string,
    input: CreateWithdrawalMethodInput
  ): Promise<WithdrawalMethodRecord> {
    if (!input.accountNumber || input.accountNumber.trim().length < 5) {
      throw new Error('INVALID_ACCOUNT_NUMBER: Número de conta ou IBAN inválido');
    }
    if (!input.bankName || input.bankName.trim().length < 2) {
      throw new Error('INVALID_BANK_NAME: Nome do banco obrigatório');
    }
    if (!input.holderName || input.holderName.trim().length < 2) {
      throw new Error('INVALID_HOLDER_NAME: Titular da conta obrigatório');
    }

    const { data, error } = await this.client
      .from('withdrawal_methods')
      .insert({
        user_id: userId,
        method_type: input.methodType || 'IBAN_AO',
        account_number: input.accountNumber.trim(),
        bank_name: input.bankName.trim(),
        holder_name: input.holderName.trim(),
        is_verified: true, // In production, IBAN check or receipt validation
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Falha ao cadastrar método de saque: ${error?.message || 'Erro'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      methodType: data.method_type,
      accountNumber: data.account_number,
      bankName: data.bank_name,
      holderName: data.holder_name,
      isVerified: data.is_verified,
      createdAt: data.created_at,
    };
  }

  /**
   * Requests a withdrawal with strict balance lock and double-entry ledger hold.
   * Concurrency Lock: Prevents double-withdrawal race condition.
   */
  async requestWithdrawal(
    userId: string,
    input: RequestWithdrawalInput
  ): Promise<WithdrawalRecord> {
    return this.withUserLock(userId, async () => {
      const minMinor = WithdrawalService.MINIMUM_WITHDRAWAL_MINOR[input.currency] || 500000n;
      if (input.amountMinor < minMinor) {
        const minMoney = Money.fromMinor(minMinor, input.currency);
        throw new Error(
          `MINIMUM_WITHDRAWAL_NOT_MET: O valor mínimo para saque é de ${minMoney.toMajorString()} ${input.currency}`
        );
      }

      // 1. Verify withdrawal method belongs to user
      const { data: method, error: methodError } = await this.client
        .from('withdrawal_methods')
        .select('id, user_id, bank_name, account_number, holder_name')
        .eq('id', input.withdrawalMethodId)
        .maybeSingle();

      if (methodError || !method || method.user_id !== userId) {
        throw new Error('METHOD_NOT_FOUND: Método de saque não encontrado ou não pertence ao usuário');
      }

      // 2. Compute available balance under lock
      const ledgerService = new LedgerService(this.client);
      const balance = await ledgerService.getUserBalanceSummary(userId, input.currency);

      if (balance.availableAmountMinor < input.amountMinor) {
        const requestedMoney = Money.fromMinor(input.amountMinor, input.currency);
        throw new Error(
          `INSUFFICIENT_FUNDS: Saldo disponível insuficiente (${balance.availableAmount} < ${requestedMoney.toMajorString()} ${input.currency})`
        );
      }

      // 3. Insert withdrawal request
      const { data: withdrawal, error: wthError } = await this.client
        .from('withdrawals')
        .insert({
          user_id: userId,
          withdrawal_method_id: input.withdrawalMethodId,
          amount_minor: input.amountMinor.toString(),
          currency: input.currency,
          status: 'REQUESTED',
        })
        .select('*')
        .single();

      if (wthError || !withdrawal) {
        throw new Error(`Falha ao registrar solicitação de saque: ${wthError?.message || 'Erro'}`);
      }

      // 4. Record Double-Entry Ledger Hold (INV-005, INV-006)
      // Debit User SELLER_RECEIVABLE -> Credit Platform WITHDRAWAL_ESCROW
      const userAccount = await this.getOrCreateAccount(userId, 'SELLER_RECEIVABLE', input.currency);
      const escrowAccount = await this.getOrCreateAccount(null, 'WITHDRAWAL_ESCROW', input.currency);

      const { data: txRecord } = await this.client
        .from('ledger_transactions')
        .insert({
          reference_id: withdrawal.id,
          transaction_type: 'WITHDRAWAL_HOLD',
          description: `Retenção para solicitação de saque #${withdrawal.id}`,
          currency: input.currency,
        })
        .select('id')
        .single();

      if (txRecord) {
        await this.client.from('ledger_entries').insert([
          {
            transaction_id: txRecord.id,
            account_id: userAccount.id,
            direction: 'DEBIT',
            amount_minor: input.amountMinor.toString(),
          },
          {
            transaction_id: txRecord.id,
            account_id: escrowAccount.id,
            direction: 'CREDIT',
            amount_minor: input.amountMinor.toString(),
          },
        ]);
      }

      // 5. Audit Log
      await this.client.from('audit_logs').insert({
        actor_id: userId,
        actor_role: 'CREATOR',
        action: 'WITHDRAWAL_REQUESTED',
        entity: 'withdrawals',
        entity_id: withdrawal.id,
        request_id: `wth_${Date.now()}`,
        reason: `Solicitação de saque de ${input.amountMinor} ${input.currency}`,
      });

      return {
        id: withdrawal.id,
        userId: withdrawal.user_id,
        withdrawalMethodId: withdrawal.withdrawal_method_id,
        amountMinor: BigInt(withdrawal.amount_minor),
        currency: withdrawal.currency as CurrencyCode,
        status: withdrawal.status as WithdrawalStatus,
        reviewedBy: null,
        reviewedAt: null,
        payoutReference: null,
        rejectionReason: null,
        createdAt: withdrawal.created_at,
        updatedAt: withdrawal.updated_at,
        method: {
          bankName: method.bank_name,
          accountNumber: method.account_number,
          holderName: method.holder_name,
        },
      };
    });
  }

  /**
   * Approves a withdrawal (Operator / Finance action).
   */
  async approveWithdrawal(withdrawalId: string, reviewerId: string): Promise<void> {
    const { data: wth } = await this.client
      .from('withdrawals')
      .select('id, status')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!wth) throw new Error('WITHDRAWAL_NOT_FOUND: Saque não localizado');

    const nextStatus = WithdrawalStateMachine.transition(wth.status as WithdrawalStatus, 'APPROVED');

    await this.client
      .from('withdrawals')
      .update({
        status: nextStatus,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    await this.client.from('audit_logs').insert({
      actor_id: reviewerId,
      actor_role: 'FINANCE',
      action: 'WITHDRAWAL_APPROVED',
      entity: 'withdrawals',
      entity_id: withdrawalId,
      request_id: `appr_${Date.now()}`,
      reason: 'Aprovação de saque pela equipe financeira',
    });
  }

  /**
   * Rejects a withdrawal and executes double-entry ledger reversal.
   * Funds are restored back to the user's available balance.
   */
  async rejectWithdrawal(
    withdrawalId: string,
    reason: string,
    reviewerId: string
  ): Promise<void> {
    const { data: wth } = await this.client
      .from('withdrawals')
      .select('id, user_id, amount_minor, currency, status')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!wth) throw new Error('WITHDRAWAL_NOT_FOUND: Saque não localizado');

    const nextStatus = WithdrawalStateMachine.transition(wth.status as WithdrawalStatus, 'REJECTED');

    await this.client
      .from('withdrawals')
      .update({
        status: nextStatus,
        rejection_reason: reason,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    // Ledger Reversal: Debit Escrow -> Credit User SELLER_RECEIVABLE
    const userAccount = await this.getOrCreateAccount(wth.user_id, 'SELLER_RECEIVABLE', wth.currency);
    const escrowAccount = await this.getOrCreateAccount(null, 'WITHDRAWAL_ESCROW', wth.currency);

    const { data: txRecord } = await this.client
      .from('ledger_transactions')
      .insert({
        reference_id: withdrawalId,
        transaction_type: 'WITHDRAWAL_REVERSAL',
        description: `Estorno de saque rejeitado #${withdrawalId}: ${reason}`,
        currency: wth.currency,
      })
      .select('id')
      .single();

    if (txRecord) {
      await this.client.from('ledger_entries').insert([
        {
          transaction_id: txRecord.id,
          account_id: escrowAccount.id,
          direction: 'DEBIT',
          amount_minor: wth.amount_minor,
        },
        {
          transaction_id: txRecord.id,
          account_id: userAccount.id,
          direction: 'CREDIT',
          amount_minor: wth.amount_minor,
        },
      ]);
    }

    await this.client.from('audit_logs').insert({
      actor_id: reviewerId,
      actor_role: 'FINANCE',
      action: 'WITHDRAWAL_REJECTED',
      entity: 'withdrawals',
      entity_id: withdrawalId,
      request_id: `rej_${Date.now()}`,
      reason,
    });
  }

  /**
   * Finalizes a withdrawal marking it as PAID with bank transfer reference.
   */
  async finalizePaidWithdrawal(
    withdrawalId: string,
    payoutReference: string,
    reviewerId: string
  ): Promise<void> {
    const { data: wth } = await this.client
      .from('withdrawals')
      .select('id, user_id, amount_minor, currency, status')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!wth) throw new Error('WITHDRAWAL_NOT_FOUND: Saque não localizado');

    let current = wth.status as WithdrawalStatus;
    if (current === 'APPROVED') {
      current = WithdrawalStateMachine.transition(current, 'PROCESSING');
    }
    const nextStatus = WithdrawalStateMachine.transition(current, 'PAID');

    await this.client
      .from('withdrawals')
      .update({
        status: nextStatus,
        payout_reference: payoutReference,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    // Ledger Release: Debit Escrow -> Credit Cash Settlement
    const escrowAccount = await this.getOrCreateAccount(null, 'WITHDRAWAL_ESCROW', wth.currency);
    const cashAccount = await this.getOrCreateAccount(null, 'CASH_SETTLEMENT', wth.currency);

    const { data: txRecord } = await this.client
      .from('ledger_transactions')
      .insert({
        reference_id: withdrawalId,
        transaction_type: 'WITHDRAWAL_RELEASE',
        description: `Liquidação bancária de saque #${withdrawalId} (Ref: ${payoutReference})`,
        currency: wth.currency,
      })
      .select('id')
      .single();

    if (txRecord) {
      await this.client.from('ledger_entries').insert([
        {
          transaction_id: txRecord.id,
          account_id: escrowAccount.id,
          direction: 'DEBIT',
          amount_minor: wth.amount_minor,
        },
        {
          transaction_id: txRecord.id,
          account_id: cashAccount.id,
          direction: 'CREDIT',
          amount_minor: wth.amount_minor,
        },
      ]);
    }

    await this.client.from('audit_logs').insert({
      actor_id: reviewerId,
      actor_role: 'FINANCE',
      action: 'WITHDRAWAL_PAID',
      entity: 'withdrawals',
      entity_id: withdrawalId,
      request_id: `paid_${Date.now()}`,
      reason: `Transferência bancária liquidada com referência ${payoutReference}`,
    });
  }

  private async getOrCreateAccount(
    ownerId: string | null,
    accountType: string,
    currency: string
  ): Promise<{ id: string }> {
    let query = this.client
      .from('ledger_accounts')
      .select('id')
      .eq('account_type', accountType)
      .eq('currency', currency);

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    } else {
      query = query.is('owner_id', null);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) return existing;

    const { data: created, error } = await this.client
      .from('ledger_accounts')
      .insert({
        owner_id: ownerId,
        account_type: accountType,
        currency,
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(`Falha ao inicializar conta no ledger: ${error?.message || 'Erro'}`);
    }

    return created;
  }
}
