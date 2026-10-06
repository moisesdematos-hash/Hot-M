import { SupabaseClient } from '@supabase/supabase-js';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'GENERAL' | 'PAYMENT' | 'ACCESS' | 'REFUND' | 'AFFILIATE' | 'TECHNICAL';

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName?: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SupportTicketMessage[];
}

export class SupportService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Creates a new support ticket or dispute.
   */
  async createTicket(
    userId: string,
    data: {
      subject: string;
      description: string;
      category?: TicketCategory;
      priority?: TicketPriority;
      orderId?: string;
    }
  ): Promise<SupportTicket> {
    if (!data.subject || data.subject.trim().length < 3) {
      throw new Error('INVALID_SUBJECT: Assunto deve ter no mínimo 3 caracteres.');
    }
    if (!data.description || data.description.trim().length < 5) {
      throw new Error('INVALID_DESCRIPTION: Descrição deve ter no mínimo 5 caracteres.');
    }

    // 1. Verify order ownership if orderId is provided (IDOR defense)
    if (data.orderId) {
      const { data: order } = await this.client
        .from('orders')
        .select('id, buyer_id')
        .eq('id', data.orderId)
        .maybeSingle();

      if (!order || order.buyer_id !== userId) {
        throw new Error('FORBIDDEN: O pedido especificado não pertence ao utilizador autenticado.');
      }
    }

    // 2. Insert ticket
    const now = new Date().toISOString();
    const { data: ticket, error } = await this.client
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject: data.subject.trim(),
        description: data.description.trim(),
        category: data.category || 'GENERAL',
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        order_id: data.orderId || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !ticket) {
      throw new Error(`TICKET_CREATE_FAILED: ${error?.message || 'Falha ao criar ticket'}`);
    }

    // 3. Insert initial message thread entry from description
    await this.client.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message: data.description.trim(),
      is_staff: false,
      created_at: now,
    });

    return {
      id: ticket.id,
      userId: ticket.user_id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category as TicketCategory,
      priority: ticket.priority as TicketPriority,
      status: ticket.status as TicketStatus,
      orderId: ticket.order_id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    };
  }

  /**
   * Lists tickets for the authenticated user or all tickets for staff/admin.
   */
  async getTickets(
    userId: string,
    options: {
      isStaff?: boolean;
      status?: string;
      limit?: number;
    } = {}
  ): Promise<SupportTicket[]> {
    const limit = options.limit || 50;
    let query = this.client
      .from('support_tickets')
      .select('*, user_profiles:user_id(id, full_name, email)')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (!options.isStaff) {
      query = query.eq('user_id', userId);
    }

    if (options.status && options.status !== 'ALL') {
      query = query.eq('status', options.status);
    }

    const { data: records, error } = await query;

    if (error) {
      throw new Error(`TICKETS_FETCH_FAILED: ${error.message}`);
    }

    return (records || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_profiles?.full_name,
      userEmail: r.user_profiles?.email,
      subject: r.subject,
      description: r.description,
      category: r.category as TicketCategory,
      priority: r.priority as TicketPriority,
      status: r.status as TicketStatus,
      orderId: r.order_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Retrieves ticket details along with full message thread (IDOR protected).
   */
  async getTicketDetails(
    ticketId: string,
    userId: string,
    isStaff = false
  ): Promise<SupportTicket> {
    const { data: ticket, error: ticketErr } = await this.client
      .from('support_tickets')
      .select('*, user_profiles:user_id(id, full_name, email)')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      throw new Error('TICKET_NOT_FOUND: Ticket de suporte não encontrado.');
    }

    // IDOR Defense: only creator or staff can view
    if (!isStaff && ticket.user_id !== userId) {
      throw new Error('FORBIDDEN: Acesso negado a este ticket.');
    }

    // Fetch messages
    const { data: msgRows, error: msgErr } = await this.client
      .from('support_ticket_messages')
      .select('*, user_profiles:sender_id(id, full_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (msgErr) {
      throw new Error(`MESSAGES_FETCH_FAILED: ${msgErr.message}`);
    }

    const messages: SupportTicketMessage[] = (msgRows || []).map((m) => ({
      id: m.id,
      ticketId: m.ticket_id,
      senderId: m.sender_id,
      senderName: m.user_profiles?.full_name || (m.is_staff ? 'Equipa de Suporte' : 'Cliente'),
      message: m.message,
      isStaff: m.is_staff,
      createdAt: m.created_at,
    }));

    return {
      id: ticket.id,
      userId: ticket.user_id,
      userName: ticket.user_profiles?.full_name,
      userEmail: ticket.user_profiles?.email,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category as TicketCategory,
      priority: ticket.priority as TicketPriority,
      status: ticket.status as TicketStatus,
      orderId: ticket.order_id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      messages,
    };
  }

  /**
   * Appends a message to an existing ticket and updates status automatically.
   */
  async addMessage(
    ticketId: string,
    senderId: string,
    message: string,
    isStaff = false
  ): Promise<SupportTicketMessage> {
    if (!message || message.trim().length === 0) {
      throw new Error('INVALID_MESSAGE: A mensagem não pode estar vazia.');
    }

    // Verify ticket exists and participant rights
    const { data: ticket, error: ticketErr } = await this.client
      .from('support_tickets')
      .select('id, user_id, status')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      throw new Error('TICKET_NOT_FOUND: Ticket não localizado.');
    }

    if (!isStaff && ticket.user_id !== senderId) {
      throw new Error('FORBIDDEN: Você não tem permissão para responder a este ticket.');
    }

    const now = new Date().toISOString();

    // 1. Insert message
    const { data: msgRow, error: msgErr } = await this.client
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        message: message.trim(),
        is_staff: isStaff,
        created_at: now,
      })
      .select()
      .single();

    if (msgErr || !msgRow) {
      throw new Error(`MESSAGE_INSERT_FAILED: ${msgErr?.message || 'Falha ao gravar resposta'}`);
    }

    // 2. Compute new status
    // If staff answered -> WAITING_CUSTOMER
    // If customer answered -> IN_PROGRESS
    let nextStatus: TicketStatus = ticket.status as TicketStatus;
    if (isStaff && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      nextStatus = 'WAITING_CUSTOMER';
    } else if (!isStaff && (ticket.status === 'WAITING_CUSTOMER' || ticket.status === 'OPEN')) {
      nextStatus = 'IN_PROGRESS';
    }

    // 3. Update ticket updated_at and status
    await this.client
      .from('support_tickets')
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq('id', ticketId);

    // 4. Trigger in-app notification for the counterpart
    try {
      const recipientId = isStaff ? ticket.user_id : null;
      if (recipientId) {
        await this.client.from('notifications').insert({
          user_id: recipientId,
          title: '💬 Nova Resposta no Ticket de Suporte',
          message: `A equipa de suporte respondeu ao seu ticket: "${message.trim().substring(0, 80)}..."`,
          link: `/dashboard/support/${ticketId}`,
          type: 'INFO',
          is_read: false,
        });
      }
    } catch {
      // Non-blocking notification emission
    }

    return {
      id: msgRow.id,
      ticketId: msgRow.ticket_id,
      senderId: msgRow.sender_id,
      message: msgRow.message,
      isStaff: msgRow.is_staff,
      createdAt: msgRow.created_at,
    };
  }

  /**
   * Updates ticket status (e.g. RESOLVED, CLOSED, IN_PROGRESS).
   */
  async updateTicketStatus(
    ticketId: string,
    userId: string,
    newStatus: TicketStatus,
    isStaff = false
  ): Promise<boolean> {
    const { data: ticket, error: ticketErr } = await this.client
      .from('support_tickets')
      .select('id, user_id, status')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      throw new Error('TICKET_NOT_FOUND: Ticket não encontrado.');
    }

    // Customer can only mark as RESOLVED or CLOSED on their own ticket
    if (!isStaff) {
      if (ticket.user_id !== userId) {
        throw new Error('FORBIDDEN: Apenas o titular ou suporte podem alterar o status.');
      }
      if (newStatus !== 'RESOLVED' && newStatus !== 'CLOSED') {
        throw new Error('FORBIDDEN: Clientes só podem finalizar o ticket como RESOLVED ou CLOSED.');
      }
    }

    const { error } = await this.client
      .from('support_tickets')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      throw new Error(`STATUS_UPDATE_FAILED: ${error.message}`);
    }

    return true;
  }
}
