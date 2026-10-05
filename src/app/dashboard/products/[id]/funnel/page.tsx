'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface ProductItem {
  id: string;
  title: string;
  slug: string;
  offers?: Array<{ id: string; name: string }>;
}

interface OrderBumpItem {
  id: string;
  bumpProductId: string;
  bumpOfferId: string;
  headline: string;
  description: string | null;
  isActive: boolean;
  bumpProduct: {
    id: string;
    title: string;
  };
  bumpOffer?: {
    priceAmount: string;
    currency: string;
  };
}

interface UpsellItem {
  id: string;
  upsellProductId: string;
  upsellOfferId: string;
  headline: string;
  description: string | null;
  videoUrl: string | null;
  discountPercentage: number;
  isActive: boolean;
  upsellProduct: {
    title: string;
  };
}

export default function ProductFunnelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);

  const [activeTab, setActiveTab] = useState<'BUMPS' | 'UPSELL'>('BUMPS');
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [bumps, setBumps] = useState<OrderBumpItem[]>([]);
  const [upsell, setUpsell] = useState<UpsellItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states - Bump
  const [bumpProductId, setBumpProductId] = useState('');
  const [bumpOfferId, setBumpOfferId] = useState('');
  const [bumpHeadline, setBumpHeadline] = useState('');
  const [bumpDescription, setBumpDescription] = useState('');
  const [isSubmittingBump, setIsSubmittingBump] = useState(false);

  // Form states - Upsell
  const [upsellProductId, setUpsellProductId] = useState('');
  const [upsellOfferId] = useState('');
  const [upsellHeadline, setUpsellHeadline] = useState('');
  const [upsellDescription, setUpsellDescription] = useState('');
  const [upsellVideoUrl, setUpsellVideoUrl] = useState('');
  const [upsellDiscount, setUpsellDiscount] = useState('20');
  const [isSubmittingUpsell, setIsSubmittingUpsell] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch current product
      const prodRes = await fetch(`/api/v1/products/${productId}`);
      const prodData = await prodRes.json();
      if (prodRes.ok) {
        setProduct(prodData.product);
      }

      // 2. Fetch creator's products for bump/upsell selection
      const listRes = await fetch('/api/v1/products');
      const listData = await listRes.json();
      if (listRes.ok) {
        setAllProducts(listData.products || []);
      }

      // 3. Fetch active bumps
      const bumpsRes = await fetch(`/api/v1/products/${productId}/bumps`);
      const bumpsData = await bumpsRes.json();
      if (bumpsRes.ok) {
        setBumps(bumpsData.bumps || []);
      }

      // 4. Fetch active upsell
      const upsellRes = await fetch(`/api/v1/products/${productId}/upsells`);
      const upsellData = await upsellRes.json();
      if (upsellRes.ok) {
        setUpsell(upsellData.upsell);
      }
    } catch {
      setError('Erro ao carregar dados do funil.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Bump creation
  const handleCreateBump = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bumpProductId || !bumpHeadline.trim()) return;

    setIsSubmittingBump(true);
    setError(null);
    setSuccess(null);

    try {
      // If offerId not chosen, look up first offer of selected product
      let selectedOffer = bumpOfferId;
      if (!selectedOffer) {
        const offersRes = await fetch(`/api/v1/pricing/offers?productId=${bumpProductId}`);
        const offersData = await offersRes.json();
        if (offersData.offers && offersData.offers.length > 0) {
          selectedOffer = offersData.offers[0].id;
        } else {
          throw new Error('O produto selecionado precisa ter pelo menos uma oferta ativa.');
        }
      }

      const res = await fetch(`/api/v1/products/${productId}/bumps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bumpProductId,
          bumpOfferId: selectedOffer,
          headline: bumpHeadline.trim(),
          description: bumpDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar Order Bump.');
      }

      setSuccess('Order Bump adicionado ao checkout com sucesso!');
      setBumpHeadline('');
      setBumpDescription('');
      setBumpProductId('');
      setBumpOfferId('');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar bump.');
    } finally {
      setIsSubmittingBump(false);
    }
  };

  const handleDeleteBump = async (bumpId: string) => {
    if (!confirm('Deseja realmente remover esta oferta de checkout?')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/products/${productId}/bumps?bumpId=${bumpId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir Order Bump.');
      }

      setSuccess('Order Bump excluído.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir bump.');
    }
  };

  // Handle Upsell creation
  const handleCreateUpsell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upsellProductId || !upsellHeadline.trim()) return;

    setIsSubmittingUpsell(true);
    setError(null);
    setSuccess(null);

    try {
      let selectedOffer = upsellOfferId;
      if (!selectedOffer) {
        const offersRes = await fetch(`/api/v1/pricing/offers?productId=${upsellProductId}`);
        const offersData = await offersRes.json();
        if (offersData.offers && offersData.offers.length > 0) {
          selectedOffer = offersData.offers[0].id;
        } else {
          throw new Error('O produto de upsell precisa ter uma oferta ativa configurada.');
        }
      }

      const res = await fetch(`/api/v1/products/${productId}/upsells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upsellProductId,
          upsellOfferId: selectedOffer,
          headline: upsellHeadline.trim(),
          description: upsellDescription.trim() || undefined,
          videoUrl: upsellVideoUrl.trim() || undefined,
          discountPercentage: Number(upsellDiscount) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao configurar upsell.');
      }

      setSuccess('Upsell pós-compra configurado com sucesso!');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar upsell.');
    } finally {
      setIsSubmittingUpsell(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
              <Link href="/dashboard/products" className="hover:text-blue-600 transition-colors">
                Produtos
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">Funil de Vendas & Otimização</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Otimização de Conversão: {product?.title || 'Produto'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-6">
          <button
            onClick={() => setActiveTab('BUMPS')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'BUMPS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📦 Order Bumps de Checkout ({bumps.length})
          </button>
          <button
            onClick={() => setActiveTab('UPSELL')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'UPSELL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🚀 Upsell de 1 Clique Pós-Compra {upsell ? '(Ativo)' : '(Desativado)'}
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="font-bold ml-2">✕</button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm animate-pulse">
            Carregando configurações do funil...
          </div>
        )}

        {/* TAB 1: ORDER BUMPS */}
        {activeTab === 'BUMPS' && (
          <div className="space-y-6">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-sm text-slate-700">
              <h3 className="font-bold text-blue-900 text-base mb-1">Como funcionam os Order Bumps?</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                O Order Bump é uma oferta complementar de impulso exibida com 1 clique diretamente na tela de checkout.
                Estudos mostram que Order Bumps aumentam o ticket médio (AOV) em até 30% sem atrito de conversão.
              </p>
            </div>

            {/* Existing bumps */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Bumps Ativos no Checkout</h3>
              {bumps.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum order bump configurado para este produto ainda.</p>
              ) : (
                <div className="space-y-3">
                  {bumps.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60"
                    >
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 uppercase">
                          CHECKOUT BUMP
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{b.headline}</h4>
                        {b.description && <p className="text-xs text-slate-500">{b.description}</p>}
                        <p className="text-xs text-blue-600 font-semibold">
                          Produto Vinculado: {b.bumpProduct.title}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBump(b.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to add new bump */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">+ Adicionar Novo Order Bump</h3>
              <form onSubmit={handleCreateBump} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Produto Complementar (Bump)
                    </label>
                    <select
                      required
                      value={bumpProductId}
                      onChange={(e) => setBumpProductId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">Selecione um produto cadastrado...</option>
                      {allProducts
                        .filter((p) => p.id !== productId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Título de Destaque no Checkout
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sim! Adicionar Apostila Prática com 50 Exercícios"
                      value={bumpHeadline}
                      onChange={(e) => setBumpHeadline(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição Curta de Persuasão
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Leve o material complementar com modelos prontos para copiar e colar por apenas mais 3.000 AOA!"
                    value={bumpDescription}
                    onChange={(e) => setBumpDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingBump}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmittingBump ? 'Salvando...' : 'Salvar Order Bump'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: POST-PURCHASE UPSELL */}
        {activeTab === 'UPSELL' && (
          <div className="space-y-6">
            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 text-sm text-slate-700">
              <h3 className="font-bold text-purple-900 text-base mb-1">Como funciona o Upsell de 1 Clique?</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Imediatamente após a confirmação do pedido, o cliente é direcionado para uma página com uma oferta irrecusável.
                Se aceitar, o pedido complementar é processado imediatamente sem precisar digitar dados de entrega novamente.
              </p>
            </div>

            {upsell && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    UPSELL ATIVO
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Desconto: {upsell.discountPercentage}%
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900">{upsell.headline}</h4>
                <p className="text-xs text-slate-500">{upsell.description}</p>
                <p className="text-xs text-purple-600 font-semibold">
                  Produto Oferecido: {upsell.upsellProduct.title}
                </p>
              </div>
            )}

            {/* Form to configure upsell */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                {upsell ? 'Alterar Upsell Pós-Compra' : 'Configurar Upsell Pós-Compra'}
              </h3>
              <form onSubmit={handleCreateUpsell} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Produto Oferecido no Upsell
                    </label>
                    <select
                      required
                      value={upsellProductId}
                      onChange={(e) => setUpsellProductId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">Selecione o produto de maior valor...</option>
                      {allProducts
                        .filter((p) => p.id !== productId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Desconto Exclusivo (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={upsellDiscount}
                      onChange={(e) => setUpsellDiscount(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Headline de Alto Impacto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ESPERE! Leve também o acesso ao nosso Grupo VIP de Mentoria por metade do preço!"
                    value={upsellHeadline}
                    onChange={(e) => setUpsellHeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link do Vídeo Explicativo (Opcional - Embed YouTube/Vimeo)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/embed/..."
                    value={upsellVideoUrl}
                    onChange={(e) => setUpsellVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Texto Persuasivo da Oferta
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explique os benefícios da mentoria exclusiva e por que ela acelera os resultados em 10x..."
                    value={upsellDescription}
                    onChange={(e) => setUpsellDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingUpsell}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSubmittingUpsell ? 'Salvando...' : 'Salvar Upsell de 1 Clique'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
