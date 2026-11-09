'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface ActiveSponsorship {
  id: string;
  productId: string;
  planType: string;
  planName: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  remainingDays: number;
  isActive: boolean;
}

interface PlanItem {
  id: string;
  name: string;
  days: number;
  priceMinor: string;
  priceFormatted: string;
  isPopular?: boolean;
  discountBadge?: string;
  description: string;
}

interface CreatorBalance {
  availableAmount: string;
  availableAmountMinor: string;
  currency: string;
}

export default function ProductSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);

  const [productTitle, setProductTitle] = useState('');
  const [activeSponsorship, setActiveSponsorship] = useState<ActiveSponsorship | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [balance, setBalance] = useState<CreatorBalance | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('7_DAYS');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Carregar título do produto
      const prodRes = await fetch(`/api/v1/products/${productId}`);
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.product) {
        setProductTitle(prodData.product.title);
      }

      // 2. Carregar dados de patrocínio e saldo do criador
      const res = await fetch(`/api/v1/products/${productId}/sponsor`);
      const data = await res.json();

      if (res.ok) {
        setActiveSponsorship(data.activeSponsorship);
        setPlans(data.plans || []);
        setBalance(data.creatorBalance);
      } else {
        setError(data.error || 'Erro ao carregar dados de impulsionamento');
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

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const availableMinor = BigInt(balance?.availableAmountMinor || '0');
  const planMinor = BigInt(selectedPlan?.priceMinor || '0');
  const hasSufficientBalance = availableMinor >= planMinor;

  async function handleActivateSponsorship() {
    if (!selectedPlan) return;
    if (!hasSufficientBalance) {
      setError(
        `Saldo insuficiente (${balance?.availableAmount || '0'} Kz). O plano ${selectedPlan.name} custa ${selectedPlan.priceFormatted}.`
      );
      return;
    }

    const confirmActivation = window.confirm(
      `Deseja impulsionar "${productTitle}" com o plano "${selectedPlan.name}" (${selectedPlan.priceFormatted})?\n\nO valor será debitado do seu saldo do criador e seu produto ficará no topo do Hotplace com selo dourado imediatamente.`
    );
    if (!confirmActivation) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/products/${productId}/sponsor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao ativar impulsionamento');
      } else {
        setSuccess(
          `🚀 Impulsionamento ativado com sucesso! "${productTitle}" está no topo do Hotplace por ${selectedPlan.days} dias.`
        );
        await loadData();
      }
    } catch {
      setError('Falha na comunicação com o servidor');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* 1. Header & Navegação */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-800 dark:hover:text-slate-200">
            Painel
          </Link>
          <span>/</span>
          <Link href="/dashboard/products" className="hover:text-slate-800 dark:hover:text-slate-200">
            Produtos
          </Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-xs">
            {productTitle || productId}
          </span>
          <span>/</span>
          <span className="text-amber-600 font-bold">Impulsionamento (HOT-M Ads)</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🚀</span> HOT-M Ads &bull; Impulsionar Produto
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Coloque seu infoproduto no topo do catálogo oficial do <strong>Hotplace</strong> e multiplique suas vendas em Angola.
            </p>
          </div>

          <Link
            href="/dashboard/products"
            className="self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            &larr; Voltar aos Produtos
          </Link>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* 2. Status Atual do Impulsionamento */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📊</span> Status do Impulsionamento no Hotplace
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Carregando dados...</div>
        ) : activeSponsorship && activeSponsorship.isActive ? (
          <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                <span>⭐</span> ATIVO NO TOPO DO HOTPLACE
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                ⏳ {activeSponsorship.remainingDays} dia{activeSponsorship.remainingDays === 1 ? '' : 's'} restante{activeSponsorship.remainingDays === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <span className="text-slate-500 block">Plano Vigente:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{activeSponsorship.planName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Início:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(activeSponsorship.startsAt).toLocaleDateString('pt-AO')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Expira em:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(activeSponsorship.expiresAt).toLocaleDateString('pt-AO')}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-amber-500/20">
              💡 <em>Dica: Se ativar um novo plano agora, os dias serão automaticamente somados à data de término existente!</em>
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
              <span>⏸️</span> Nenhum impulsionamento ativo para este produto.
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Produtos impulsionados recebem <strong>mais de 3.5x mais visualizações</strong> no Hotplace e conversão acelerada por tráfego orgânico nativo de Angola.
            </p>
          </div>
        )}
      </div>

      {/* 3. Saldo do Criador & Planos */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>💰</span> Escolha um Plano de Impulsionamento
            </h2>
            <p className="text-xs text-slate-500">
              O investimento é debitado diretamente do saldo acumulado das suas vendas.
            </p>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Seu Saldo Disponível
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {balance ? `${balance.availableAmount} ${balance.currency === 'AOA' ? 'Kz' : balance.currency}` : 'Carregando...'}
            </span>
          </div>
        </div>

        {/* Grade de 4 Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const canAfford = availableMinor >= BigInt(plan.priceMinor);

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition relative flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Badges de Destaque */}
                <div className="flex items-center justify-between gap-1">
                  {plan.isPopular ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                      ⭐ Mais Popular
                    </span>
                  ) : plan.discountBadge ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                      {plan.discountBadge}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {plan.days} Dias
                    </span>
                  )}

                  <input
                    type="radio"
                    name="sponsorPlan"
                    checked={isSelected}
                    onChange={() => setSelectedPlanId(plan.id)}
                    className="accent-amber-500"
                  />
                </div>

                {/* Nome e Preço */}
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {plan.priceFormatted}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{plan.description}</p>
                </div>

                {/* Footer do Card */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  {canAfford ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span>✓</span> Saldo suficiente
                    </span>
                  ) : (
                    <span className="text-red-500 font-medium">Saldo insuficiente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão de Ativação */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {selectedPlan && (
              <span>
                Plano selecionado: <strong className="text-slate-800 dark:text-slate-200">{selectedPlan.name}</strong> por{' '}
                <strong className="text-amber-600 font-black">{selectedPlan.priceFormatted}</strong> ({selectedPlan.days} dias de destaque).
              </span>
            )}
          </div>

          <button
            onClick={handleActivateSponsorship}
            disabled={isSubmitting || !hasSufficientBalance}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
              hasSufficientBalance && !isSubmitting
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span>Processando ativação...</span>
            ) : hasSufficientBalance ? (
              <>
                <span>🚀</span>
                <span>Ativar Impulsionamento Agora ({selectedPlan?.priceFormatted})</span>
              </>
            ) : (
              <span>Saldo Insuficiente para Ativar</span>
            )}
          </button>
        </div>
      </div>

      {/* 4. Dúvidas Frequentes sobre HOT-M Ads */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <span>ℹ️</span> Como funciona o HOT-M Ads?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">🥇 Posição Prioritária</span>
            <p>Seu produto é exibido nas primeiras posições de busca e categorias no Hotplace, independente da temperatura inicial.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">⭐ Selo Dourado Oficial</span>
            <p>O produto ganha o distintivo exclusivo &quot;⭐ PATROCINADO&quot; e borda dourada chamando atenção imediata dos compradores.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">⚡ Renovação Cumulativa</span>
            <p>Se você contratar mais dias enquanto outro plano estiver ativo, o novo período é somado à data de término sem perda de dias.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
