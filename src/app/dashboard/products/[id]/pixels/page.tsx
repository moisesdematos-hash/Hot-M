'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface PixelItem {
  id: string;
  provider: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS';
  pixelId: string;
  triggerEvents: string[];
  isActive: boolean;
  createdAt: string;
}

export default function ProductPixelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);

  const [pixels, setPixels] = useState<PixelItem[]>([]);
  const [productTitle, setProductTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState<'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS'>('FACEBOOK');
  const [pixelId, setPixelId] = useState('');
  const [trackCheckout, setTrackCheckout] = useState(true);
  const [trackPayment, setTrackPayment] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Load product info
      const prodRes = await fetch(`/api/v1/products/${productId}`);
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.product) {
        setProductTitle(prodData.product.title);
      }

      // 2. Load pixels
      const res = await fetch(`/api/v1/products/${productId}/pixels`);
      const data = await res.json();

      if (res.ok) {
        setPixels(data.pixels || []);
      } else {
        setError(data.error || 'Erro ao carregar pixels');
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

  async function handleAddPixel(e: React.FormEvent) {
    e.preventDefault();
    if (!pixelId.trim()) {
      setError('Informe o ID do Pixel');
      return;
    }

    const events: string[] = [];
    if (trackCheckout) events.push('INITIATE_CHECKOUT');
    if (trackPayment) events.push('ADD_PAYMENT_INFO');
    if (trackPurchase) events.push('PURCHASE');

    if (events.length === 0) {
      setError('Selecione pelo menos um evento para rastrear');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/products/${productId}/pixels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          pixelId: pixelId.trim(),
          triggerEvents: events,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Pixel ${provider} configurado com sucesso!`);
        setPixelId('');
        loadData();
      } else {
        setError(data.error || 'Falha ao salvar pixel');
      }
    } catch {
      setError('Erro ao se comunicar com o servidor');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePixel(id: string) {
    if (!confirm('Deseja realmente remover este pixel de rastreamento?')) return;

    try {
      const res = await fetch(`/api/v1/products/${productId}/pixels?pixelId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Pixel removido com sucesso!');
        loadData();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao remover pixel');
      }
    } catch {
      setError('Falha ao remover pixel');
    }
  }

  const getProviderInfo = (prov: string) => {
    switch (prov) {
      case 'FACEBOOK':
        return {
          name: 'Meta (Facebook & Instagram)',
          color: 'bg-blue-600',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: '🔵',
          placeholder: 'Ex: 123456789012345',
          hint: 'Encontre o ID no Gerenciador de Eventos da Meta.',
        };
      case 'TIKTOK':
        return {
          name: 'TikTok Ads',
          color: 'bg-slate-900',
          textColor: 'text-slate-900 dark:text-slate-100',
          icon: '🎵',
          placeholder: 'Ex: C9876543210ABC',
          hint: 'Localize no TikTok Ads Manager > Assets > Events.',
        };
      case 'GOOGLE_ADS':
        return {
          name: 'Google Ads / Analytics',
          color: 'bg-amber-600',
          textColor: 'text-amber-600 dark:text-amber-400',
          icon: '🌐',
          placeholder: 'Ex: AW-123456789 ou G-XXXXXX',
          hint: 'Código de conversão do Google Ads ou Measurement ID do GA4.',
        };
      default:
        return {
          name: prov,
          color: 'bg-slate-600',
          textColor: 'text-slate-600',
          icon: '📊',
          placeholder: 'ID do Pixel',
          hint: '',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
              <Link href="/dashboard/products" className="hover:text-orange-500 transition">
                Produtos
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-medium">Pixels & Tráfego Pago</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Rastreamento de Campanhas & Pixels
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Produto: <span className="font-semibold text-slate-800 dark:text-slate-200">{productTitle || 'Carregando...'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/products/${productId}/funnel`}
              className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold px-3 py-2 rounded-lg transition"
            >
              ⚡ Funil de Vendas
            </Link>
            <Link
              href={`/dashboard/products/${productId}/checkout-customizer`}
              className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold px-3 py-2 rounded-lg transition"
            >
              🎨 Checkout
            </Link>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Formulário e Pixels Configurados */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card: Adicionar Novo Pixel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Adicionar Pixel de Rastreamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Rastreie visitantes, conversões no checkout e pagamentos confirmados via Multicaixa Express automaticamente.
              </p>

              <form onSubmit={handleAddPixel} className="space-y-4">
                {/* Seleção do Provedor */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Plataforma de Tráfego / Anúncios
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider('FACEBOOK')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        provider === 'FACEBOOK'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-lg">🔵</span>
                      <span>Meta / Facebook</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider('TIKTOK')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        provider === 'TIKTOK'
                          ? 'border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-2 ring-slate-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-lg">🎵</span>
                      <span>TikTok Ads</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider('GOOGLE_ADS')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        provider === 'GOOGLE_ADS'
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-lg">🌐</span>
                      <span>Google Ads</span>
                    </button>
                  </div>
                </div>

                {/* Input do Pixel ID */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ID do Pixel / Tag de Conversão
                  </label>
                  <input
                    type="text"
                    required
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    placeholder={getProviderInfo(provider).placeholder}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {getProviderInfo(provider).hint}
                  </p>
                </div>

                {/* Seleção de Eventos */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Eventos a Disparar
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trackCheckout}
                        onChange={(e) => setTrackCheckout(e.target.checked)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span><strong>InitiateCheckout</strong> — Dispara quando o cliente abre o checkout</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trackPayment}
                        onChange={(e) => setTrackPayment(e.target.checked)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span><strong>AddPaymentInfo</strong> — Dispara quando o cliente gera a referência Multicaixa de 9 dígitos</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trackPurchase}
                        onChange={(e) => setTrackPurchase(e.target.checked)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span><strong>Purchase</strong> — Dispara quando a compra é confirmada com o valor exato em Kwanzas</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando Pixel...' : 'Salvar Pixel no Produto'}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Pixels Configurados */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                Pixels Ativos Neste Produto ({pixels.length})
              </h2>

              {isLoading ? (
                <p className="text-xs text-slate-500 py-6 text-center animate-pulse">Carregando pixels...</p>
              ) : pixels.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Nenhum pixel configurado ainda</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adicione seu Pixel acima para começar a rastrear o tráfego dos seus anúncios.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pixels.map((item) => {
                    const info = getProviderInfo(item.provider);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{info.icon}</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {info.name}
                            </span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                              Ativo
                            </span>
                          </div>
                          <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                            ID: <span className="font-semibold text-slate-900 dark:text-white">{item.pixelId}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.triggerEvents.map((ev) => (
                              <span
                                key={ev}
                                className="text-[10px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                              >
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePixel(item.id)}
                          className="self-end sm:self-center text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 p-2 rounded-lg transition"
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Guia e Dicas de Tráfego Pago */}
          <div className="space-y-6">
            {/* Box: Rastreamento de UTMs */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5 mb-2">
                <span>🎯</span> Rastreamento de Origem (UTMs)
              </h3>
              <p className="text-xs text-orange-900/80 dark:text-orange-300/80 leading-relaxed mb-3">
                O HOT-M captura automaticamente os parâmetros de campanha dos seus anúncios. Basta adicionar os parâmetros na URL de divulgação do seu checkout:
              </p>
              <div className="bg-white/80 dark:bg-black/40 p-2.5 rounded-lg border border-orange-200/60 dark:border-orange-900/40 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all select-all">
                ?utm_source=instagram&utm_campaign=blackfriday&src=bio
              </div>
              <p className="text-[11px] text-orange-800/70 dark:text-orange-400 mt-2">
                Essas informações ficam salvas no pedido para você saber exatamente qual anúncio gerou cada venda no Multicaixa.
              </p>
            </div>

            {/* Box: Como testar o Pixel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🛠️</span> Como Testar o seu Pixel
              </h3>
              <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Instale a extensão gratuita <strong className="text-slate-800 dark:text-slate-200">Meta Pixel Helper</strong> no Google Chrome.
                </li>
                <li>
                  Abra o checkout do seu produto em uma aba anônima.
                </li>
                <li>
                  O ícone da extensão ficará verde mostrando o evento <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">InitiateCheckout</code> disparado com sucesso!
                </li>
              </ol>
            </div>

            {/* Box: Conversão no Multicaixa */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>⚡</span> Otimização de Anúncios
              </h3>
              <p>
                Configure suas campanhas no Meta Ads ou TikTok Ads otimizando para o objetivo de <strong className="text-slate-800 dark:text-slate-200">Compras (Purchase)</strong>.
              </p>
              <p>
                O algoritmo aprende rapidamente quais perfis de utilizadores em Angola têm o hábito de pagar pelo Multicaixa Express.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
