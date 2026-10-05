'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UpsellData {
  id: string;
  productId: string;
  upsellProductId: string;
  upsellOfferId: string;
  headline: string;
  description: string | null;
  videoUrl: string | null;
  discountPercentage: number;
  upsellProduct: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
  pricing?: {
    originalAmount: string;
    discountedAmount: string;
    currency: string;
  };
}

export default function PostPurchaseUpsellPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const router = useRouter();

  const [upsell, setUpsell] = useState<UpsellData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUpsell() {
      try {
        // 1. Fetch order to identify base product
        const orderRes = await fetch(`/api/v1/orders/${orderId}`);
        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.order) {
          router.replace(`/orders/${orderId}`);
          return;
        }

        const items = orderData.order.order_items || [];
        const baseProductId = items[0]?.product_id;

        if (!baseProductId) {
          router.replace(`/orders/${orderId}`);
          return;
        }

        // 2. Fetch upsell configured for this product
        const upsellRes = await fetch(`/api/v1/products/${baseProductId}/upsells`);
        const upsellData = await upsellRes.json();

        if (upsellRes.ok && upsellData.upsell) {
          setUpsell(upsellData.upsell);
        } else {
          // If no upsell configured, proceed directly to pay/order summary
          router.replace(`/orders/${orderId}`);
        }
      } catch {
        router.replace(`/orders/${orderId}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadUpsell();
  }, [orderId, router]);

  const handleAcceptUpsell = async () => {
    if (!upsell) return;
    setIsAccepting(true);
    setError(null);

    try {
      // 1. Create quote for upsell offer
      const quoteRes = await fetch('/api/v1/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: upsell.upsellOfferId,
          currency: upsell.pricing?.currency || 'AOA',
        }),
      });

      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) {
        throw new Error(quoteData.error || 'Erro ao gerar cotação da oferta');
      }

      // 2. Create order for the upsell product
      const orderRes = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quoteData.quote.quoteId,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Erro ao registrar pedido do upsell');
      }

      // Redirect to payment page of the new upsell order
      router.push(`/pay/${orderData.order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao processar oferta');
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-slate-400 text-sm animate-pulse">Carregando oferta exclusiva...</p>
      </div>
    );
  }

  if (!upsell) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-center">
        {/* Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <span>⚡</span>
          <span>Oferta Única de 1 Clique — Válida Apenas Agora</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {upsell.headline}
          </h1>
          {upsell.description && (
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              {upsell.description}
            </p>
          )}
        </div>

        {/* Video or Image feature */}
        {upsell.videoUrl ? (
          <div className="aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
            <iframe
              src={upsell.videoUrl}
              title="Upsell Video"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-800 flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center text-3xl font-bold">
              🎁
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-white">{upsell.upsellProduct.title}</h3>
              <p className="text-xs text-slate-400">Acesso vitalício com liberação imediata na sua biblioteca.</p>
            </div>
          </div>
        )}

        {/* Pricing Box */}
        {upsell.pricing && (
          <div className="bg-gradient-to-r from-blue-900/30 via-slate-800 to-purple-900/30 p-5 rounded-2xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-around gap-4">
            <div>
              <span className="text-xs text-slate-400 block line-through">
                De: {upsell.pricing.originalAmount} {upsell.pricing.currency}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                Por: {upsell.pricing.discountedAmount} {upsell.pricing.currency}
              </span>
            </div>
            {upsell.discountPercentage > 0 && (
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-full">
                {upsell.discountPercentage}% de Desconto Imediato
              </span>
            )}
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4 pt-2">
          <button
            onClick={handleAcceptUpsell}
            disabled={isAccepting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {isAccepting ? 'Processando Oferta...' : 'SIM! ADICIONAR ESTA OFERTA AO MEU PEDIDO'}
          </button>

          <Link
            href={`/pay/${orderId}`}
            className="block text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4"
          >
            Não, obrigado. Quero apenas prosseguir com meu pedido original &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
