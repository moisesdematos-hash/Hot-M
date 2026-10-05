'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProductItem {
  id: string;
  title: string;
  slug: string;
  product_type: string;
  status: string;
  created_at: string;
}

export default function CreatorProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/v1/products');
        const data = await res.json();
        if (res.ok) {
          setProducts(data.products || []);
        } else {
          setError(data.error || 'Erro ao carregar produtos');
        }
      } catch {
        setError('Falha de conexão com o servidor');
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Produtos</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus infoprodutos digitais e cursos</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          + Criar Novo Produto
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando catálogo de produtos...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <p className="text-slate-500">Nenhum produto cadastrado ainda.</p>
          <Link
            href="/dashboard/products/new"
            className="text-orange-600 hover:underline font-medium text-sm inline-block"
          >
            Cadastre seu primeiro produto digital
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm hover:shadow transition"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {p.product_type === 'DIGITAL_DOWNLOAD' ? 'Download Digital' : 'Curso Online'}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : p.status === 'UNDER_REVIEW'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <h3 className="font-bold text-lg leading-tight line-clamp-1">{p.title}</h3>
              <p className="text-xs text-slate-500 font-mono">slug: {p.slug}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
