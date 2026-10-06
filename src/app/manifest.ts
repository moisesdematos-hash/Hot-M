import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HOT-M — Plataforma de Infoprodutos e Comércio Digital',
    short_name: 'HOT-M',
    description: 'Compre e venda cursos, mentorias e e-books com Multicaixa Express e área de membros.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#ea580c',
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['education', 'business', 'finance', 'shopping'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Hotplace (Catálogo)',
        url: '/marketplace',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Painel do Produtor',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Minha Carteira',
        url: '/dashboard/finance',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Área do Aluno (LMS)',
        url: '/library',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
