import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaProvider } from '@/components/pwa/PwaProvider';

export const metadata: Metadata = {
  title: 'HOT-M — Plataforma de Infoprodutos e Comércio Digital',
  description: 'Venda e acesse cursos, infoprodutos, pagamentos Multicaixa Express e área de membros.',
  applicationName: 'HOT-M',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HOT-M',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
