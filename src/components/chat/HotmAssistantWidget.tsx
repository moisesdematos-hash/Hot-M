'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { searchKnowledgeBase, AssistantAnswer } from '@/modules/knowledge/hotm-knowledge-base';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionLinks?: Array<{ label: string; href: string }>;
  suggestedFollowUps?: string[];
  timestamp: string;
}

export function HotmAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inicializar com mensagem de boas-vindas
  useEffect(() => {
    const welcome = searchKnowledgeBase('');
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: welcome.content,
        actionLinks: welcome.actionLinks,
        suggestedFollowUps: welcome.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Rolar para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Resposta instantânea e determinística (zero IA, 100% autônoma)
    setTimeout(() => {
      const response: AssistantAnswer = searchKnowledgeBase(query);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.content,
        actionLinks: response.actionLinks,
        suggestedFollowUps: response.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    const welcome = searchKnowledgeBase('');
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: welcome.content,
        actionLinks: welcome.actionLinks,
        suggestedFollowUps: welcome.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Botão Flutuante (Launcher) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
          className="fixed right-4 z-40 group flex items-center gap-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-orange-600/30 transition duration-300 transform hover:scale-105 active:scale-95"
          title="Assistente HOT-M (Tire dúvidas sem internet/IA)"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>

          <span className="text-xl">💬</span>
          <span className="text-xs font-black tracking-wide pr-1 hidden sm:inline-block">
            Assistente HOT-M
          </span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[9px] font-black uppercase">
            ⚡ Offline
          </span>
        </button>
      )}

      {/* Janela do Chat Drawer / Modal */}
      {isOpen && (
        <div
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          className="fixed right-3 left-3 sm:left-auto sm:right-4 z-50 w-auto sm:w-[420px] max-w-[calc(100vw-1.5rem)] h-[600px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-fadeIn"
        >
          {/* Header do Chat */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 p-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner font-black text-white">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-white">Assistente HOT-M</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-400 text-emerald-950 uppercase">
                    100% Local
                  </span>
                </div>
                <p className="text-[11px] text-orange-100 flex items-center gap-1">
                  <span>●</span> Respostas instantâneas e sem conexão externa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white">
              <button
                onClick={handleClearHistory}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-xs transition"
                title="Reiniciar Conversa"
              >
                🔄
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-sm font-bold transition"
                title="Fechar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Categories Bar */}
          <div className="bg-slate-950/80 border-b border-slate-800 p-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none shrink-0 text-[11px]">
            <button
              onClick={() => handleSend('Como funciona o pagamento com Multicaixa Express?')}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-orange-600/30 hover:text-orange-400 border border-slate-700 whitespace-nowrap transition"
            >
              💳 Multicaixa
            </button>
            <button
              onClick={() => handleSend('Como solicitar saque para minha conta bancária?')}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-orange-600/30 hover:text-orange-400 border border-slate-700 whitespace-nowrap transition"
            >
              💰 Saques & Carteira
            </button>
            <button
              onClick={() => handleSend('Como cadastrar um curso em vídeo e módulos?')}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-orange-600/30 hover:text-orange-400 border border-slate-700 whitespace-nowrap transition"
            >
              📦 Criar Curso
            </button>
            <button
              onClick={() => handleSend('Como funciona o Programa de Afiliados?')}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-orange-600/30 hover:text-orange-400 border border-slate-700 whitespace-nowrap transition"
            >
              🤝 Afiliados
            </button>
            <button
              onClick={() => handleSend('O que é o Hotplace e como navegar?')}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-orange-600/30 hover:text-orange-400 border border-slate-700 whitespace-nowrap transition"
            >
              🔥 Hotplace
            </button>
            <button
              onClick={() => handleSend('Como instalar o app HOT-M no celular?')}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-orange-600/30 hover:text-orange-400 border border-slate-700 whitespace-nowrap transition"
            >
              📱 PWA Offline
            </button>
          </div>

          {/* Área de Mensagens (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 space-y-2.5 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-orange-600 text-white rounded-br-xs'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  {/* Texto da Mensagem */}
                  <div className="whitespace-pre-line space-y-1">
                    {msg.text}
                  </div>

                  {/* Links de Ação Rápidos */}
                  {msg.actionLinks && msg.actionLinks.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                      {msg.actionLinks.map((link, idx) => (
                        <Link
                          key={idx}
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-[11px] font-bold transition"
                        >
                          <span>{link.label}</span>
                          <span>&rarr;</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Perguntas Sugeridas (Follow-up chips) */}
                {msg.sender === 'assistant' && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-2 space-y-1 max-w-[95%]">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      Sugestões de Perguntas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.suggestedFollowUps.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(suggestion)}
                          className="text-left px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] transition"
                        >
                          💬 {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[9px] text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 max-w-[120px]">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-300 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] text-slate-400 font-medium ml-1">Consultando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Entrada de Mensagem */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre pagamentos, saques, cursos..."
                className="w-full pl-3.5 pr-12 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-inner"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="absolute right-2 p-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white transition disabled:cursor-not-allowed"
                title="Enviar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-slate-500 text-center mt-1.5">
              ⚡ Motor nativo HOT-M • Responde qualquer dúvida sem gastar créditos de IA
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default HotmAssistantWidget;
