'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MarketplaceProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  productType: 'COURSE' | 'DIGITAL_DOWNLOAD';
  coverImageUrl: string;
  creatorName: string;
  temperature: number;
  rating: number;
  reviewCount: number;
  guaranteeDays: number;
  badge?: string;
  priceAmountMinor: string;
  priceFormatted: string;
  currency: string;
  offerId?: string;
  features: string[];
  modulesCount?: number;
  durationHours?: number;
  isCurated?: boolean;
}

interface CategoryOption {
  key: string;
  label: string;
}

export default function HotplaceMarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState('trending');
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketplaceData() {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          search,
          category: selectedCategory,
          type: selectedType,
          sort: sortBy,
        });

        const res = await fetch(`/api/v1/marketplace?${query.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setProducts(data.products || []);
          if (data.categories && categories.length === 0) {
            setCategories(data.categories);
          }
        }
      } catch {
        // Fallback silencioso
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchMarketplaceData();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedType, sortBy]);

  const handleBuyProduct = async (product: MarketplaceProduct) => {
    setIsProcessingCheckout(product.id);
    try {
      if (product.offerId) {
        // Produto cadastrado no banco: gerar cotação real
        const quoteRes = await fetch('/api/v1/pricing/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerId: product.offerId,
            currency: product.currency || 'AOA',
          }),
        });

        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          router.push(`/checkout/${quoteData.quote.quoteId}`);
          return;
        }
      }

      // Se for produto demonstrativo ou sem cotação pronta, abre modal de detalhes
      setSelectedProduct(product);
    } catch {
      setSelectedProduct(product);
    } finally {
      setIsProcessingCheckout(null);
    }
  };

  const filteredCountText = useMemo(() => {
    if (isLoading) return 'Carregando vitrine...';
    if (products.length === 1) return '1 produto encontrado';
    return `${products.length} produtos disponíveis para compra imediata`;
  }, [isLoading, products.length]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-orange-600">
              <span className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                H
              </span>
              <span>HOT-M</span>
            </Link>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-950/70 border border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-400 text-xs font-black tracking-wide uppercase">
              <span>🔥</span>
              <span>HOTPLACE</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/marketplace" className="text-orange-600 dark:text-orange-400 font-bold">
              Explorar Catálogo
            </Link>
            <Link href="/library" className="hover:text-slate-900 dark:hover:text-white transition">
              Meus Cursos (Área do Aluno)
            </Link>
            <Link href="/dashboard/affiliates" className="hover:text-slate-900 dark:hover:text-white transition">
              Mercado de Afiliados
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/products/new"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            >
              <span>+</span> Vender no Hotplace
            </Link>

            <Link
              href="/dashboard"
              className="text-xs sm:text-sm font-bold px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition"
            >
              Painel do Produtor
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section do Hotplace */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 pt-12 pb-10 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
            <span>🇦🇴</span>
            <span>A Vitrine Oficial de Cursos e Infoprodutos em Angola</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            Descubra os Melhores Cursos, Livros Digitais e Mentorias no{' '}
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
              Hotplace
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Aprenda com especialistas comprovados. Compre com pagamento instantâneo por{' '}
            <strong className="text-slate-900 dark:text-white">Multicaixa Express</strong> e receba acesso imediato na Área de Membros.
          </p>

          {/* Search Bar Principal */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Busque por curso, autor, tema (ex: tráfego, importação, finanças)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm shadow-md"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filtros, Categorias e Ordenação */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Chips de Categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🌟 Todos os Nichos
          </button>
          <button
            onClick={() => setSelectedCategory('MARKETING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'MARKETING'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            📈 Marketing & Vendas
          </button>
          <button
            onClick={() => setSelectedCategory('BUSINESS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'BUSINESS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🚀 Negócios & Importação
          </button>
          <button
            onClick={() => setSelectedCategory('FINANCE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'FINANCE'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            💰 Finanças & BODIVA
          </button>
          <button
            onClick={() => setSelectedCategory('TECH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'TECH'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            💻 Tecnologia & IA
          </button>
          <button
            onClick={() => setSelectedCategory('EDUCATION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'EDUCATION'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            📚 Idiomas & Carreiras
          </button>
        </div>

        {/* Barra de Formato e Ordenação */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredCountText}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Filtro Formato */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Formato:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">Todos os Formatos</option>
                <option value="COURSE">Cursos em Vídeo (LMS)</option>
                <option value="DIGITAL_DOWNLOAD">E-books & Arquivos</option>
              </select>
            </div>

            {/* Filtro Ordenação */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="trending">🔥 Mais Quentes (150°)</option>
                <option value="rating">⭐ Mais Bem Avaliados</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Grid de Produtos do Hotplace */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Atualizando produtos do Hotplace...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-bold">Nenhum produto encontrado</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Não encontramos resultados para sua busca ou filtros selecionados. Experimente buscar outro termo.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
                setSelectedType('ALL');
              }}
              className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold text-xs hover:bg-orange-500 transition"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl hover:border-orange-500/50 dark:hover:border-orange-500/50 transition duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Capa com Badge e Temperatura */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {/* Temperatura Hotmart */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-black bg-black/75 text-orange-400 backdrop-blur-md flex items-center gap-1 shadow-sm">
                      <span>🔥</span>
                      <span>{item.temperature}°</span>
                    </div>

                    {/* Badge do Produto */}
                    {item.badge && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-600 text-white shadow-sm">
                        {item.badge}
                      </div>
                    )}

                    {/* Formato */}
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white backdrop-blur-sm">
                      {item.productType === 'COURSE' ? '🎓 Curso em Vídeo' : '📖 Livro / Material Digital'}
                    </div>
                  </div>

                  {/* Detalhes do Produto */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {item.creatorName}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <span>⭐</span>
                        <span>{item.rating}</span>
                        <span className="text-slate-400">({item.reviewCount})</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-orange-600 transition">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.description}
                    </p>

                    {/* Features Rápidas */}
                    <ul className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      {item.features.slice(0, 2).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-green-500 font-bold">✓</span>
                          <span className="line-clamp-1">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer do Card com Preço e Botão */}
                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Preço Oficial
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {item.priceFormatted}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      <span>✓</span> Multicaixa Express
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedProduct(item)}
                      className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition text-center"
                    >
                      Ver Detalhes
                    </button>

                    <button
                      onClick={() => handleBuyProduct(item)}
                      disabled={isProcessingCheckout === item.id}
                      className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      {isProcessingCheckout === item.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Comprar</span>
                          <span>&rarr;</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Modal Interativo de Detalhes do Produto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>

            {/* Top Modal Info */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <img
                src={selectedProduct.coverImageUrl}
                alt={selectedProduct.title}
                className="w-full sm:w-36 h-36 object-cover rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                    {selectedProduct.category}
                  </span>
                  <span className="text-xs text-amber-500 font-bold">
                    ⭐ {selectedProduct.rating} ({selectedProduct.reviewCount} avaliações)
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {selectedProduct.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Criado por <strong className="text-slate-800 dark:text-slate-200">{selectedProduct.creatorName}</strong>
                </p>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white">Sobre este infoproduto</h4>
              <p className="leading-relaxed">{selectedProduct.description}</p>
            </div>

            {/* O que está incluso */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">O que você vai receber:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedProduct.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <span className="text-emerald-500 font-bold text-sm">✓</span>
                    <span className="text-slate-700 dark:text-slate-300">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Garantia & Pagamento */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h5 className="font-bold text-amber-900 dark:text-amber-200">
                    Garantia Incondicional de {selectedProduct.guaranteeDays} Dias
                  </h5>
                  <p className="text-amber-700 dark:text-amber-400">
                    Se não ficar satisfeito, devolvemos 100% do seu dinheiro sem burocracia.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Final do Modal */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Valor do Acesso:</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedProduct.priceFormatted}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Continuar Olhando
                </button>
                <button
                  onClick={() => handleBuyProduct(selectedProduct)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2"
                >
                  <span>Garantir Minha Vaga</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Banner para Produtores */}
      <section className="bg-slate-900 text-white py-14 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-black tracking-widest text-orange-400 uppercase">
              Para Produtores & Professores
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Coloque seu Produto ou Curso no Hotplace Hoje Mesmo
            </h2>
            <p className="text-slate-400 text-sm">
              Ganhe visibilidade para milhares de compradores em Angola, receba pagamentos por Multicaixa Express sem complicação bancária e conte com um exército de afiliados para acelerar suas vendas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link
              href="/dashboard/products/new"
              className="w-full sm:w-auto text-center px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-sm text-white shadow-lg transition"
            >
              Publicar Novo Produto
            </Link>
            <Link
              href="/dashboard/affiliates"
              className="w-full sm:w-auto text-center px-5 py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 font-semibold text-sm text-slate-300 transition"
            >
              Programa de Afiliados
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 HOT-M. O Ecossistema Canônico de Infoprodutos e Comércio Digital de Angola.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-orange-600 transition">Início</Link>
            <Link href="/marketplace" className="hover:text-orange-600 transition">Hotplace</Link>
            <Link href="/dashboard" className="hover:text-orange-600 transition">Painel</Link>
            <Link href="/dashboard/support" className="hover:text-orange-600 transition">Suporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
