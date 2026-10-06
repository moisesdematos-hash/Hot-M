import { describe, it, expect, vi } from 'vitest';
import { SupportService } from '@/modules/support/support-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('SupportService Unit Tests (Phase 19 - Tickets & Dispute Resolution)', () => {
  const customerId = 'cust-support-uuid-1';
  const intruderId = 'intruder-support-uuid-2';
  const staffId = 'staff-support-uuid-3';
  const ticketId = 'ticket-1234-uuid';
  const orderId = 'order-legit-uuid';

  it('rejects ticket creation with invalid subject or description', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new SupportService(mockSupabase);

    await expect(
      service.createTicket(customerId, { subject: 'Oi', description: 'Descricao longa' })
    ).rejects.toThrow('INVALID_SUBJECT');

    await expect(
      service.createTicket(customerId, { subject: 'Assunto Valido', description: '123' })
    ).rejects.toThrow('INVALID_DESCRIPTION');
  });

  it('rejects dispute creation on someone else order (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: orderId, buyer_id: 'other-user-uuid' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new SupportService(mockSupabase);

    await expect(
      service.createTicket(customerId, {
        subject: 'Contestação de Compra',
        description: 'Não reconheço a transação',
        orderId,
      })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('creates ticket and initial message thread entry', async () => {
    const insertMessageSpy = vi.fn().mockResolvedValue({ error: null });
    const mockTicketRow = {
      id: ticketId,
      user_id: customerId,
      subject: 'Problema com download',
      description: 'O link está expirado',
      category: 'ACCESS',
      priority: 'HIGH',
      status: 'OPEN',
      order_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockTicketRow,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'support_ticket_messages') {
          return {
            insert: insertMessageSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new SupportService(mockSupabase);
    const created = await service.createTicket(customerId, {
      subject: 'Problema com download',
      description: 'O link está expirado',
      category: 'ACCESS',
      priority: 'HIGH',
    });

    expect(created.id).toBe(ticketId);
    expect(created.category).toBe('ACCESS');
    expect(created.status).toBe('OPEN');
    expect(insertMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks stranger from viewing ticket details (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: ticketId, user_id: customerId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new SupportService(mockSupabase);

    // Stranger blocked
    await expect(
      service.getTicketDetails(ticketId, intruderId, false)
    ).rejects.toThrow('FORBIDDEN');

    // Staff allowed
    const staffMockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: ticketId,
                    user_id: customerId,
                    subject: 'Dúvida',
                    description: 'Ajuda',
                    category: 'GENERAL',
                    priority: 'MEDIUM',
                    status: 'OPEN',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'support_ticket_messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const staffService = new SupportService(staffMockSupabase);
    const details = await staffService.getTicketDetails(ticketId, staffId, true);
    expect(details.id).toBe(ticketId);
  });

  it('updates ticket status state machine: staff reply sets WAITING_CUSTOMER', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: ticketId, user_id: customerId, status: 'OPEN' },
                  error: null,
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        if (table === 'support_ticket_messages') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-1',
                    ticket_id: ticketId,
                    sender_id: staffId,
                    message: 'Olá, enviamos o novo link para o seu email.',
                    is_staff: true,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new SupportService(mockSupabase);
    await service.addMessage(ticketId, staffId, 'Olá, enviamos o novo link para o seu email.', true);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'WAITING_CUSTOMER',
      })
    );
  });

  it('restricts customer status mutation: customer can only mark RESOLVED or CLOSED', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: ticketId, user_id: customerId, status: 'WAITING_CUSTOMER' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new SupportService(mockSupabase);

    // Customer trying to set arbitrary status -> rejected
    await expect(
      service.updateTicketStatus(ticketId, customerId, 'IN_PROGRESS', false)
    ).rejects.toThrow('FORBIDDEN');

    // Customer marking as RESOLVED -> allowed
    const resolved = await service.updateTicketStatus(ticketId, customerId, 'RESOLVED', false);
    expect(resolved).toBe(true);
  });
});
