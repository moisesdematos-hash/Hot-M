import { describe, it, expect, vi } from 'vitest';
import {
  SupportService,
  SupportTicket,
  SupportTicketMessage,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/modules/support/support-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Support & Dispute Lifecycle (Phase 19 - Customer Support & Dispute Resolution)', () => {
  const buyerId = 'buyer-e2e-support-uuid';
  const strangerId = 'stranger-e2e-support-uuid';
  const staffId = 'staff-e2e-support-uuid';
  const orderId = 'order-dispute-e2e-uuid';

  // In-memory stores
  const ticketsStore: SupportTicket[] = [];
  const messagesStore: SupportTicketMessage[] = [];
  const notificationsStore: Array<{ userId: string; title: string; message: string }> = [];

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_col: string, val: string) => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: val === orderId ? { id: orderId, buyer_id: buyerId } : null,
                error: null,
              }),
            })),
          }),
        };
      }

      if (table === 'support_tickets') {
        return {
          insert: vi.fn().mockImplementation((rec: {
            user_id: string;
            subject: string;
            description: string;
            category: string;
            priority: string;
            status: string;
            order_id?: string | null;
            created_at: string;
            updated_at: string;
          }) => {
            const newTicket: SupportTicket = {
              id: `tkt-${ticketsStore.length + 1}`,
              userId: rec.user_id,
              subject: rec.subject,
              description: rec.description,
              category: rec.category as TicketCategory,
              priority: rec.priority as TicketPriority,
              status: rec.status as TicketStatus,
              orderId: rec.order_id || null,
              createdAt: rec.created_at,
              updatedAt: rec.updated_at,
            };
            ticketsStore.push(newTicket);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: newTicket.id,
                    user_id: newTicket.userId,
                    subject: newTicket.subject,
                    description: newTicket.description,
                    category: newTicket.category,
                    priority: newTicket.priority,
                    status: newTicket.status,
                    order_id: newTicket.orderId,
                    created_at: newTicket.createdAt,
                    updated_at: newTicket.updatedAt,
                  },
                  error: null,
                }),
              }),
            };
          }),

          select: vi.fn().mockImplementation((_fields?: string) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => ({
              maybeSingle: vi.fn().mockImplementation(() => {
                const found = ticketsStore.find((t) => col === 'id' && t.id === val);
                return Promise.resolve({
                  data: found
                    ? {
                        id: found.id,
                        user_id: found.userId,
                        subject: found.subject,
                        description: found.description,
                        category: found.category,
                        priority: found.priority,
                        status: found.status,
                        order_id: found.orderId,
                        created_at: found.createdAt,
                        updated_at: found.updatedAt,
                        user_profiles: { id: found.userId, full_name: 'Comprador Teste', email: 'teste@exemplo.ao' },
                      }
                    : null,
                  error: null,
                });
              }),
            })),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation((limit: number) => {
                const list = ticketsStore.slice(0, limit).map((t) => ({
                  id: t.id,
                  user_id: t.userId,
                  subject: t.subject,
                  description: t.description,
                  category: t.category,
                  priority: t.priority,
                  status: t.status,
                  order_id: t.orderId,
                  created_at: t.createdAt,
                  updated_at: t.updatedAt,
                }));
                return Promise.resolve({ data: list, error: null });
              }),
            }),
          })),

          update: vi.fn().mockImplementation((updates: Partial<SupportTicket>) => ({
            eq: vi.fn().mockImplementation((_col: string, idVal: string) => {
              const ticket = ticketsStore.find((t) => t.id === idVal);
              if (ticket) {
                Object.assign(ticket, updates);
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      if (table === 'support_ticket_messages') {
        return {
          insert: vi.fn().mockImplementation((rec: {
            ticket_id: string;
            sender_id: string;
            message: string;
            is_staff: boolean;
            created_at: string;
          }) => {
            const newMsg: SupportTicketMessage = {
              id: `msg-${messagesStore.length + 1}`,
              ticketId: rec.ticket_id,
              senderId: rec.sender_id,
              message: rec.message,
              isStaff: rec.is_staff,
              createdAt: rec.created_at,
            };
            messagesStore.push(newMsg);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: newMsg.id,
                    ticket_id: newMsg.ticketId,
                    sender_id: newMsg.senderId,
                    message: newMsg.message,
                    is_staff: newMsg.isStaff,
                    created_at: newMsg.createdAt,
                  },
                  error: null,
                }),
              }),
            };
          }),

          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((_col: string, tId: string) => ({
              order: vi.fn().mockImplementation(() => {
                const thread = messagesStore
                  .filter((m) => m.ticketId === tId)
                  .map((m) => ({
                    id: m.id,
                    ticket_id: m.ticketId,
                    sender_id: m.senderId,
                    message: m.message,
                    is_staff: m.isStaff,
                    created_at: m.createdAt,
                    user_profiles: { id: m.senderId, full_name: m.isStaff ? 'Suporte' : 'Cliente' },
                  }));
                return Promise.resolve({ data: thread, error: null });
              }),
            })),
          })),
        };
      }

      if (table === 'notifications') {
        return {
          insert: vi.fn().mockImplementation((n: { user_id: string; title: string; message: string }) => {
            notificationsStore.push({
              userId: n.user_id,
              title: n.title,
              message: n.message,
            });
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  it('orchestrates complete support & dispute resolution flow: ticket creation -> intruder blocked -> staff reply -> customer response -> resolution', async () => {
    const supportService = new SupportService(mockSupabase);

    // 1. Customer creates dispute ticket linked to an order
    const createdTicket = await supportService.createTicket(buyerId, {
      subject: 'Dificuldade no acesso ao módulo de download',
      description: 'O link gerado pelo pedido está gerando timeout no navegador.',
      category: 'ACCESS',
      priority: 'HIGH',
      orderId,
    });

    expect(createdTicket.id).toBe('tkt-1');
    expect(createdTicket.status).toBe('OPEN');
    expect(createdTicket.orderId).toBe(orderId);
    expect(messagesStore).toHaveLength(1); // initial description saved as message 1

    // 2. Stranger attempts to snoop into the ticket -> BLOCKED
    await expect(
      supportService.getTicketDetails(createdTicket.id, strangerId, false)
    ).rejects.toThrow('FORBIDDEN');

    // 3. Support Staff inspects ticket thread
    const staffView = await supportService.getTicketDetails(createdTicket.id, staffId, true);
    expect(staffView.id).toBe(createdTicket.id);
    expect(staffView.messages).toHaveLength(1);

    // 4. Staff replies with solution
    const staffReply = await supportService.addMessage(
      createdTicket.id,
      staffId,
      'Olá! Regeneramos a sua chave de download na aba Minha Biblioteca. Por favor tente novamente.',
      true
    );
    expect(staffReply.isStaff).toBe(true);

    // Ticket status should now transition to WAITING_CUSTOMER
    const ticketAfterStaff = ticketsStore.find((t) => t.id === createdTicket.id);
    expect(ticketAfterStaff?.status).toBe('WAITING_CUSTOMER');

    // Customer should have received an in-app notification
    expect(notificationsStore).toHaveLength(1);
    expect(notificationsStore[0]?.userId).toBe(buyerId);

    // 5. Customer tests download, confirms resolution, and replies back
    await supportService.addMessage(
      createdTicket.id,
      buyerId,
      'Perfeito! O link funcionou perfeitamente. Muito obrigado pela agilidade.',
      false
    );

    // Ticket status transitions to IN_PROGRESS
    expect(ticketAfterStaff?.status).toBe('IN_PROGRESS');

    // 6. Customer marks ticket as RESOLVED
    const resolved = await supportService.updateTicketStatus(createdTicket.id, buyerId, 'RESOLVED', false);
    expect(resolved).toBe(true);
    expect(ticketAfterStaff?.status).toBe('RESOLVED');

    // 7. Final inspection confirms complete 3-message audit trail
    const finalDetail = await supportService.getTicketDetails(createdTicket.id, buyerId, false);
    expect(finalDetail.status).toBe('RESOLVED');
    expect(finalDetail.messages).toHaveLength(3);
  });
});
