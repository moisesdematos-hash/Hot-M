'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface AffiliateLinkItem {
  id: string;
  programId: string;
  code: string;
  program?: {
    commissionPercentage: number;
    cookieDurationDays: number;
    product?: {
      id: string;
      title: string;
      slug: string;
      coverImageUrl: string | null;
    };
  };
  stats?: {
    conversionsCount: number;
    totalEarningsAmount: string;
    currency: string;
  };
}

interface MarketplaceProgramItem {
  id: string;
  productId: string;
  commissionPercentage: number;
  cookieDurationDays: number;
  product?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    coverImageUrl: string | null;
    priceAmount?: string;
    currency?: string;
  };
}

export default function AffiliateDashboardPage() {
  const [activeTab, setActiveTab] = useState<'links' | 'marketplace'>('links');
  const [myLinks, setMyLinks] = useState<AffiliateLinkItem[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [linksRes, marketRes] = await Promise.all([
        fetch('/api/v1/affiliates/links'),
        fetch('/api/v1/affiliates/programs'),
      ]);

      const linksData = await linksRes.json();
      const marketData = await marketRes.json();

      if (linksRes.ok) setMyLinks(linksData.links || []);
      if (marketRes.ok) setMarketplace(marketData.programs || []);
    } catch {
      setError('Falha de conexão com o servidor de afiliados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleJoinProgram(programId: string) {
    setIsJoining(programId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/affiliates/programs/${programId}/join`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao afiliar-se ao produto');
      }

      setSuccess('Afiliação realizada com sucesso! Seu link exclusivo já está disponível.');
      await loadData();
      setActiveTab('links');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na afiliação';
      setError(msg);
    } finally {
      setIsJoining(null);
    }
  }

  function handleCopyLink(code: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hot-m.com';
    const link = `${origin}/r/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }

  // Summary stats
  const totalConversions = myLinks.reduce((acc, l) => acc + (l.stats?.conversionsCount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Afiliados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Divulgue infoprodutos e cursos da plataforma e receba comissões automáticas no livro-razão
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'links'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Meus Links ({myLinks.length})
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'marketplace'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Mercado de Afiliação ({marketplace.length})
          </button>
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

      {/* Tab: My Links */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* Performance Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Links Ativos
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {isLoading ? '...' : myLinks.length}
              </div>
              <p className="text-xs text-slate-400">Produtos que você promove</p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Vendas Realizadas
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {isLoading ? '...' : totalConversions}
              </div>
              <p className="text-xs text-slate-400">Conversões atribuídas a você</p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Janela de Cookie
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                30 dias
              </div>
              <p className="text-xs text-slate-400">Atribuição por cookie seguro HttpOnly</p>
            </div>
          </div>

          {/* Links Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">Links de Divulgação</h2>
                <p className="text-xs text-slate-500">Copie seu link e divulgue em redes sociais e campanhas</p>
              </div>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                + Explorar Mais Produtos
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Carregando seus links...</div>
            ) : myLinks.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500 space-y-3">
                <p>Você ainda não possui nenhum link de afiliação ativo.</p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="inline-block rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                >
                  Ir para o Mercado de Afiliação
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">Comissão</th>
                      <th className="py-3 px-4">Link Exclusivo</th>
                      <th className="py-3 px-4">Vendas</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {myLinks.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.program?.product?.title || 'Produto'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {item.program?.commissionPercentage || 20}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                          /r/{item.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {item.stats?.conversionsCount || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleCopyLink(item.code)}
                            className="inline-flex items-center rounded-lg bg-orange-50 dark:bg-orange-950/50 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition"
                          >
                            {copiedCode === item.code ? '✓ Copiado!' : 'Copiar Link'}
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
      )}

      {/* Tab: Marketplace */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">
              Vitrine de Produtos Disponíveis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha produtos de alta conversão para divulgar e fature comissões por venda
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">Carregando vitrine...</div>
          ) : marketplace.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500">
              Nenhum infoproduto disponível no mercado de afiliação no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplace.map((prog) => {
                const isAlreadyJoined = myLinks.some((l) => l.programId === prog.id);

                return (
                  <div
                    key={prog.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div>
                      <div className="h-36 bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-3xl text-white">
                        📦
                      </div>
                      <div className="p-5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Comissão: {prog.commissionPercentage}%
                          </span>
                          <span className="text-xs text-slate-400">
                            Cookie: {prog.cookieDurationDays} dias
                          </span>
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">
                          {prog.product?.title || 'Produto'}
                        </h3>

                        {prog.product?.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {prog.product.description}
                          </p>
                        )}

                        <div className="pt-2 text-sm">
                          <span className="text-xs text-slate-400">Preço final: </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {prog.product?.priceAmount || '0.00'} {prog.product?.currency || 'AOA'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                      {isAlreadyJoined ? (
                        <button
                          onClick={() => setActiveTab('links')}
                          className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                        >
                          ✓ Você já é afiliado (Ver Link)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinProgram(prog.id)}
                          disabled={isJoining === prog.id}
                          className="w-full rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition shadow-sm"
                        >
                          {isJoining === prog.id ? 'Gerando link...' : 'Afiliar-se Agora'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
