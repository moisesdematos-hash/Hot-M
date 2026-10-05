'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface QuoteData {
  quoteId: string;
  offerId: string;
  currency: string;
  baseAmount: string;
  discountAmount: string;
  orderBumpsAmount: string;
  totalAmount: string;
  expiresAt: string;
  appliedCoupon: { code: string; discountValue: number } | null;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuote() {
      try {
        const res = await fetch(`/api/v1/pricing/quote/${quoteId}`);
        const data = await res.json();
        if (res.ok) {
          setQuote(data.quote);
        } else {
          setError(data.error || 'Cotação inválida ou expirada');
        }
      } catch {
        setError('Falha de comunicação com o servidor');
      } finally {
        setIsLoading(false);
      }
    }
    loadQuote();
  }, [quoteId]);

  const handleCreateOrder = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao confirmar pedido');
      }

      router.push(`/orders/${data.order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-500">Validando cotação segura...</p>
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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 rounded-full mb-2">
          Ambiente Seguro de Compra (INV-001 Protegido)
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Finalizar Compra</h1>
        <p className="text-sm text-slate-500">Revise os valores oficiais antes de confirmar seu pedido</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          Resumo Financeiro da Cotação
        </h2>

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
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Ofertas Adicionais (Bumps)</span>
              <span>+ {quote.orderBumpsAmount} {quote.currency}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold pt-3 border-t border-slate-200 dark:border-slate-800">
            <span>Total Oficial a Pagar</span>
            <span className="text-orange-600">{quote.totalAmount} {quote.currency}</span>
          </div>
        </div>

        <button
          onClick={handleCreateOrder}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition"
        >
          {isSubmitting ? 'Gerando Pedido...' : 'Confirmar Pedido e Prosseguir para Pagamento'}
        </button>
      </div>
    </div>
  );
}
