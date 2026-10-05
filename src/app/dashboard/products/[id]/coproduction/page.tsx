'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface CoProducerItem {
  id: string;
  partnerId: string;
  percentage: number;
  partner: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function ProductCoproductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);

  const [coProducers, setCoProducers] = useState<CoProducerItem[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [primaryCreatorPercentage, setPrimaryCreatorPercentage] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [partnerEmail, setPartnerEmail] = useState('');
  const [percentage, setPercentage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/products/${productId}/coproduction`);
      const data = await res.json();

      if (res.ok) {
        setCoProducers(data.coProducers || []);
        setTotalAllocated(data.totalAllocatedPercentage || 0);
        setPrimaryCreatorPercentage(data.primaryCreatorPercentage || 100);
      } else {
        setError(data.error || 'Erro ao carregar coprodutores');
      }
    } catch {
      setError('Falha de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddCoProducer(e: React.FormEvent) {
    e.preventDefault();
    const pct = parseInt(percentage, 10);
    if (!partnerEmail || isNaN(pct) || pct <= 0) {
      setError('Informe um e-mail válido e uma porcentagem maior que 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/products/${productId}/coproduction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerEmail, percentage: pct }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar coprodutor');
      }

      setSuccess(`Coprodutor ${partnerEmail} configurado com ${pct}% de receita com sucesso!`);
      setPartnerEmail('');
      setPercentage('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao adicionar';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveCoProducer(partnerId: string) {
    if (!confirm('Tem certeza que deseja remover este coprodutor?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/products/${productId}/coproduction`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover coprodutor');

      setSuccess('Coprodutor removido com sucesso.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover';
      setError(msg);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link
          href="/dashboard/products"
          className="text-xs font-semibold text-orange-600 hover:underline mb-2 inline-block"
        >
          &larr; Voltar para Meus Produtos
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Coprodução & Divisão de Receitas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Divida automaticamente o faturamento de cada venda entre múltiplos parceiros no livro-razão (Double-Entry Ledger)
        </p>
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

      {/* Revenue Share Visualizer */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="font-bold text-lg text-slate-900 dark:text-white">Divisão de Faturamento</h2>

        {/* Progress Bar Split */}
        <div className="h-6 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${primaryCreatorPercentage}%` }}
            className="bg-orange-600 text-[11px] font-bold text-white flex items-center justify-center transition-all duration-300"
            title={`Você (Produtor): ${primaryCreatorPercentage}%`}
          >
            {primaryCreatorPercentage >= 15 ? `Você: ${primaryCreatorPercentage}%` : `${primaryCreatorPercentage}%`}
          </div>
          {coProducers.map((cp, idx) => (
            <div
              key={cp.id}
              style={{ width: `${cp.percentage}%` }}
              className={`text-[11px] font-bold text-white flex items-center justify-center transition-all duration-300 ${
                idx % 2 === 0 ? 'bg-indigo-600' : 'bg-teal-600'
              }`}
              title={`${cp.partner.fullName}: ${cp.percentage}%`}
            >
              {cp.percentage >= 10 ? `${cp.percentage}%` : ''}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-600" />
            <span>Sua Cota (Produtor Principal): <strong>{primaryCreatorPercentage}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600" />
            <span>Cota Alocada a Coprodutores: <strong>{totalAllocated}%</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form: Add Co-producer */}
        <div className="md:col-span-1 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Adicionar Coprodutor</h3>

          <form onSubmit={handleAddCoProducer} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                E-mail do Parceiro
              </label>
              <input
                type="email"
                required
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="parceiro@email.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Porcentagem de Receita (%)
              </label>
              <input
                type="number"
                min="1"
                max={Math.max(1, 99 - totalAllocated)}
                required
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder={`Máx: ${Math.max(1, 99 - totalAllocated)}%`}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Disponível para divisão: {100 - totalAllocated - 1}%
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || totalAllocated >= 99}
              className="w-full rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Coprodutor'}
            </button>
          </form>
        </div>

        {/* Table: Configured Co-producers */}
        <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Coprodutores Ativos</h3>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Carregando lista...</div>
          ) : coProducers.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Nenhum coprodutor cadastrado para este produto.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Coprodutor</th>
                    <th className="py-3 px-4">Porcentagem</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {coProducers.map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {cp.partner.fullName}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {cp.partner.email}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {cp.percentage}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRemoveCoProducer(cp.partnerId)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
