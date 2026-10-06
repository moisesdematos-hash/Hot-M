'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface PlatformMetrics {
  totalOrders: number;
  paidOrders: number;
  gmvByCurrency: Record<string, string>;
  totalUsers: number;
  creatorsCount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmountMinor: string;
  openTicketsCount: number;
  platformFeePercent: number;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PlatformSetting {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export default function AdminOperationsPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'METRICS' | 'USERS' | 'SETTINGS'>('METRICS');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Role edit modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('BUYER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/v1/admin/analytics'),
        fetch(`/api/v1/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`),
        fetch('/api/v1/admin/settings'),
      ]);

      const metricsData = await metricsRes.json();
      const usersData = await usersRes.json();
      const settingsData = await settingsRes.json();

      if (metricsRes.ok) setMetrics(metricsData.metrics);
      else setError(metricsData.error);

      if (usersRes.ok) setUsers(usersData.users || []);
      if (settingsRes.ok) setSettings(settingsData.settings || []);
    } catch {
      setError('Falha de comunicação com o servidor de administração');
    } finally {
      setIsLoading(false);
    }
  }, [userSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsUpdatingRole(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar papel');
      }

      setSuccess(`Papel do utilizador ${selectedUser.fullName || selectedUser.email} atualizado para ${newRole}!`);
      setSelectedUser(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na operação');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Painel
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Operações Globais</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Administração</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitorização de liquidez, governança de utilizadores e configurações da plataforma
          </p>
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          🛡️ Área Restrita (Admin / SuperAdmin)
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('METRICS')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'METRICS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          📊 KPIs da Plataforma
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'USERS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          👥 Gestão de Utilizadores ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'SETTINGS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          ⚙️ Configurações Globais
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm animate-pulse">
          Carregando dados de administração...
        </div>
      ) : activeTab === 'METRICS' ? (
        <div className="space-y-6">
          {/* GMV Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">GMV (Kwanza AOA)</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {metrics?.gmvByCurrency['AOA'] || '0.00'} Kz
              </div>
              <p className="text-[11px] text-slate-500">Volume bruto transacionado</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">GMV (Dólar USD)</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${metrics?.gmvByCurrency['USD'] || '0.00'}
              </div>
              <p className="text-[11px] text-slate-500">Vendas internacionais</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Saques Pendentes</span>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                {metrics?.pendingWithdrawalsCount}
              </div>
              <p className="text-[11px] text-slate-500">Aguardando liquidação bancária</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Chamados Abertos</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {metrics?.openTicketsCount}
              </div>
              <p className="text-[11px] text-slate-500">Disputas e suporte</p>
            </div>
          </div>

          {/* Platform Summary Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Resumo Operacional da Comunidade
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500">Utilizadores Registados</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {metrics?.totalUsers}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500">Produtores Ativos</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {metrics?.creatorsCount}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500">Taxa da Plataforma</span>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {metrics?.platformFeePercent}%
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-xs text-slate-500">Pedidos Liquidados</span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {metrics?.paidOrders} / {metrics?.totalOrders}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'USERS' ? (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Diretório de Utilizadores
            </h2>
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 w-full sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Nome & Email</th>
                  <th className="p-3.5">Papel Atual</th>
                  <th className="p-3.5">Data de Registo</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{u.fullName || 'Sem nome'}</div>
                      <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : u.role === 'SUPPORT'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : u.role === 'CREATOR'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        Alterar Papel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Parâmetros do Sistema (Platform Settings)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Chave</th>
                  <th className="p-3.5">Valor Atual</th>
                  <th className="p-3.5">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.map((s) => (
                  <tr key={s.key}>
                    <td className="p-3.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {s.key}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-blue-600 dark:text-blue-400">
                      {JSON.stringify(s.value)}
                    </td>
                    <td className="p-3.5 text-xs text-slate-500">
                      {s.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Definir Papel de Segurança (INV-010)
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Utilizador</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {selectedUser.fullName || selectedUser.email}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Novo Papel
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
                >
                  <option value="BUYER">BUYER (Comprador Padrão)</option>
                  <option value="CREATOR">CREATOR (Produtor de Conteúdo)</option>
                  <option value="AFFILIATE">AFFILIATE (Afiliado Comercial)</option>
                  <option value="SUPPORT">SUPPORT (Equipa de Atendimento)</option>
                  <option value="FINANCE">FINANCE (Operações Financeiras)</option>
                  <option value="ADMIN">ADMIN (Administrador)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Super Administrador)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdatingRole ? 'Salvando...' : 'Salvar Papel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
