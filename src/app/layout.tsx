import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HOT-M | Digital Commerce Platform',
  description: 'Global digital products, affiliates, payments, and membership platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
