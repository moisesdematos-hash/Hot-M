'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar');
      }

      router.push('/dashboard');
      router.refresh();
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
          <h1 className="text-2xl font-bold tracking-tight">Entrar no HOT-M</h1>
          <p className="text-sm text-slate-500 mt-2">Acesse seus cursos, produtos e faturamento</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
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

          <div>
            <div className="flex justify-between text-sm mb-1">
              <label htmlFor="password">Senha</label>
              <Link href="/auth/recover" className="text-orange-600 hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition"
          >
            {isLoading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Não tem uma conta?{' '}
          <Link href="/auth/signup" className="text-orange-600 font-medium hover:underline">
            Cadastre-se gratuitamente
          </Link>
        </div>
      </div>
    </div>
  );
}
