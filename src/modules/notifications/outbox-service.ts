import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from './notification-service';
import { EmailService } from './email-service';

export interface OutboxEventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  destination_url: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  retry_count: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface ProcessBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export class OutboxService {
  private client: SupabaseClient;
  private notificationService: NotificationService;
  private emailService: EmailService;

  constructor(
    client: SupabaseClient,
    notificationService?: NotificationService,
    emailService?: EmailService
  ) {
    this.client = client;
    this.notificationService = notificationService || new NotificationService(client);
    this.emailService = emailService || new EmailService();
  }

  /**
   * Enqueues an event into the transactional outbox.
   */
  async enqueueEvent(
    eventType: string,
    payload: Record<string, unknown>,
    destinationUrl?: string
  ): Promise<string> {
    const { data: record, error } = await this.client
      .from('outbox_events')
      .insert({
        event_type: eventType,
        payload,
        destination_url: destinationUrl || null,
        status: 'PENDING',
        retry_count: 0,
      })
      .select('id')
      .single();

    if (error || !record) {
      throw new Error(`OUTBOX_ENQUEUE_FAILED: ${error?.message || 'Falha ao enfileirar evento'}`);
    }

    return record.id;
  }

  /**
   * Worker loop: processes pending events from the outbox with automatic retry handling.
   */
  async processPendingEvents(batchSize = 20): Promise<ProcessBatchResult> {
    const { data: events, error } = await this.client
      .from('outbox_events')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error || !events || events.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.handleEvent(event as OutboxEventRow);

        // Mark event as SENT
        await this.client
          .from('outbox_events')
          .update({
            status: 'SENT',
            processed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', event.id);

        succeeded++;
      } catch (err: unknown) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : 'Erro ao processar outbox event';
        const newRetryCount = (event.retry_count || 0) + 1;
        const newStatus = newRetryCount >= 3 ? 'FAILED' : 'PENDING';

        await this.client
          .from('outbox_events')
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            error_message: errorMessage,
            processed_at: newStatus === 'FAILED' ? new Date().toISOString() : null,
          })
          .eq('id', event.id);
      }
    }

    return {
      processed: events.length,
      succeeded,
      failed,
    };
  }

  /**
   * Core dispatcher handling distinct domain event types.
   */
  private async handleEvent(event: OutboxEventRow): Promise<void> {
    const { event_type, payload } = event;

    switch (event_type) {
      case 'order.paid': {
        const buyerId = payload.buyerId as string;
        const orderId = payload.orderId as string;
        const productTitle = (payload.productTitle as string) || 'o seu produto digital';
        const totalAmount = (payload.totalAmount as string) || '0.00';
        const currency = (payload.currency as string) || 'AOA';
        const buyerEmail = payload.buyerEmail as string | undefined;
        const buyerName = (payload.buyerName as string) || 'Cliente';

        // 1. In-app notification for buyer
        if (buyerId) {
          await this.notificationService.createNotification(buyerId, {
            title: '🎉 Pagamento Confirmado!',
            message: `O seu acesso a "${productTitle}" foi liberado imediatamente na sua biblioteca.`,
            link: '/library',
            type: 'SUCCESS',
          });
        }

        // 2. Transactional email for buyer
        if (buyerEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const emailData = this.emailService.createOrderPaidEmail({
            buyerName,
            orderId,
            totalAmount,
            currency,
            productTitle,
            libraryUrl: `${appUrl}/library`,
          });
          await this.emailService.sendEmail({
            to: buyerEmail,
            subject: emailData.subject,
            html: emailData.html,
          });
        }

        // 3. In-app notification for creator (if present)
        const creatorId = payload.creatorId as string | undefined;
        if (creatorId) {
          await this.notificationService.createNotification(creatorId, {
            title: '💰 Nova Venda Realizada!',
            message: `Você fez uma nova venda de "${productTitle}" no valor de ${totalAmount} ${currency}.`,
            link: '/dashboard/finance',
            type: 'SALE',
          });
        }

        // 4. In-app notification for affiliate (if present)
        const affiliateUserId = payload.affiliateUserId as string | undefined;
        if (affiliateUserId) {
          await this.notificationService.createNotification(affiliateUserId, {
            title: '🤝 Comissão de Afiliado!',
            message: `Uma venda foi concluída através do seu link de afiliado para "${productTitle}".`,
            link: '/dashboard/affiliates',
            type: 'SALE',
          });
        }
        break;
      }

      case 'withdrawal.requested': {
        const userId = payload.userId as string;
        const amount = payload.amount as string;
        const currency = (payload.currency as string) || 'AOA';

        if (userId) {
          await this.notificationService.createNotification(userId, {
            title: '⏳ Pedido de Levantamento em Análise',
            message: `Recebemos a sua solicitação de levantamento de ${amount} ${currency}. O prazo padrão é de 24 a 48h úteis.`,
            link: '/dashboard/finance/withdraw',
            type: 'INFO',
          });
        }
        break;
      }

      case 'withdrawal.approved': {
        const userId = payload.userId as string;
        const amount = payload.amount as string;
        const currency = (payload.currency as string) || 'AOA';
        const userEmail = payload.userEmail as string | undefined;
        const userName = (payload.userName as string) || 'Utilizador';

        if (userId) {
          await this.notificationService.createNotification(userId, {
            title: '✅ Levantamento Aprovado e Liquidado',
            message: `O montante de ${amount} ${currency} foi transferido com sucesso para a sua conta bancária.`,
            link: '/dashboard/finance',
            type: 'SUCCESS',
          });
        }

        if (userEmail) {
          const emailData = this.emailService.createWithdrawalStatusEmail({
            userName,
            amount,
            currency,
            status: 'APPROVED',
          });
          await this.emailService.sendEmail({
            to: userEmail,
            subject: emailData.subject,
            html: emailData.html,
          });
        }
        break;
      }

      case 'withdrawal.rejected': {
        const userId = payload.userId as string;
        const amount = payload.amount as string;
        const currency = (payload.currency as string) || 'AOA';
        const reason = (payload.reason as string) || 'Inconsistência nos dados bancários.';
        const userEmail = payload.userEmail as string | undefined;
        const userName = (payload.userName as string) || 'Utilizador';

        if (userId) {
          await this.notificationService.createNotification(userId, {
            title: '⚠️ Levantamento Não Aprovado',
            message: `O levantamento de ${amount} ${currency} foi recusado: "${reason}". O valor retornou ao saldo.`,
            link: '/dashboard/finance/withdraw',
            type: 'ALERT',
          });
        }

        if (userEmail) {
          const emailData = this.emailService.createWithdrawalStatusEmail({
            userName,
            amount,
            currency,
            status: 'REJECTED',
            reason,
          });
          await this.emailService.sendEmail({
            to: userEmail,
            subject: emailData.subject,
            html: emailData.html,
          });
        }
        break;
      }

      case 'refund.approved': {
        const buyerId = payload.buyerId as string;
        const amount = payload.amount as string;
        const currency = (payload.currency as string) || 'AOA';

        if (buyerId) {
          await this.notificationService.createNotification(buyerId, {
            title: '↩️ Reembolso Processado',
            message: `O seu reembolso no valor de ${amount} ${currency} foi concluído com sucesso.`,
            link: '/dashboard/finance',
            type: 'WARNING',
          });
        }
        break;
      }

      default:
        // Generic event processed
        break;
    }
  }
}
