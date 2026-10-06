'use client';

import React from 'react';
import Link from 'next/link';

export default function OfflineFallbackPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-20 h-20 rounded-3xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-orange-500/10">
        📡
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-950/80 text-orange-400 border border-orange-800/80 mb-3">
        Modo Offline PWA
      </span>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tight max-w-md">
        Você está sem conexão no momento
      </h1>

      <p className="text-slate-400 text-sm max-w-md mt-3 leading-relaxed">
        Não se preocupe! O aplicativo HOT-M mantém seus cursos e dados sincronizados salvos no dispositivo. Conecte-se ao Wi-Fi ou dados móveis para atualizar vendas e checkouts.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Tentar Reconectar</span>
        </button>

        <Link
          href="/library"
          className="w-full py-3.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold text-sm transition text-center"
        >
          Ver Cursos Baixados
        </Link>
      </div>

      <p className="mt-12 text-xs text-slate-600">
        HOT-M Progressive Web App • Funciona mesmo sem internet
      </p>
    </div>
  );
}
