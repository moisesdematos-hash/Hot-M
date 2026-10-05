'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface EntitlementItem {
  id: string;
  buyerId: string;
  productId: string;
  orderId: string;
  isActive: boolean;
  grantedAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    productType: 'DIGITAL_DOWNLOAD' | 'COURSE';
    coverImageUrl: string | null;
    assetFileUrl?: string | null;
  };
}

export default function BuyerLibraryPage() {
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const res = await fetch('/api/v1/entitlements');
        const data = await res.json();
        if (res.ok) {
          setEntitlements(data.entitlements || []);
        } else {
          setError(data.error || 'Erro ao carregar sua biblioteca');
        }
      } catch {
        setError('Falha de conexão com o servidor');
      } finally {
        setIsLoading(false);
      }
    }
    loadLibrary();
  }, []);

  async function handleDownload(entitlementId: string) {
    setDownloadingId(entitlementId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/entitlements/${entitlementId}/download`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar link de download');
      }

      // Open signed download link
      window.open(data.downloadUrl, '_blank');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao baixar arquivo';
      setError(message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minha Biblioteca</h1>
          <p className="text-sm text-slate-500 mt-1">
            Seus infoprodutos e cursos adquiridos na plataforma HOT-M
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:text-orange-700 transition"
        >
          Explorar mais produtos &rarr;
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Carregando seus acessos digitais...</div>
      ) : entitlements.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600">
            📦
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Sua biblioteca está vazia</h3>
            <p className="text-sm text-slate-500 mt-1">
              Você ainda não adquiriu nenhum produto digital ou seus pagamentos estão em processamento.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
          >
            Ver catálogo de produtos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entitlements.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition"
            >
              {/* Product Card Top */}
              <div>
                <div className="h-40 bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-4xl text-white">
                  {item.product.productType === 'COURSE' ? '🎓' : '📄'}
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                      {item.product.productType === 'COURSE' ? 'Curso Online' : 'Download Digital'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Adquirido em {new Date(item.grantedAt).toLocaleDateString('pt-AO')}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">
                    {item.product.title}
                  </h3>

                  {item.product.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {item.product.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Product Card Action */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                {item.product.productType === 'DIGITAL_DOWNLOAD' ? (
                  <button
                    onClick={() => handleDownload(item.id)}
                    disabled={downloadingId === item.id}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition"
                  >
                    {downloadingId === item.id ? 'Gerando link...' : '⬇ Baixar Arquivo'}
                  </button>
                ) : (
                  <Link
                    href={`/courses/${item.product.id}`}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
                  >
                    ▶ Acessar Aulas
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
