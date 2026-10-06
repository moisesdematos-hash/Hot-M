'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface MessageItem {
  id: string;
  ticketId: string;
  senderId: string;
  senderName?: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: MessageItem[];
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/support/tickets/${id}`);
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
      } else {
        setError(data.error || 'Erro ao carregar detalhes do chamado');
      }
    } catch {
      setError('Falha de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar resposta');
      }

      setReplyText('');
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveTicket = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });

      if (res.ok) {
        await fetchTicket();
      }
    } catch {
      // non-blocking
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-400 text-sm animate-pulse">
        Carregando detalhes do chamado...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Link href="/dashboard/support" className="text-xs text-blue-600 hover:underline">
          ← Voltar para todos os chamados
        </Link>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error || 'Chamado não encontrado.'}
        </div>
      </div>
    );
  }

  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <Link href="/dashboard/support" className="hover:text-blue-600 transition-colors">
          Suporte
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-mono text-xs">
          #{ticket.id.substring(0, 8)}
        </span>
      </div>

      {/* Ticket Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {ticket.category}
              </span>
              <span className="text-xs text-slate-400">
                Prioridade: {ticket.priority}
              </span>
              {ticket.orderId && (
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                  Pedido: #{ticket.orderId.substring(0, 8)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {ticket.subject}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              ticket.status === 'RESOLVED'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : ticket.status === 'CLOSED'
                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {ticket.status}
            </span>

            {!isResolvedOrClosed && (
              <button
                onClick={handleResolveTicket}
                disabled={isUpdatingStatus}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
              >
                ✓ Marcar como Resolvido
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Histórico da Conversa ({ticket.messages?.length || 0})
        </h2>

        <div className="space-y-3">
          {ticket.messages?.map((m) => (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all ${
                m.isStaff
                  ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 ml-4 sm:ml-8'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mr-4 sm:mr-8'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {m.senderName}
                  </span>
                  {m.isStaff ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                      Equipa de Suporte
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Cliente
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(m.createdAt).toLocaleDateString('pt-AO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {m.message}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply Form */}
      {!isResolvedOrClosed ? (
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Enviar Resposta
          </h3>
          <textarea
            rows={3}
            required
            placeholder="Escreva a sua resposta ou adicione informações adicionais..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSending ? 'Enviando...' : 'Responder Chamado'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Este chamado foi concluído como <strong>{ticket.status}</strong>. Caso necessite de novo auxílio, por favor abra um novo ticket.
        </div>
      )}
    </div>
  );
}
