import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';

export interface MarketplaceProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  productType: 'COURSE' | 'DIGITAL_DOWNLOAD';
  coverImageUrl: string;
  creatorName: string;
  creatorAvatar?: string;
  temperature: number; // Ex: 150 graus Hotmart
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

// Catálogo curado de alta conversão para o mercado angolano e internacional
const CURATED_SHOWCASE_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    title: 'Mestrado em Tráfego Pago & Vendas no Multicaixa Express',
    slug: 'mestrado-trafego-pago-multicaixa',
    description: 'Aprenda a estruturar campanhas no Facebook, Instagram e TikTok Ads com conversão direta para pagamentos Multicaixa Express e referência ProxyPay em Angola.',
    category: 'MARKETING',
    productType: 'COURSE',
    coverImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Manuel dos Santos',
    temperature: 150,
    rating: 4.9,
    reviewCount: 428,
    guaranteeDays: 7,
    badge: '🔥 MAIS VENDIDO (150°)',
    priceAmountMinor: '3500000',
    priceFormatted: '35.000 Kz',
    currency: 'AOA',
    features: [
      'Configuração passo a passo do Pixel com Multicaixa',
      'Funis de WhatsApp com alta taxa de conversão',
      'Modelos prontos de anúncios para Luanda e províncias',
      'Acesso vitalício + Certificado de Conclusão',
    ],
    modulesCount: 8,
    durationHours: 24,
    isCurated: true,
  },
  {
    id: 'a0000001-0000-0000-0000-000000000002',
    title: 'Guia Definitivo de Importação da China para Angola',
    slug: 'guia-importacao-china-angola',
    description: 'Manual prático e direto para importar mercadorias do Alibaba, Taobao e 1688 para Luanda com frete marítimo e aéreo seguro sem taxas abusivas.',
    category: 'BUSINESS',
    productType: 'DIGITAL_DOWNLOAD',
    coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Esperança Chitula',
    temperature: 120,
    rating: 4.8,
    reviewCount: 312,
    guaranteeDays: 14,
    badge: '⭐ DESTAQUE',
    priceAmountMinor: '1850000',
    priceFormatted: '18.500 Kz',
    currency: 'AOA',
    features: [
      'Lista de 40 fornecedores verificados em Guangzhou e Yiwu',
      'Planilha de cálculo de frete, desalfandegamento e lucro',
      'Como pagar em Yuan ou Dólar sem burocracia bancária',
      'Grupo exclusivo no Telegram para networking de importadores',
    ],
    modulesCount: 5,
    durationHours: 12,
    isCurated: true,
  },
  {
    id: 'a0000001-0000-0000-0000-000000000003',
    title: 'Finanças Pessoais & Investimentos em Títulos do Tesouro (BODIVA)',
    slug: 'financas-investimentos-bodiva',
    description: 'Descubra como proteger suas economias da inflação e gerar renda passiva com Obrigações e Bilhetes do Tesouro na Bolsa de Dívida e Valores de Angola.',
    category: 'FINANCE',
    productType: 'COURSE',
    coverImageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Dr. Afonso Viana, CFA',
    temperature: 140,
    rating: 4.95,
    reviewCount: 580,
    guaranteeDays: 7,
    badge: '💎 RECOMENDADO',
    priceAmountMinor: '4500000',
    priceFormatted: '45.000 Kz',
    currency: 'AOA',
    features: [
      'Como abrir conta de custódia num banco comercial em Angola',
      'Comparativo de rentabilidade BTs x OTs x Depósitos a Prazo',
      'Calculadora automática de juros líquidos e amortizações',
      'Sessões de mentoria gravadas com analistas de mercado',
    ],
    modulesCount: 6,
    durationHours: 18,
    isCurated: true,
  },
  {
    id: 'a0000001-0000-0000-0000-000000000004',
    title: 'Desenvolvedor Full Stack Moderno: Next.js, Node & IA',
    slug: 'desenvolvedor-fullstack-nextjs-ia',
    description: 'Do zero ao mercado internacional. Construa aplicações completas com TypeScript, bancos SQL e inteligência artificial para clientes no exterior.',
    category: 'TECH',
    productType: 'COURSE',
    coverImageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Kiluange Baptista',
    temperature: 95,
    rating: 4.9,
    reviewCount: 189,
    guaranteeDays: 7,
    badge: '🚀 NOVO LANÇAMENTO',
    priceAmountMinor: '5000000',
    priceFormatted: '50.000 Kz',
    currency: 'AOA',
    features: [
      'Projetos reais para portfólio no GitHub',
      'Preparação para entrevistas remotas em empresas globais',
      'Integração de APIs de pagamento e Webhooks',
      'Comunidade no Discord com mentores seniores',
    ],
    modulesCount: 12,
    durationHours: 60,
    isCurated: true,
  },
  {
    id: 'a0000001-0000-0000-0000-000000000005',
    title: 'E-book: Redação de Propostas e Licitações em Angola',
    slug: 'redacao-propostas-licitacoes-angola',
    description: 'Metodologia testada para empresas e consultores que desejam vencer concursos públicos e privados de prestação de serviços no país.',
    category: 'BUSINESS',
    productType: 'DIGITAL_DOWNLOAD',
    coverImageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Dra. Neusa Gonçalves',
    temperature: 80,
    rating: 4.7,
    reviewCount: 94,
    guaranteeDays: 7,
    badge: '📚 E-BOOK',
    priceAmountMinor: '1200000',
    priceFormatted: '12.000 Kz',
    currency: 'AOA',
    features: [
      'Modelos editáveis de propostas técnicas e financeiras em Word',
      'Checklist de documentação jurídica e fiscal obrigatória',
      'Técnicas de precificação estratégica de serviços',
    ],
    modulesCount: 4,
    durationHours: 6,
    isCurated: true,
  },
  {
    id: 'a0000001-0000-0000-0000-000000000006',
    title: 'Inglês para Negócios & Entrevistas Internacionais',
    slug: 'ingles-para-negocios-entrevistas',
    description: 'Desenvolva fluência corporativa, escreva emails formais de alta persuasão e passe em entrevistas de trabalho para trabalhar remotamente recebendo em moeda forte.',
    category: 'EDUCATION',
    productType: 'COURSE',
    coverImageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    creatorName: 'Teacher Wilson Matamba',
    temperature: 110,
    rating: 4.85,
    reviewCount: 240,
    guaranteeDays: 7,
    badge: '⭐ POPULAR',
    priceAmountMinor: '2800000',
    priceFormatted: '28.000 Kz',
    currency: 'AOA',
    features: [
      'Simulações reais de entrevistas com feedback individual',
      'Vocabulário executivo para reuniões e negociações',
      'Áudios para treino diário de pronúncia e escuta',
      'Certificado de fluência empresarial',
    ],
    modulesCount: 10,
    durationHours: 35,
    isCurated: true,
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const category = searchParams.get('category')?.toUpperCase().trim() || 'ALL';
    const productType = searchParams.get('type')?.toUpperCase().trim() || 'ALL';
    const sort = searchParams.get('sort')?.toLowerCase().trim() || 'trending';

    const supabase = await createServerSupabaseClient();

    // Buscar produtos reais cadastrados no Supabase com ofertas ativas
    let dbProducts: MarketplaceProduct[] = [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          slug,
          description,
          product_type,
          status,
          cover_image_url,
          created_at,
          creator_id,
          offers(
            id,
            is_default,
            is_active,
            prices(amount_minor, currency)
          ),
          user_profiles(
            full_name
          )
        `)
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false });

      if (!error && data) {
        dbProducts = data.map((p) => {
          type OfferItem = { id: string; is_default: boolean; is_active: boolean; prices?: Array<{ amount_minor: string; currency: string }> };
          const offers = (p.offers as unknown as OfferItem[]) || [];
          const activeOffer = offers.find((o) => o.is_active && o.is_default) || offers[0];
          const priceObj = activeOffer?.prices?.[0];
          const rawAmountMinor = priceObj?.amount_minor || '2500000';
          const currency = priceObj?.currency || 'AOA';
          const major = Number(rawAmountMinor) / 100;
          const formatted = `${major.toLocaleString('pt-AO')} ${currency === 'AOA' ? 'Kz' : currency}`;
          const profile = p.user_profiles as unknown as { full_name?: string } | null;

          return {
            id: p.id,
            title: p.title,
            slug: p.slug,
            description: p.description || 'Produto oficial HOT-M disponível com entrega instantânea.',
            category: 'BUSINESS',
            productType: (p.product_type === 'COURSE' ? 'COURSE' : 'DIGITAL_DOWNLOAD') as 'COURSE' | 'DIGITAL_DOWNLOAD',
            coverImageUrl: p.cover_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
            creatorName: profile?.full_name || 'Produtor HOT-M',
            temperature: 100,
            rating: 5.0,
            reviewCount: 1,
            guaranteeDays: 7,
            badge: '🔥 NOVO NO HOTPLACE',
            priceAmountMinor: rawAmountMinor,
            priceFormatted: formatted,
            currency,
            offerId: activeOffer?.id,
            features: [
              'Acesso imediato pós-pagamento Multicaixa',
              'Garantia de 7 dias com devolução total',
              'Suporte direto do produtor na plataforma',
            ],
            isCurated: false,
          };
        });
      }
    } catch {
      // Fallback em caso de erro silencioso no supabase query
      dbProducts = [];
    }

    // Combinar produtos do banco com o catálogo curado
    let allProducts = [...dbProducts, ...CURATED_SHOWCASE_PRODUCTS];

    // 1. Filtrar por busca (search)
    if (search) {
      allProducts = allProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.creatorName.toLowerCase().includes(search)
      );
    }

    // 2. Filtrar por categoria
    if (category && category !== 'ALL') {
      allProducts = allProducts.filter((p) => p.category === category);
    }

    // 3. Filtrar por tipo
    if (productType && productType !== 'ALL') {
      allProducts = allProducts.filter((p) => p.productType === productType);
    }

    // 4. Ordenação
    if (sort === 'trending') {
      allProducts.sort((a, b) => b.temperature - a.temperature);
    } else if (sort === 'rating') {
      allProducts.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'price_asc') {
      allProducts.sort((a, b) => Number(a.priceAmountMinor) - Number(b.priceAmountMinor));
    } else if (sort === 'price_desc') {
      allProducts.sort((a, b) => Number(b.priceAmountMinor) - Number(a.priceAmountMinor));
    }

    return NextResponse.json({
      success: true,
      total: allProducts.length,
      categories: [
        { key: 'ALL', label: 'Todos os Nichos' },
        { key: 'BUSINESS', label: 'Negócios & Empreendedorismo' },
        { key: 'MARKETING', label: 'Marketing & Vendas' },
        { key: 'FINANCE', label: 'Finanças & Investimentos' },
        { key: 'TECH', label: 'Tecnologia & IA' },
        { key: 'EDUCATION', label: 'Idiomas & Educação' },
      ],
      products: allProducts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar o Hotplace';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
