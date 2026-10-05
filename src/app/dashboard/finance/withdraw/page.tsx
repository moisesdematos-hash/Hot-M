'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface WithdrawalMethod {
  id: string;
  methodType: string;
  accountNumber: string;
  bankName: string;
  holderName: string;
  isVerified: boolean;
}

interface WithdrawalItem {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  method?: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
  rejectionReason?: string | null;
}

interface BalanceData {
  availableAmount: string;
  currency: string;
}

export default function WithdrawPage() {
  const [currency] = useState<'AOA' | 'USD' | 'EUR'>('AOA');
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  // New method modal state
  const [showNewMethod, setShowNewMethod] = useState(false);
  const [newBankName, setNewBankName] = useState('BAI');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newHolderName, setNewHolderName] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [balRes, methRes, withRes] = await Promise.all([
        fetch(`/api/v1/finance/balance?currency=${currency}`),
        fetch('/api/v1/finance/withdrawal-methods'),
        fetch('/api/v1/finance/withdrawals'),
      ]);

      const balData = await balRes.json();
      const methData = await methRes.json();
      const withData = await withRes.json();

      if (balRes.ok) setBalance(balData.balance);
      if (methRes.ok) {
        setMethods(methData.methods || []);
        if (methData.methods?.length > 0 && !selectedMethodId) {
          setSelectedMethodId(methData.methods[0].id);
        }
      }
      if (withRes.ok) setWithdrawals(withData.withdrawals || []);
    } catch {
      setError('Falha de conexão com o servidor financeiro');
    } finally {
      setIsLoading(false);
    }
  }, [currency, selectedMethodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRequestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMethodId) {
      setError('Selecione uma conta bancária para receber o saque');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Informe um valor válido para saque');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/v1/finance/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalMethodId: selectedMethodId,
          amount,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao solicitar saque');
      }

      setSuccess('Solicitação de saque enviada com sucesso! O valor foi retido na sua carteira.');
      setAmount('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar saque';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddMethod(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/finance/withdrawal-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: newBankName,
          accountNumber: newAccountNumber,
          holderName: newHolderName,
          methodType: 'IBAN_AO',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar método');
      }

      setShowNewMethod(false);
      setNewAccountNumber('');
      setNewHolderName('');
      await loadData();
      if (data.method?.id) {
        setSelectedMethodId(data.method.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar conta';
      setError(msg);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/finance"
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              &larr; Voltar para Carteira
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitar Saque</h1>
          <p className="text-sm text-slate-500 mt-1">
            Transferência direta para sua conta bancária em Angola (IBAN)
          </p>
        </div>

        {/* Balance Snapshot Card */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/80 bg-emerald-50 dark:bg-emerald-950/30 text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Saldo Disponível
          </div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
            {isLoading ? '...' : `${balance?.availableAmount || '0.00'} ${currency}`}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Withdrawal Form */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Dados da Transferência</h2>

          <form onSubmit={handleRequestWithdrawal} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Conta Bancária
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewMethod(true)}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  + Nova Conta
                </button>
              </div>

              {methods.length === 0 ? (
                <div className="p-3 text-xs text-slate-500 border border-dashed rounded-lg text-center">
                  Nenhuma conta bancária cadastrada.
                  <button
                    type="button"
                    onClick={() => setShowNewMethod(true)}
                    className="block mx-auto mt-2 text-orange-600 font-bold"
                  >
                    Cadastrar IBAN agora
                  </button>
                </div>
              ) : (
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.bankName} - {m.accountNumber.slice(-8)} ({m.holderName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Valor a Sacar ({currency})
                </label>
                {balance && (
                  <button
                    type="button"
                    onClick={() => setAmount(balance.availableAmount)}
                    className="text-xs text-orange-600 hover:underline font-medium"
                  >
                    Usar Saldo Total
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 50000.00"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Valor mínimo: 5.000,00 AOA</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || methods.length === 0}
              className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition shadow-sm"
            >
              {isSubmitting ? 'Processando retenção...' : 'Confirmar Solicitação de Saque'}
            </button>
          </form>
        </div>

        {/* History of Withdrawals */}
        <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Histórico de Saques</h2>
            <p className="text-xs text-slate-500">Acompanhamento e prazos de liquidação</p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Carregando histórico...</div>
          ) : withdrawals.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Você ainda não realizou nenhuma solicitação de saque.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Destino</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {withdrawals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {item.method?.bankName || 'Banco'}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono">
                          {item.method?.accountNumber ? `•••• ${item.method.accountNumber.slice(-6)}` : '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.amount} {item.currency}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.rejectionReason && (
                          <span className="block text-[10px] text-rose-500 mt-0.5">
                            {item.rejectionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastrar Nova Conta */}
      {showNewMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cadastrar Conta Bancária</h3>
            <form onSubmit={handleAddMethod} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Banco</label>
                <select
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="BAI">BAI (Banco Angolano de Investimentos)</option>
                  <option value="BFA">BFA (Banco de Fomento Angola)</option>
                  <option value="Banco Atlantico">Banco Millennium Atlântico</option>
                  <option value="BIC">Banco BIC</option>
                  <option value="BCI">BCI (Banco de Comércio e Indústria)</option>
                  <option value="SOL">Banco Sol</option>
                  <option value="Standard Bank">Standard Bank Angola</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">IBAN / Número de Conta</label>
                <input
                  type="text"
                  required
                  placeholder="AO06.0040.0000.XXXX.XXXX.XXXX.X"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Titular da Conta</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do titular"
                  value={newHolderName}
                  onChange={(e) => setNewHolderName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewMethod(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
