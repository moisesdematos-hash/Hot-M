/**
 * Email Service (Phase 18 - Transactional Email Gateway)
 * Integrates with Resend API for high-deliverability transactional emails.
 * Supports sandbox simulation mode when RESEND_API_KEY is omitted.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

export class EmailService {
  private apiKey?: string;
  private defaultFrom: string;

  constructor(apiKey?: string, defaultFrom = 'HOT-M <noreply@hot-m.com>') {
    this.apiKey = apiKey || process.env.RESEND_API_KEY;
    this.defaultFrom = defaultFrom;
  }

  /**
   * Dispatches email via Resend API or simulates delivery in development/test.
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const from = options.from || this.defaultFrom;

    if (!this.apiKey) {
      // Simulation mode for sandbox / dev / test environments
      return {
        success: true,
        simulated: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend HTTP error ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha na conexão com gateway de email';
      return {
        success: false,
        error: message,
      };
    }
  }

  // ==========================================
  // TRANSACTIONAL TEMPLATES
  // ==========================================

  /**
   * Template: Order Confirmation & Access Delivery
   */
  createOrderPaidEmail(data: {
    buyerName: string;
    orderId: string;
    totalAmount: string;
    currency: string;
    productTitle: string;
    libraryUrl: string;
  }): { subject: string; html: string } {
    const subject = `🎉 Pagamento Confirmado: Acesso liberado para ${data.productTitle}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">HOT-M</h1>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Plataforma Oficial de Conteúdo Digital</p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 18px; margin: 0 0 12px 0; color: #0f172a;">Olá, ${data.buyerName}!</h2>
          <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #334155;">
            Seu pagamento foi aprovado com sucesso e os seus acessos imediatos já estão disponíveis na sua biblioteca digital.
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Produto:</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a;">${data.productTitle}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Número do Pedido:</td>
            <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #0f172a;">${data.orderId.substring(0, 8)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">Valor Pago:</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #16a34a;">${data.totalAmount} ${data.currency}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.libraryUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
            Aceder aos Meus Conteúdos
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          Esta é uma mensagem automática de confirmação da HOT-M. Em caso de dúvidas, contacte o suporte.
        </p>
      </div>
    `;

    return { subject, html };
  }

  /**
   * Template: Withdrawal Notification
   */
  createWithdrawalStatusEmail(data: {
    userName: string;
    amount: string;
    currency: string;
    status: 'APPROVED' | 'REJECTED';
    reason?: string;
  }): { subject: string; html: string } {
    const isApproved = data.status === 'APPROVED';
    const subject = isApproved
      ? `✅ Levantamento Aprovado: ${data.amount} ${data.currency}`
      : `⚠️ Atualização do seu pedido de levantamento: ${data.amount} ${data.currency}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'}; font-size: 20px; margin-top: 0;">
          ${isApproved ? 'Levantamento Processado com Sucesso' : 'Pedido de Levantamento Recusado'}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">Olá, ${data.userName}.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${
            isApproved
              ? `O seu levantamento no valor de <strong>${data.amount} ${data.currency}</strong> foi liquidado e transferido para a sua conta bancária de destino.`
              : `O seu pedido de levantamento de <strong>${data.amount} ${data.currency}</strong> não pôde ser concluído.${data.reason ? ` Motivo: ${data.reason}` : ''} Os fundos foram estornados para o seu saldo disponível.`
          }
        </p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Equipa Financeira HOT-M</p>
      </div>
    `;

    return { subject, html };
  }

  /**
   * Template: Creator / Affiliate New Sale Notification
   */
  createSaleAlertEmail(data: {
    beneficiaryName: string;
    role: 'CREATOR' | 'AFFILIATE' | 'COPRODUCER';
    productTitle: string;
    netAmount: string;
    currency: string;
  }): { subject: string; html: string } {
    const roleLabel =
      data.role === 'AFFILIATE'
        ? 'Comissão de Afiliado'
        : data.role === 'COPRODUCER'
        ? 'Divisão de Coprodução'
        : 'Venda de Produtor';

    const subject = `💰 Nova venda realizada! (${roleLabel}: +${data.netAmount} ${data.currency})`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #16a34a; font-size: 20px; margin-top: 0;">🎉 Parabéns, você fez uma venda!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">Olá, ${data.beneficiaryName}!</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #15803d;">Produto: <strong>${data.productTitle}</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #16a34a;">+${data.netAmount} ${data.currency}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">O crédito já foi lançado no seu saldo de livro-razão e estará disponível conforme os prazos de retenção.</p>
      </div>
    `;

    return { subject, html };
  }
}
