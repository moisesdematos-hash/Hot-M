'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RecoverPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao solicitar recuperação');
      }

      setSuccess('Instruções de recuperação foram enviadas para o seu email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Recuperar Senha</h1>
          <p className="text-sm text-slate-500 mt-2">Informe o email associado à sua conta</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-4 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email cadastrado
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="seu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition"
            >
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          Lembrou sua senha?{' '}
          <Link href="/auth/login" className="text-orange-600 font-medium hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
