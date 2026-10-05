'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface ExchangeRateItem {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  updatedAt: string;
}

interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
}

export default function ExchangeRatesPage() {
  const [currencies, setCurrencies] = useState<CurrencyMeta[]>([]);
  const [rates, setRates] = useState<ExchangeRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculator states
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcFrom, setCalcFrom] = useState('AOA');
  const [calcTo, setCalcTo] = useState('USD');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Admin update rate modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editFrom, setEditFrom] = useState('AOA');
  const [editTo, setEditTo] = useState('USD');
  const [editRate, setEditRate] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/fx/rates');
      const data = await res.json();
      if (res.ok) {
        setCurrencies(data.currencies || []);
        setRates(data.rates || []);
      } else {
        setError(data.error || 'Erro ao carregar taxas de câmbio');
      }
    } catch {
      setError('Falha de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleConvert = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!calcAmount || Number(calcAmount) <= 0) return;

    setIsCalculating(true);
    try {
      // 10000 -> 1,000,000 minor units
      const minor = Math.round(Number(calcAmount) * 100);
      const res = await fetch('/api/v1/fx/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountMinor: minor,
          from: calcFrom,
          to: calcTo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCalcResult(`${data.currencySymbol} ${data.convertedAmount}`);
      }
    } catch {
      // non-blocking
    } finally {
      setIsCalculating(false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(editRate);
    if (!rateNum || rateNum <= 0) return;

    setIsSavingRate(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/v1/fx/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: editFrom,
          to: editTo,
          rate: rateNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar taxa.');
      }

      setSuccess('Taxa de câmbio atualizada com sucesso no banco de dados!');
      setShowAdminModal(false);
      setEditRate('');
      await loadRates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar taxa');
    } finally {
      setIsSavingRate(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard/finance" className="hover:text-blue-600 transition-colors">
              Financeiro
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Câmbio & Multi-Moeda</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Motor Cambial (FX Engine)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Taxas de câmbio oficiais e conversão determinística em minor units inteiros (INV-005)
          </p>
        </div>

        <button
          onClick={() => setShowAdminModal(true)}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
        >
          ⚙ Atualizar Taxa (Admin)
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Interactive FX Converter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>💱</span>
          <span>Simulador & Conversor em Tempo Real</span>
        </h2>

        <form onSubmit={handleConvert} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Valor
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              De (Moeda Origem)
            </label>
            <select
              value={calcFrom}
              onChange={(e) => setCalcFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Para (Moeda Destino)
            </label>
            <select
              value={calcTo}
              onChange={(e) => setCalcTo(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isCalculating}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isCalculating ? 'Calculando...' : 'Calcular Conversão'}
          </button>
        </form>

        {calcResult && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {calcAmount} {calcFrom} equivalem exatamente a:
            </span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              {calcResult}
            </span>
          </div>
        )}
      </div>

      {/* Exchange Rates Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Tabela de Cotações Oficiais (AOA Base)
        </h2>

        {isLoading ? (
          <div className="text-center py-10 text-slate-500 text-sm animate-pulse">
            Carregando cotações oficiais...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Par de Moedas</th>
                  <th className="p-3.5">Taxa de Câmbio</th>
                  <th className="p-3.5">Fonte da Cotação</th>
                  <th className="p-3.5">Última Atualização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rates.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {r.baseCurrency} / {r.targetCurrency}
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {r.rate.toFixed(6)}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {r.source}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-slate-400">
                      {new Date(r.updatedAt).toLocaleDateString('pt-AO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Definir Taxa Oficial de Câmbio
              </h3>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Moeda Origem
                  </label>
                  <select
                    value={editFrom}
                    onChange={(e) => setEditFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Moeda Destino
                  </label>
                  <select
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nova Taxa (1 {editFrom} = X {editTo})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ex: 0.00108696"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingRate}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingRate ? 'Salvando...' : 'Salvar Taxa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
