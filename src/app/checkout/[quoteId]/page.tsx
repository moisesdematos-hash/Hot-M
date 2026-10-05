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

interface CheckoutSettings {
  showCountdownTimer: boolean;
  countdownMinutes: number;
  timerHeadline: string;
  showSecurityBadges: boolean;
  guaranteeDays: number;
  showSocialProof: boolean;
  primaryColor: string;
}

interface TestimonialItem {
  id: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  rating: number;
}

const SOCIAL_PROOF_NOTIFICATIONS = [
  { name: 'Ana M.', city: 'Luanda', time: 'há 2 minutos' },
  { name: 'Carlos S.', city: 'Benguela', time: 'há 4 minutos' },
  { name: 'Esperança T.', city: 'Huambo', time: 'há 7 minutos' },
  { name: 'Manuel K.', city: 'Luanda', time: 'há 10 minutos' },
  { name: 'Beatriz F.', city: 'Lubango', time: 'há 12 minutos' },
];

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
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [socialProofIndex, setSocialProofIndex] = useState(0);
  const [showSocialToast, setShowSocialToast] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingQuote, setIsUpdatingQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuoteAndCustomizer = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/pricing/quote/${quoteId}`);
      const data = await res.json();
      if (res.ok) {
        setQuote(data.quote);
        const activeBumps = data.quote.orderBumpOfferIds || [];
        setSelectedBumpOfferIds(activeBumps);

        if (data.quote.productId) {
          // 1. Fetch bumps
          const bumpsRes = await fetch(`/api/v1/products/${data.quote.productId}/bumps`);
          const bumpsData = await bumpsRes.json();
          if (bumpsRes.ok && bumpsData.bumps) {
            setAvailableBumps(bumpsData.bumps);
          }

          // 2. Fetch checkout customization
          const customizerRes = await fetch(`/api/v1/products/${data.quote.productId}/checkout-customizer`);
          const customizerData = await customizerRes.json();
          if (customizerRes.ok) {
            if (customizerData.settings) {
              setCheckoutSettings(customizerData.settings);
              setTimeLeft(customizerData.settings.countdownMinutes * 60);
            }
            if (customizerData.testimonials) {
              setTestimonials(customizerData.testimonials);
            }
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
    loadQuoteAndCustomizer();
  }, [loadQuoteAndCustomizer]);

  // Countdown timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Social proof rotating interval
  useEffect(() => {
    const toastInterval = setInterval(() => {
      setShowSocialToast(false);
      setTimeout(() => {
        setSocialProofIndex((prev) => (prev + 1) % SOCIAL_PROOF_NOTIFICATIONS.length);
        setShowSocialToast(true);
      }, 800);
    }, 9000);
    return () => clearInterval(toastInterval);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

  const primaryColor = checkoutSettings?.primaryColor || '#2563eb';

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

  const currentNotification = SOCIAL_PROOF_NOTIFICATIONS[socialProofIndex];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-16">
      {/* 1. Urgency Countdown Timer Bar */}
      {checkoutSettings?.showCountdownTimer && (
        <div
          className="py-2.5 px-4 text-center text-xs font-bold text-white shadow-md sticky top-0 z-40"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2">
            <span>⚡ {checkoutSettings.timerHeadline}</span>
            <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-sm tracking-wider">
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Trust & Guarantee Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 rounded-full mb-2">
            Ambiente Seguro de Compra (INV-001 Protegido)
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Finalizar Compra</h1>
          <p className="text-sm text-slate-500">Revise os valores oficiais antes de confirmar seu pedido</p>
        </div>

        {/* 2. Available Order Bumps Section */}
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

        {/* 3. Financial Summary */}
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
              <span className="text-lg" style={{ color: primaryColor }}>
                {quote.totalAmount} {quote.currency}
              </span>
            </div>
          </div>

          <button
            onClick={handleCreateOrder}
            disabled={isSubmitting || isUpdatingQuote}
            className="w-full rounded-xl py-4 px-6 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition shadow-xl"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? 'Gerando Pedido...' : 'PAGAR COM MULTICAIXA PROXYPAY'}
          </button>

          {/* 4. Security & Guarantee Badges */}
          {checkoutSettings?.showSecurityBadges && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="text-emerald-500 text-base">🛡️</span>
                <span>Garantia de {checkoutSettings.guaranteeDays} Dias</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-500 text-base">🔒</span>
                <span>Pagamento Criptografado</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-amber-500 text-base">⚡</span>
                <span>Acesso Imediato</span>
              </div>
            </div>
          )}
        </div>

        {/* 5. Customer Testimonials */}
        {testimonials.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Depoimentos de Quem Já Adquiriu
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{t.authorName}</p>
                      {t.authorRole && <p className="text-slate-400 text-[10px]">{t.authorRole}</p>}
                    </div>
                    <span className="text-amber-400 font-mono tracking-widest">
                      {'★'.repeat(t.rating)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    &ldquo;{t.content}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Social Proof Toast Notification (Bottom Left) */}
      {checkoutSettings?.showSocialProof && showSocialToast && currentNotification && (
        <div className="fixed bottom-4 left-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-3 text-xs animate-in slide-in-from-bottom duration-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <p className="font-semibold text-slate-200">
              {currentNotification.name} ({currentNotification.city})
            </p>
            <p className="text-[11px] text-slate-400">comprou este produto {currentNotification.time}</p>
          </div>
        </div>
      )}
    </div>
  );
}
