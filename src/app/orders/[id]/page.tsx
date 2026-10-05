'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface OrderData {
  id: string;
  currency: string;
  total_amount_minor: string;
  status: string;
  created_at: string;
}

export default function OrderSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundFeedback, setRefundFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/v1/orders/${id}`);
        const data = await res.json();
        if (res.ok) {
          setOrder(data.order);
        } else {
          setError(data.error || 'Erro ao carregar pedido');
        }
      } catch {
        setError('Falha de conexão com o servidor');
      } finally {
        setIsLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  async function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!refundReason || refundReason.trim().length < 5) {
      setRefundFeedback('Por favor descreva o motivo do reembolso com pelo menos 5 caracteres.');
      return;
    }

    setIsSubmittingRefund(true);
    setRefundFeedback(null);

    try {
      const res = await fetch(`/api/v1/orders/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao solicitar reembolso');
      }

      setRefundFeedback('Solicitação de reembolso enviada com sucesso! Nossa equipe analisará em até 24 horas.');
      setShowRefundModal(false);
      if (order) {
        setOrder({ ...order, status: 'REFUND_REQUESTED' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na solicitação';
      setRefundFeedback(msg);
    } finally {
      setIsSubmittingRefund(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-500">Recuperando detalhes do pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Pedido não encontrado</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  const formattedAmount = (Number(order.total_amount_minor) / 100).toFixed(2);
  const isPaid = order.status === 'PAID' || order.status === 'FULFILLED';
  const isRefunded = order.status === 'REFUNDED';
  const isRefundRequested = order.status === 'REFUND_REQUESTED';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4 shadow-sm">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto ${
            isPaid
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
              : isRefunded
              ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
              : isRefundRequested
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
              : 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
          }`}
        >
          {isPaid ? '✓' : isRefunded ? '↩' : isRefundRequested ? '⏳' : '💳'}
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          {isPaid
            ? 'Pagamento Confirmado'
            : isRefunded
            ? 'Pedido Reembolsado'
            : isRefundRequested
            ? 'Reembolso em Análise'
            : 'Pedido Registrado'}
        </h1>

        <p className="text-sm text-slate-500">
          ID do Pedido: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{order.id}</span>
        </p>

        {refundFeedback && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs text-left">
            {refundFeedback}
          </div>
        )}

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-left space-y-2 text-sm border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Status Atual:</span>
            <span
              className={`font-bold ${
                isPaid
                  ? 'text-emerald-600'
                  : isRefunded
                  ? 'text-purple-600'
                  : isRefundRequested
                  ? 'text-amber-600'
                  : 'text-orange-600'
              }`}
            >
              {order.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Valor Congelado:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formattedAmount} {order.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Data de Registro:</span>
            <span>{new Date(order.created_at).toLocaleString('pt-AO')}</span>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          {isPaid && (
            <>
              <Link
                href="/library"
                className="inline-block w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition"
              >
                Acessar Conteúdo na Minha Biblioteca &rarr;
              </Link>

              <button
                type="button"
                onClick={() => setShowRefundModal(true)}
                className="inline-block text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Solicitar Reembolso (Garantia de 7 dias)
              </button>
            </>
          )}

          {!isPaid && !isRefunded && !isRefundRequested && (
            <Link
              href={`/pay/${order.id}`}
              className="inline-block w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition"
            >
              Emitir Referência de Pagamento Multicaixa
            </Link>
          )}

          {isRefundRequested && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
              Sua solicitação de reembolso foi registrada e está em análise pela equipe de moderação.
            </div>
          )}

          {isRefunded && (
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-xs">
              Este pedido foi reembolsado e os acessos aos downloads e aulas foram revogados conforme termos de serviço.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Reembolso */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Solicitar Reembolso</h3>
            <p className="text-xs text-slate-500">
              Conforme a política da HOT-M, você pode solicitar o reembolso total da compra dentro do período de garantia de 7 dias. Ao ser aprovado, o acesso ao produto é imediatamente revogado.
            </p>

            <form onSubmit={handleRefundSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Motivo da Solicitação
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Explique o motivo do pedido de reembolso..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  {isSubmittingRefund ? 'Enviando...' : 'Confirmar Reembolso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
