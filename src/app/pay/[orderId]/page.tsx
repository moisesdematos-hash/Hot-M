'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface PaymentAttemptData {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string;
  currency: string;
  instructions: {
    entity?: string;
    reference?: string;
    amount?: string;
    expiresAt?: string;
  };
  expires_at: string;
  status: string;
}

export default function PaymentInstructionsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [attempt, setAttempt] = useState<PaymentAttemptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrInitiatePayment() {
      try {
        // Primeiro tenta recuperar tentativa existente
        const checkRes = await fetch(`/api/v1/payments/${orderId}`);
        const checkData = await checkRes.json();

        if (checkRes.ok && checkData.paymentAttempt) {
          setAttempt(checkData.paymentAttempt);
          setIsLoading(false);
          return;
        }

        // Se não houver, inicia nova tentativa de pagamento oficial
        const initRes = await fetch('/api/v1/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const initData = await initRes.json();
        if (initRes.ok) {
          setAttempt(initData.paymentAttempt);
        } else {
          setError(initData.error || 'Falha ao gerar referência Multicaixa');
        }
      } catch {
        setError('Erro de comunicação com o servidor');
      } finally {
        setIsLoading(false);
      }
    }

    loadOrInitiatePayment();
  }, [orderId]);

  const handleCopyReference = () => {
    const ref = attempt?.instructions.reference || attempt?.provider_reference;
    if (ref) {
      navigator.clipboard.writeText(ref);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-slate-500">Emitindo referência bancária Multicaixa oficial...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Erro no Pagamento</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error || 'Não foi possível carregar os dados.'}</p>
          <Link href={`/orders/${orderId}`} className="text-sm text-orange-600 hover:underline inline-block mt-2">
            Voltar ao Pedido
          </Link>
        </div>
      </div>
    );
  }

  const rawRef = attempt.instructions.reference || attempt.provider_reference || '';
  const formattedRef = rawRef.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const entity = attempt.instructions.entity || '99999';
  const amount = attempt.instructions.amount || '0.00';
  const expiresAt = new Date(attempt.expires_at).toLocaleString('pt-AO');

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase text-orange-700 bg-orange-100 dark:bg-orange-950 dark:text-orange-400 rounded-full mb-2">
          ProxyPay Angola • Pagamento Multicaixa
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Referência Multicaixa Emitida</h1>
        <p className="text-sm text-slate-500">Pague no Multicaixa Express, Internet Banking ou em qualquer ATM</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xs uppercase text-slate-500 font-semibold block">Entidade</span>
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 block">
              {entity}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60">
            <span className="text-xs uppercase text-orange-600 dark:text-orange-400 font-semibold block">Valor a Pagar</span>
            <span className="text-2xl font-mono font-bold text-orange-600 dark:text-orange-400 mt-1 block">
              {amount} {attempt.currency}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center space-y-2">
          <span className="text-xs uppercase text-slate-500 font-semibold block">Referência Multicaixa (9 Dígitos)</span>
          <div className="text-3xl font-mono font-extrabold tracking-widest text-slate-900 dark:text-slate-100">
            {formattedRef}
          </div>
          <button
            onClick={handleCopyReference}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition"
          >
            {isCopied ? '✓ Copiado!' : 'Copiar Referência'}
          </button>
        </div>

        <div className="text-xs text-center text-slate-500">
          Válido até: <span className="font-semibold text-slate-700 dark:text-slate-300">{expiresAt}</span>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
          <p className="font-bold text-slate-800 dark:text-slate-200">Como pagar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra o <strong>Multicaixa Express</strong> ou vá a um <strong>ATM</strong>.</li>
            <li>Selecione a opção <strong>Pagamentos</strong> &gt; <strong>Pagamento por Referência</strong>.</li>
            <li>Insira a Entidade: <strong className="text-slate-900 dark:text-slate-100">{entity}</strong>.</li>
            <li>Insira a Referência: <strong className="text-slate-900 dark:text-slate-100">{formattedRef}</strong>.</li>
            <li>Confirme o valor de <strong className="text-slate-900 dark:text-slate-100">{amount} {attempt.currency}</strong> e valide o pagamento.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
