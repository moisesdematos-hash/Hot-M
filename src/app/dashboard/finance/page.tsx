'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface BalanceData {
  currency: string;
  availableAmount: string;
  pendingAmount: string;
  reservedAmount: string;
  withdrawnAmount: string;
  totalEarningsAmount: string;
}

interface StatementItem {
  id: string;
  transactionId: string;
  referenceId: string;
  transactionType: string;
  description: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  createdAt: string;
}

export default function FinanceWalletPage() {
  const [currency, setCurrency] = useState<'AOA' | 'USD' | 'EUR' | 'BRL'>('AOA');
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [statement, setStatement] = useState<StatementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [balRes, stmtRes] = await Promise.all([
        fetch(`/api/v1/finance/balance?currency=${currency}`),
        fetch(`/api/v1/finance/statement?currency=${currency}&limit=50`),
      ]);

      const balData = await balRes.json();
      const stmtData = await stmtRes.json();

      if (balRes.ok) {
        setBalance(balData.balance);
      } else {
        setError(balData.error || 'Erro ao carregar saldo');
      }

      if (stmtRes.ok) {
        setStatement(stmtData.statement || []);
      }
    } catch {
      setError('Falha de conexão ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carteira Financeira</h1>
          <p className="text-sm text-slate-500 mt-1">
            Saldos e extrato auditável baseados no livro-razão imutável (Double-Entry Ledger)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'AOA' | 'USD' | 'EUR' | 'BRL')}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="AOA">AOA (Kwanza)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="BRL">BRL (Real R$)</option>
          </select>

          <Link
            href="/dashboard/finance/exchange-rates"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            💱 Câmbio (FX)
          </Link>

          <Link
            href="/dashboard/finance/withdraw"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-sm"
          >
            Solicitar Saque
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Available */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Disponível para Saque</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : `${balance?.availableAmount || '0.00'} ${currency}`}
          </div>
          <p className="text-xs text-slate-500">Fundos liberados pós-período de garantia</p>
        </div>

        {/* Pending */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Pendente (Garantia)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : `${balance?.pendingAmount || '0.00'} ${currency}`}
          </div>
          <p className="text-xs text-slate-500">Retenção de segurança de 7 dias</p>
        </div>

        {/* Reserved */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Em Processamento</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : `${balance?.reservedAmount || '0.00'} ${currency}`}
          </div>
          <p className="text-xs text-slate-500">Saques em fila de transferência bancária</p>
        </div>

        {/* Total Historical */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Faturamento Bruto</span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : `${balance?.totalEarningsAmount || '0.00'} ${currency}`}
          </div>
          <p className="text-xs text-slate-500">Total acumulado de vendas e comissões</p>
        </div>
      </div>

      {/* Statement Section */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Extrato Auditável</h2>
            <p className="text-xs text-slate-500">Histórico de partidas dobradas e transferências</p>
          </div>
          <button
            onClick={fetchFinanceData}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
          >
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Carregando lançamentos...</div>
        ) : statement.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Nenhum lançamento registrado nesta moeda até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Direção</th>
                  <th className="py-3 px-4 text-right">Valor ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {statement.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('pt-AO')}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      {item.description}
                      {item.referenceId && (
                        <span className="block text-[11px] text-slate-400 font-mono">
                          Ref: {item.referenceId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.transactionType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.direction === 'CREDIT' ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          CRÉDITO (+)
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          DÉBITO (-)
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-semibold whitespace-nowrap ${
                        item.direction === 'CREDIT'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.direction === 'CREDIT' ? '+' : '-'} {item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
