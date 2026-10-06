'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserSession {
  id: string;
  email: string;
  role?: string;
  fullName?: string;
}

interface BalanceSummary {
  availableAmount: string;
  currency: string;
}


interface AnalyticsSummary {
  grossRevenueMajor: string;
  completedOrders: number;
  currency: string;
}

export default function DashboardMainHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardOverview() {
      try {
        // 1. Fetch Session
        const sessionRes = await fetch('/api/v1/auth/session');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.authenticated && sessionData.user) {
            setUser(sessionData.user);
          }
        }

        // 2. Fetch Balance
        try {
          const balRes = await fetch('/api/v1/finance/balance?currency=AOA');
          if (balRes.ok) {
            const balData = await balRes.json();
            if (balData.balance) {
              setBalance({
                availableAmount: balData.balance.availableAmount,
                currency: balData.balance.currency || 'AOA',
              });
            }
          }
        } catch {
          // ignore silent fail in overview
        }

        // 3. Fetch Products count
        try {
          const prodRes = await fetch('/api/v1/products');
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setProductCount((prodData.products || []).length);
          }
        } catch {
          // ignore
        }

        // 4. Fetch Analytics
        try {
          const anaRes = await fetch('/api/v1/analytics/creator?currency=AOA&days=30');
          if (anaRes.ok) {
            const anaData = await anaRes.json();
            if (anaData.analytics) {
              setAnalytics({
                grossRevenueMajor: anaData.analytics.grossRevenueMajor || '0.00',
                completedOrders: anaData.analytics.completedOrders || 0,
                currency: anaData.analytics.currency || 'AOA',
              });
            }
          }
        } catch {
          // ignore
        }

        // 5. Fetch Notifications
        try {
          const notifRes = await fetch('/api/v1/notifications?status=UNREAD&limit=10');
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            setUnreadNotifications((notifData.notifications || []).length);
          }
        } catch {
          // ignore
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardOverview();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      router.push('/auth/login');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-tight text-orange-600">
              <span className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                H
              </span>
              <span>HOT-M</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold">
                Painel Geral
              </Link>
              <Link href="/marketplace" className="px-3 py-1.5 rounded-lg text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-orange-950/30 transition flex items-center gap-1">
                <span>🔥</span> Hotplace
              </Link>
              <Link href="/dashboard/products" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Produtos
              </Link>
              <Link href="/dashboard/finance" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Finanças
              </Link>
              <Link href="/dashboard/analytics" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Métricas
              </Link>
              <Link href="/dashboard/affiliates" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Afiliados
              </Link>
              <Link href="/dashboard/support" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Suporte
              </Link>
              <Link href="/dashboard/admin" className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Admin
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Notificações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-600 ring-2 ring-white dark:ring-slate-900" />
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-900 dark:text-white">
                {user?.fullName || user?.email || 'Produtor HOT-M'}
              </p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                AO • MULTICAIXA ATIVO
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-8 space-y-6 sm:space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 p-6 sm:p-8 text-white shadow-xl shadow-orange-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white">
              🚀 Centro de Operações HOT-M
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bem-vindo, {user?.fullName || user?.email?.split('@')[0] || 'Produtor'}!
            </h1>
            <p className="text-orange-100 text-sm max-w-xl">
              Sua plataforma de vendas canônica para Angola e mercado global está 100% pronta com conciliação Multicaixa automática e razão contábil de dupla entrada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-600 shadow-md hover:bg-orange-50 transition"
            >
              <span>+</span> Criar Novo Produto
            </Link>
            <Link
              href="/dashboard/finance/withdraw"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-700/60 hover:bg-orange-700 border border-white/20 px-4 py-3 text-sm font-semibold text-white transition"
            >
              Solicitar Saque
            </Link>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Disponível */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Saldo Disponível</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Kz</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : `${Number(balance?.availableAmount || 0).toLocaleString('pt-AO')} Kz`}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Pronto para transferência</span>
              <Link href="/dashboard/finance" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                Ver carteira &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: Vendas Concluídas */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Vendas Concluídas (30d)</span>
              <span className="text-orange-600">📊</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : analytics?.completedOrders ?? 0}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Pedidos pagos com sucesso</span>
              <Link href="/dashboard/analytics" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                Ver métricas &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Faturamento Bruto */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Faturamento Total</span>
              <span className="text-blue-600">💳</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : `${Number(analytics?.grossRevenueMajor || 0).toLocaleString('pt-AO')} Kz`}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Volume gerado em ofertas</span>
              <Link href="/dashboard/analytics" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                Relatório &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4: Catálogo de Produtos */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Produtos Cadastrados</span>
              <span className="text-purple-600">📦</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : productCount}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Infoprodutos & Cursos</span>
              <Link href="/dashboard/products" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                Gerenciar &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Central Hub Navigation Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Módulos da Plataforma</h2>
            <span className="text-xs text-slate-500">Acesse qualquer ferramenta com 1 clique</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Module 1: Produtos */}
            <Link
              href="/dashboard/products"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  📦
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-orange-600 transition">
                  Produtos & Cursos
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Crie e gerencie e-books, mentorias, cursos em vídeo e arquivos digitais. Configure Order Bumps e Upsells de 1 clique.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-orange-600">
                <span>Gerenciar catálogo ({productCount})</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 2: Carteira & Finanças */}
            <Link
              href="/dashboard/finance"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  💰
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                  Carteira & Extrato
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Livro-razão contábil com auditoria imutável, saldo em multimoeda (AOA, USD, EUR, BRL) e solicitações de saque bancário.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span>Ver extrato de partidas dobradas</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 3: Afiliados & Coprodução */}
            <Link
              href="/dashboard/affiliates"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  🤝
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                  Afiliados & Co-produção
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Recrute parceiros para vender seu produto com atribuição por cookie e split financeiro instantâneo sem risco de estorno.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Configurar regras de comissão</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 4: Métricas & Analítica */}
            <Link
              href="/dashboard/analytics"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  📈
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                  Desempenho & Analytics
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Gráficos diários de faturamento, ticket médio, taxa de conversão do checkout e ranking de produtos mais vendidos.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-purple-600">
                <span>Explorar painel de vendas</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 5: Suporte & Disputas */}
            <Link
              href="/dashboard/support"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  🎧
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-rose-600 transition">
                  Suporte & Disputas
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Atendimento em tempo real com alunos, histórico de conversas e resolução amigável de solicitações de estorno.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-rose-600">
                <span>Abrir e gerenciar chamados</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 6: Notificações & Outbox */}
            <Link
              href="/dashboard/notifications"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  🔔
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                  Notificações & Alertas
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Feed de eventos de vendas, confirmação de recebimento ProxyPay Multicaixa e emails transacionais do sistema outbox.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-amber-600">
                <span>Ver alertas ({unreadNotifications} não lidos)</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 7: Admin Ops */}
            <Link
              href="/dashboard/admin"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  ⚙️
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-slate-600 transition">
                  Painel de Administração
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Supervisão de GMV global da plataforma, auditoria de usuários, comissões globais e taxas de câmbio multi-moeda.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Configurações avançadas</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Module 8: Área de Membros LMS */}
            <Link
              href="/library"
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold mb-4 group-hover:scale-105 transition">
                  🎓
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                  Área de Membros (LMS)
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Acesse os cursos como aluno, visualize o player de vídeo, o progresso das aulas e downloads de materiais complementares.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Acessar biblioteca de cursos</span>
                <span>&rarr;</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Steps Guide */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <h3 className="text-lg font-bold">Guia Rápido: Como Começar a Vender no HOT-M</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs font-bold text-orange-600 uppercase">Passo 1</span>
              <h4 className="font-bold mt-1 text-slate-900 dark:text-white">Cadastre seu Produto</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Defina o título, valor em Kwanzas (ex: 25.000 Kz) e adicione um arquivo ou curso.
              </p>
              <Link href="/dashboard/products/new" className="inline-block mt-3 text-xs font-bold text-orange-600 hover:underline">
                Criar Produto &rarr;
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs font-bold text-orange-600 uppercase">Passo 2</span>
              <h4 className="font-bold mt-1 text-slate-900 dark:text-white">Compartilhe o Checkout</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Envie o link de pagamento aos seus compradores com suporte a Multicaixa ProxyPay.
              </p>
              <Link href="/dashboard/products" className="inline-block mt-3 text-xs font-bold text-orange-600 hover:underline">
                Ver Meus Links &rarr;
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs font-bold text-orange-600 uppercase">Passo 3</span>
              <h4 className="font-bold mt-1 text-slate-900 dark:text-white">Receba e Saque</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                O saldo cai automaticamente no seu extrato contábil e você transfere para sua conta bancária.
              </p>
              <Link href="/dashboard/finance" className="inline-block mt-3 text-xs font-bold text-orange-600 hover:underline">
                Acessar Carteira &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 pt-2 flex items-center justify-around text-[10px] font-semibold text-slate-500 shadow-lg"
      >
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-orange-600 font-bold p-1">
          <span className="text-lg">🏠</span>
          <span>Início</span>
        </Link>
        <Link href="/dashboard/products" className="flex flex-col items-center gap-0.5 hover:text-orange-600 p-1">
          <span className="text-lg">📦</span>
          <span>Produtos</span>
        </Link>
        <Link href="/marketplace" className="flex flex-col items-center gap-0.5 text-orange-500 hover:text-orange-600 font-bold p-1">
          <span className="text-lg">🔥</span>
          <span>Hotplace</span>
        </Link>
        <Link href="/dashboard/finance" className="flex flex-col items-center gap-0.5 hover:text-orange-600 p-1">
          <span className="text-lg">💰</span>
          <span>Carteira</span>
        </Link>
        <Link href="/dashboard/notifications" className="relative flex flex-col items-center gap-0.5 hover:text-orange-600 p-1">
          <span className="text-lg">🔔</span>
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-orange-600" />
          )}
          <span>Alertas</span>
        </Link>
      </nav>
    </div>
  );
}
