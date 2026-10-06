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
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // 1. Verificar se já está rodando instalado como App Standalone
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari specific property
      window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    // 2. Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Registrar Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[HOT-M PWA] Service Worker registrado com sucesso no escopo:', reg.scope);
          })
          .catch((err) => {
            console.warn('[HOT-M PWA] Falha ao registrar Service Worker:', err);
          });
      });
    }

    // 4. Capturar evento de instalação (Chrome, Edge, Android, Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. Monitorar conectividade de rede (Online / Offline)
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

    if (!navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {children}

      {/* Status de Rede: Offline / Reconectado */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-bold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2 animate-fadeIn">
          <span>📡</span>
          <span>Você está no modo offline. Seus dados e cursos baixados continuam disponíveis.</span>
        </div>
      )}

      {justReconnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2 animate-fadeIn">
          <span>✅</span>
          <span>Conexão restabelecida! A plataforma HOT-M foi sincronizada com sucesso.</span>
        </div>
      )}

      {/* Banner Flutuante de Instalação PWA (Desktop e Mobile Android/Windows/Mac) */}
      {!isStandalone && !isDismissed && installPrompt && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-slate-900 border border-slate-700/80 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-bounce-subtle">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xl font-black shadow-md shrink-0">
              H
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-white">Instalar App HOT-M</h4>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acesse suas vendas e cursos direto da tela de início, mais rápido e sem abrir abas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 font-medium transition"
            >
              Depois
            </button>
            <button
              onClick={handleInstallClick}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition transform active:scale-95"
            >
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Dica de Instalação para iOS Safari */}
      {!isStandalone && isIos && showIosPrompt && !isDismissed && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 shadow-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400">Instalar no iPhone / iPad</span>
            <button
              onClick={() => setShowIosPrompt(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) no Safari e selecione <strong>Adicionar à Tela de Início</strong>.
          </p>
        </div>
      )}
    </>
  );
}
