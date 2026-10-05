'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<'DIGITAL_DOWNLOAD' | 'COURSE'>('DIGITAL_DOWNLOAD');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [assetFileUrl, setAssetFileUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          productType,
          coverImageUrl: coverImageUrl || undefined,
          assetFileUrl: assetFileUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar produto');
      }

      router.push('/dashboard/products');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao criar produto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/dashboard/products" className="text-xs text-orange-600 hover:underline mb-2 inline-block">
          ← Voltar para Meus Produtos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Criar Novo Produto</h1>
        <p className="text-sm text-slate-500">Cadastre um download digital (PDF, software) ou curso online</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">
            Nome do Produto *
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Guia Completo de Finanças em Angola"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="productType">
            Formato do Produto *
          </label>
          <select
            id="productType"
            value={productType}
            onChange={(e) => setProductType(e.target.value as 'DIGITAL_DOWNLOAD' | 'COURSE')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="DIGITAL_DOWNLOAD">Arquivo Digital para Download (E-book, PDF, Template)</option>
            <option value="COURSE">Curso Online em Vídeo / Área de Membros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="description">
            Descrição do Produto
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Descreva detalhadamente os benefícios do produto..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="coverImage">
            URL da Imagem de Capa (Opcional)
          </label>
          <input
            id="coverImage"
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="https://exemplo.com/capa.jpg"
          />
        </div>

        {productType === 'DIGITAL_DOWNLOAD' && (
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="assetFile">
              Caminho do Arquivo para Entrega
            </label>
            <input
              id="assetFile"
              type="text"
              value={assetFileUrl}
              onChange={(e) => setAssetFileUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex: products/ebook-financas.pdf"
            />
            <p className="text-xs text-slate-500 mt-1">
              O arquivo fica armazenado em bucket privado e só é liberado via URL assinada após confirmação do pagamento.
            </p>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition"
          >
            {isLoading ? 'Salvando Produto...' : 'Salvar como Rascunho (DRAFT)'}
          </button>
        </div>
      </form>
    </div>
  );
}
