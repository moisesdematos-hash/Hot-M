'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';

interface QuoteData {
  quoteId: string;
  offerId: string;
  productId?: string;
  currency: string;
  baseAmount: string;
  discountAmount: string;
  orderBumpsAmount: string;
  totalAmount: string;
  expiresAt: string;
  appliedCoupon: { code: string; discountValue: number } | null;
  orderBumpOfferIds?: string[];
}

interface OrderBumpItem {
  id: string;
  productId: string;
  bumpProductId: string;
  bumpOfferId: string;
  headline: string;
  description: string | null;
  bumpProduct: {
    id: string;
    title: string;
    coverImageUrl: string | null;
  };
  bumpOffer?: {
    id: string;
    priceAmount: string;
    currency: string;
  };
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = use(params);
  const router = useRouter();

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [availableBumps, setAvailableBumps] = useState<OrderBumpItem[]>([]);
  const [selectedBumpOfferIds, setSelectedBumpOfferIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingQuote, setIsUpdatingQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuoteAndBumps = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/pricing/quote/${quoteId}`);
      const data = await res.json();
      if (res.ok) {
        setQuote(data.quote);
        const activeBumps = data.quote.orderBumpOfferIds || [];
        setSelectedBumpOfferIds(activeBumps);

        // Fetch bumps if productId is available
        if (data.quote.productId) {
          const bumpsRes = await fetch(`/api/v1/products/${data.quote.productId}/bumps`);
          const bumpsData = await bumpsRes.json();
          if (bumpsRes.ok && bumpsData.bumps) {
            setAvailableBumps(bumpsData.bumps);
          }
        }
      } else {
        setError(data.error || 'Cotação inválida ou expirada');
      }
    } catch {
      setError('Falha de comunicação com o servidor');
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadQuoteAndBumps();
  }, [loadQuoteAndBumps]);

  const handleToggleBump = async (bumpOfferId: string) => {
    if (!quote) return;
    setIsUpdatingQuote(true);
    setError(null);

    const isSelected = selectedBumpOfferIds.includes(bumpOfferId);
    const newSelected = isSelected
      ? selectedBumpOfferIds.filter((id) => id !== bumpOfferId)
      : [...selectedBumpOfferIds, bumpOfferId];

    try {
      const res = await fetch('/api/v1/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: quote.offerId,
          currency: quote.currency,
          couponCode: quote.appliedCoupon?.code,
          orderBumpOfferIds: newSelected,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao recalcular cotação');
      }

      setQuote(data.quote);
      setSelectedBumpOfferIds(newSelected);
      // Smoothly update router URL without reload
      window.history.replaceState(null, '', `/checkout/${data.quote.quoteId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar valor com o Order Bump');
    } finally {
      setIsUpdatingQuote(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!quote) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.quoteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao confirmar pedido');
      }

      // Check if product has active upsell funnel configured
      const orderId = data.order.id;
      if (quote.productId) {
        const upsellRes = await fetch(`/api/v1/products/${quote.productId}/upsells`);
        const upsellData = await upsellRes.json();
        if (upsellRes.ok && upsellData.upsell) {
          router.push(`/checkout/upsell/${orderId}`);
          return;
        }
      }

      router.push(`/pay/${orderId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-500 text-sm animate-pulse">Validando cotação segura (INV-001)...</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Cotação Indisponível</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error || 'Não foi possível carregar os dados.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Trust & Guarantee Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 rounded-full mb-2">
          Ambiente Seguro de Compra (INV-001 Protegido)
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Finalizar Compra</h1>
        <p className="text-sm text-slate-500">Revise os valores oficiais antes de confirmar seu pedido</p>
      </div>

      {/* Available Order Bumps Section */}
      {availableBumps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Ofertas Especiais Disponíveis
          </h2>
          {availableBumps.map((bump) => {
            const isChecked = selectedBumpOfferIds.includes(bump.bumpOfferId);
            return (
              <div
                key={bump.id}
                onClick={() => !isUpdatingQuote && handleToggleBump(bump.bumpOfferId)}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  isChecked
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-md'
                    : 'border-dashed border-amber-400 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-500'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isUpdatingQuote}
                    onChange={() => handleToggleBump(bump.bumpOfferId)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                        ⚡ Oferta Única
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {bump.headline}
                      </span>
                    </div>
                    {bump.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {bump.description}
                      </p>
                    )}
                    {bump.bumpOffer && (
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 pt-1">
                        + {bump.bumpOffer.priceAmount} {bump.bumpOffer.currency} adicionados ao pedido
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Financial Summary */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="font-semibold text-base">Resumo Financeiro da Cotação</h2>
          {isUpdatingQuote && (
            <span className="text-xs text-blue-600 animate-pulse font-medium">Recalculando...</span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
            <span className="font-medium">{quote.baseAmount} {quote.currency}</span>
          </div>

          {Number(quote.discountAmount) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Desconto ({quote.appliedCoupon?.code})</span>
              <span>- {quote.discountAmount} {quote.currency}</span>
            </div>
          )}

          {Number(quote.orderBumpsAmount) > 0 && (
            <div className="flex justify-between text-blue-600 font-medium">
              <span>Ofertas Adicionais (Order Bumps)</span>
              <span>+ {quote.orderBumpsAmount} {quote.currency}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold pt-3 border-t border-slate-200 dark:border-slate-800">
            <span>Total Oficial a Pagar</span>
            <span className="text-blue-600 text-lg">{quote.totalAmount} {quote.currency}</span>
          </div>
        </div>

        <button
          onClick={handleCreateOrder}
          disabled={isSubmitting || isUpdatingQuote}
          className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
        >
          {isSubmitting ? 'Gerando Pedido...' : 'Confirmar Pedido e Prosseguir para Pagamento'}
        </button>
      </div>
    </div>
  );
}
