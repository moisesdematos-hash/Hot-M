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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4 shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mx-auto">
          ⏳
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Pedido Registrado com Sucesso</h1>
        <p className="text-sm text-slate-500">
          ID do Pedido: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{order.id}</span>
        </p>

        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-left space-y-2 text-sm border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Status Atual:</span>
            <span className="font-bold text-amber-600">{order.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Valor Congelado:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{formattedAmount} {order.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Data de Registro:</span>
            <span>{new Date(order.created_at).toLocaleString('pt-AO')}</span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/pay/${order.id}`}
            className="inline-block w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition"
          >
            Emitir Referência de Pagamento Multicaixa
          </Link>
        </div>
      </div>
    </div>
  );
}
