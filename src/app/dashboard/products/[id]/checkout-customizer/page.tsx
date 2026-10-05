'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface CheckoutSettings {
  productId: string;
  showCountdownTimer: boolean;
  countdownMinutes: number;
  timerHeadline: string;
  showSecurityBadges: boolean;
  guaranteeDays: number;
  showSocialProof: boolean;
  primaryColor: string;
  bannerUrl: string | null;
}

interface TestimonialItem {
  id: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  rating: number;
}

export default function CheckoutCustomizerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);

  const [settings, setSettings] = useState<CheckoutSettings>({
    productId,
    showCountdownTimer: true,
    countdownMinutes: 15,
    timerHeadline: 'Oferta com tempo limitado! Garanta sua vaga com desconto:',
    showSecurityBadges: true,
    guaranteeDays: 7,
    showSocialProof: true,
    primaryColor: '#2563eb',
    bannerUrl: null,
  });

  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New testimonial form
  const [newAuthor, setNewAuthor] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newRating, setNewRating] = useState('5');
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/products/${productId}/checkout-customizer`);
      const data = await res.json();
      if (res.ok) {
        if (data.settings) setSettings(data.settings);
        if (data.testimonials) setTestimonials(data.testimonials);
      } else {
        setError(data.error || 'Erro ao carregar configurações de checkout');
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/products/${productId}/checkout-customizer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar configurações.');
      }

      setSuccess('Configurações do checkout salvas com sucesso!');
      setSettings(data.settings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newContent.trim()) return;

    setIsAddingTestimonial(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/products/${productId}/testimonials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: newAuthor.trim(),
          authorRole: newRole.trim() || undefined,
          content: newContent.trim(),
          rating: Number(newRating) || 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar depoimento');
      }

      setSuccess('Depoimento adicionado!');
      setNewAuthor('');
      setNewRole('');
      setNewContent('');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setIsAddingTestimonial(false);
    }
  };

  const handleDeleteTestimonial = async (tId: string) => {
    if (!confirm('Deseja excluir este depoimento?')) return;
    try {
      const res = await fetch(`/api/v1/products/${productId}/testimonials?testimonialId=${tId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Depoimento removido.');
        await loadData();
      }
    } catch {
      // non-blocking
    }
  };

  const colorPresets = [
    { label: 'Azul Real', value: '#2563eb' },
    { label: 'Esmeralda', value: '#059669' },
    { label: 'Âmbar', value: '#d97706' },
    { label: 'Roxo VIP', value: '#7c3aed' },
    { label: 'Rosa Moderno', value: '#e11d48' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
              <Link href="/dashboard/products" className="hover:text-blue-600 transition-colors">
                Produtos
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">Personalizador de Checkout</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Checkout de Alta Conversão & Gatilhos
            </h1>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="font-bold ml-2">✕</button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 animate-pulse text-sm">
            Carregando configurações de personalização...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Settings Controls (7 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Form 1: Conversion Triggers */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Gatilhos Psicológicos de Conversão
                </h3>

                {/* Countdown Timer */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Timer de Escassez Regressivo</span>
                      <span className="text-xs text-slate-500">Exibe uma contagem regressiva viva no topo do checkout</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showCountdownTimer}
                      onChange={(e) => setSettings({ ...settings, showCountdownTimer: e.target.checked })}
                      className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {settings.showCountdownTimer && (
                    <div className="pl-4 border-l-2 border-blue-500 space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Minutos de Validade da Oferta
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={settings.countdownMinutes}
                          onChange={(e) => setSettings({ ...settings, countdownMinutes: Number(e.target.value) || 15 })}
                          className="w-32 px-3 py-1.5 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Texto Acima do Timer
                        </label>
                        <input
                          type="text"
                          value={settings.timerHeadline}
                          onChange={(e) => setSettings({ ...settings, timerHeadline: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Badges */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Selos de Garantia & Segurança</span>
                      <span className="text-xs text-slate-500">Garantia legal incondicional e pagamento criptografado</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showSecurityBadges}
                      onChange={(e) => setSettings({ ...settings, showSecurityBadges: e.target.checked })}
                      className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {settings.showSecurityBadges && (
                    <div className="pl-4 border-l-2 border-blue-500 pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dias de Garantia Incondicional
                      </label>
                      <select
                        value={settings.guaranteeDays}
                        onChange={(e) => setSettings({ ...settings, guaranteeDays: Number(e.target.value) })}
                        className="w-40 px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        <option value={7}>7 Dias (Canónico HOT-M)</option>
                        <option value={14}>14 Dias</option>
                        <option value={30}>30 Dias</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Social Proof Toasts */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Notificação de Prova Social</span>
                    <span className="text-xs text-slate-500">Exibe popups discretos de vendas recentes para inspirar confiança</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showSocialProof}
                    onChange={(e) => setSettings({ ...settings, showSocialProof: e.target.checked })}
                    className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Accent Color */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Cor de Destaque do Checkout
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {colorPresets.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, primaryColor: c.value })}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          settings.primaryColor === c.value
                            ? 'border-slate-900 bg-slate-100 font-bold'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: c.value }} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form 2: Testimonials Management */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Depoimentos de Alunos & Clientes ({testimonials.length})
                </h3>

                {testimonials.length > 0 && (
                  <div className="space-y-3">
                    {testimonials.map((t) => (
                      <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{t.authorName}</span>
                            {t.authorRole && <span className="text-slate-500">({t.authorRole})</span>}
                            <span className="text-amber-500">{'★'.repeat(t.rating)}</span>
                          </div>
                          <p className="text-slate-600 italic leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                        </div>
                        <button
                          onClick={() => handleDeleteTestimonial(t.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                          title="Remover depoimento"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddTestimonial} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nome do cliente (ex: João Silva)"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                    <input
                      type="text"
                      placeholder="Cargo / Profissão (opcional)"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Depoimento real do cliente sobre o impacto do produto..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-600 font-semibold">Avaliação:</span>
                      <select
                        value={newRating}
                        onChange={(e) => setNewRating(e.target.value)}
                        className="px-2 py-1 rounded border border-slate-300 bg-white"
                      >
                        <option value="5">★★★★★ (5 Estrelas)</option>
                        <option value="4">★★★★☆ (4 Estrelas)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingTestimonial}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isAddingTestimonial ? 'Adicionando...' : '+ Adicionar Depoimento'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Live Checkout Preview (6 cols) */}
            <div className="lg:col-span-6 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl sticky top-24 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pré-visualização em Tempo Real
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ao Vivo
                </span>
              </div>

              {/* Simulated Timer */}
              {settings.showCountdownTimer && (
                <div
                  className="p-3.5 rounded-xl text-center text-xs font-bold shadow-md animate-pulse"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <p className="opacity-90">{settings.timerHeadline}</p>
                  <p className="text-lg font-black tracking-widest mt-0.5">
                    {String(settings.countdownMinutes).padStart(2, '0')}:00
                  </p>
                </div>
              )}

              {/* Simulated Checkout Box */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
                    📦
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Produto Oficial</h4>
                    <p className="text-xs text-slate-400">Acesso Imediato & Certificado</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor do Produto</span>
                    <span className="font-semibold">10.000,00 AOA</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-sm pt-2 border-t border-slate-800">
                    <span>Total a Pagar</span>
                    <span style={{ color: settings.primaryColor }}>10.000,00 AOA</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-3 rounded-xl text-xs font-black text-white shadow-lg transition-transform"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  PAGAR VIA MULTICAIXA PROXYPAY
                </button>

                {/* Simulated Security Badges */}
                {settings.showSecurityBadges && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-emerald-400">🛡️</span>
                      <span>Garantia de {settings.guaranteeDays} Dias</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-blue-400">🔒</span>
                      <span>Pagamento Criptografado</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulated Testimonials preview */}
              {testimonials.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    O que dizem os compradores:
                  </span>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{testimonials[0]?.authorName}</span>
                      <span className="text-amber-400">{'★'.repeat(testimonials[0]?.rating || 5)}</span>
                    </div>
                    <p className="text-slate-400 italic text-[11px]">&ldquo;{testimonials[0]?.content}&rdquo;</p>
                  </div>
                </div>
              )}

              {/* Simulated Social proof toast preview */}
              {settings.showSocialProof && (
                <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center space-x-2 text-[11px]">
                  <span className="text-emerald-400">●</span>
                  <span className="text-slate-300">
                    <strong>Manuel K.</strong> de Luanda comprou há 3 minutos.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
