'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    // 1. Checagem de modo standalone (app já instalado)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari specific property
      window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    // 2. Registro imediato do Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[HOT-M PWA] Service Worker ativo e registrado:', reg.scope);
        })
        .catch((err) => {
          console.warn('[HOT-M PWA] Falha ao registrar Service Worker:', err);
        });
    }

    // 3. Captura do evento de instalação do Chrome/Edge/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[HOT-M PWA] Evento beforeinstallprompt capturado com sucesso!');
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Captura de quando a instalação foi concluída
    const handleAppInstalled = () => {
      console.log('[HOT-M PWA] Aplicativo instalado!');
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Monitorar estado online/offline
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } else {
      // Se o Chrome ainda não disparou o evento nativo, abre modal com instruções exatas
      setShowHelpModal(true);
    }
  };

  return (
    <>
      {children}

      {/* Alerta de Modo Offline */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-bold py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2">
          <span>📡</span>
          <span>Modo Offline: Seus cursos e dados locais continuam acessíveis no HOT-M.</span>
        </div>
      )}

      {/* Alerta de Reconexão */}
      {justReconnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2">
          <span>✅</span>
          <span>Conexão restabelecida! Dados sincronizados.</span>
        </div>
      )}

      {/* Banner Flutuante de Instalação PWA (Fixo no canto inferior) */}
      {!isStandalone && !isInstalled && !isDismissed && (
        <div
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          className="fixed right-3 left-3 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-slate-900/95 border border-slate-700 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center text-lg sm:text-xl font-black shadow-md shrink-0">
              H
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-white">Instalar App HOT-M</h4>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                Instale no seu telefone para abrir em tela cheia com acesso rápido e offline.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t border-slate-800 sm:border-0">
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 font-medium transition"
            >
              Depois
            </button>
            <button
              onClick={handleInstallClick}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              <span>📲</span>
              <span>Instalar</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Instruções caso o navegador não suporte prompt programático direto */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-orange-600/20 text-orange-500 flex items-center justify-center text-2xl mb-2">
              📲
            </div>

            <h3 className="text-lg font-bold">Como Instalar o HOT-M no seu Dispositivo:</h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>💻</span> No Google Chrome ou Microsoft Edge (Computador):
                </p>
                <p>
                  1. Olhe na barra de endereços (onde fica o link <code>localhost:2009</code>).
                </p>
                <p>
                  2. No lado direito, clique no ícone de <strong>computador com seta para baixo (ou monitor)</strong> que diz <em>&quot;Instalar aplicativo HOT-M&quot;</em>.
                </p>
                <p>
                  3. Ou clique nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome &rarr; <strong>Salvar e Compartilhar</strong> &rarr; <strong>Instalar HOT-M...</strong>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>📱</span> No Celular (Android / iPhone):
                </p>
                <p>
                  • <strong>Android (Chrome):</strong> Toque no menu (⋮) e selecione <em>&quot;Instalar aplicativo&quot;</em> ou <em>&quot;Adicionar à tela inicial&quot;</em>.
                </p>
                <p>
                  • <strong>iPhone (Safari):</strong> Toque no botão de <strong>Compartilhar</strong> (quadrado com seta para cima) e escolha <em>&quot;Adicionar à Tela de Início&quot;</em>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-xs text-white transition mt-2"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
