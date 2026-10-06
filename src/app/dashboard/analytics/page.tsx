'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface ProductPerformanceItem {
  productId: string;
  title: string;
  salesCount: number;
  revenueMinor: string;
}

interface DailyRevenueItem {
  date: string;
  revenueMinor: string;
  orderCount: number;
}

interface AnalyticsData {
  currency: string;
  grossRevenueMinor: string;
  grossRevenueMajor: string;
  completedOrders: number;
  totalOrders: number;
  refundedOrders: number;
  refundRatePercent: number;
  averageOrderValueMajor: string;
  productPerformance: ProductPerformanceItem[];
  dailyRevenue: DailyRevenueItem[];
}

export default function CreatorAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [currency, setCurrency] = useState('AOA');
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/analytics/creator?currency=${currency}&days=${days}`);
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Erro ao carregar dados analíticos');
      }
    } catch {
      setError('Falha de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  }, [currency, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxDailyRevenue = Math.max(
    ...(analytics?.dailyRevenue.map((d) => Number(d.revenueMinor)) || [1]),
    1
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Painel
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Métricas & Desempenho</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics do Produtor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Faturação real, conversão por infoproduto e curva de vendas consolidadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
          >
            <option value="AOA">AOA (Kwanza)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="BRL">BRL (R$)</option>
          </select>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm animate-pulse">
          Calculando métricas financeiras...
        </div>
      ) : (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Faturação Bruta ({currency})
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {analytics?.grossRevenueMajor}
              </div>
              <p className="text-[11px] text-slate-500">Volume total de vendas pagas</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Vendas Concluídas
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {analytics?.completedOrders}
              </div>
              <p className="text-[11px] text-slate-500">
                De {analytics?.totalOrders} pedidos iniciados
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ticket Médio (AOV)
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics?.averageOrderValueMajor} {currency}
              </div>
              <p className="text-[11px] text-slate-500">Valor médio por compra paga</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Taxa de Reembolso
              </span>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                {analytics?.refundRatePercent}%
              </div>
              <p className="text-[11px] text-slate-500">
                {analytics?.refundedOrders} devoluções processadas
              </p>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Evolução Temporal de Faturação
            </h2>

            {analytics?.dailyRevenue.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhuma venda registrada no período selecionado.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-44 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
                  {analytics?.dailyRevenue.map((d) => {
                    const heightPercent = Math.max(
                      Math.round((Number(d.revenueMinor) / maxDailyRevenue) * 100),
                      6
                    );
                    return (
                      <div
                        key={d.date}
                        className="flex-1 min-w-[28px] max-w-[40px] flex flex-col items-center gap-1.5 h-full justify-end group relative"
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 px-2 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap z-10 pointer-events-none shadow-md">
                          {(Number(d.revenueMinor) / 100).toFixed(2)} {currency} ({d.orderCount} vendas)
                        </div>

                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-blue-600 hover:bg-blue-500 transition-all rounded-t-sm"
                        />
                        <span className="text-[9px] text-slate-400 font-mono truncate w-full text-center">
                          {d.date.substring(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Product Performance Table */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Desempenho por Infoproduto
            </h2>

            {analytics?.productPerformance.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum produto cadastrado com vendas ativas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Infoproduto</th>
                      <th className="p-3.5 text-center">Vendas Concluídas</th>
                      <th className="p-3.5 text-right">Faturação Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics?.productPerformance.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {p.title}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {p.salesCount}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {(Number(p.revenueMinor) / 100).toFixed(2)} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
