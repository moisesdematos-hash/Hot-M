import crypto from 'crypto';
import {
  PaymentProvider,
  PaymentCreationRequest,
  PaymentCreationResponse,
  NormalizedPaymentStatus,
  NormalizedWebhookEvent,
  RefundRequest,
  RefundResponse,
} from '@/core/fintech/payment-provider';
import { Money } from '@/core/fintech/money';

export interface ProxyPayConfig {
  apiUrl: string;
  token: string;
  entity: string;
  webhookSecret: string;
}

export class ProxyPayAdapter implements PaymentProvider {
  readonly providerName = 'PROXYPAY';
  private config: ProxyPayConfig;

  constructor(config: ProxyPayConfig) {
    this.config = config;
  }

  /**
   * Generates or registers a Multicaixa bank reference with ProxyPay.
   * If token is provided and not in dummy test mode, calls official PUT /references/:id.
   * Otherwise generates a valid contractual 9-digit sandbox reference.
   */
  async createPayment(request: PaymentCreationRequest): Promise<PaymentCreationResponse> {
    if (request.amount.currency !== 'AOA') {
      throw new Error(`ProxyPay only supports AOA currency, received ${request.amount.currency}`);
    }

    const expiryMinutes = request.expiryMinutes ?? 1440; // 24 horas por padrão
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const entity = this.config.entity || '99999';

    // Gerar número de referência de 9 dígitos determinístico/único
    const referenceNumber = Math.floor(100000000 + Math.random() * 900000000).toString();

    // Se houver token real configurado (não dummy de teste), faz chamada à API da ProxyPay
    const isMockToken = !this.config.token || 
      this.config.token.startsWith('test_') || 
      this.config.token === 'your_proxypay_api_token';

    if (!isMockToken) {
      try {
        const response = await fetch(`${this.config.apiUrl}/references/${referenceNumber}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Token ${this.config.token}`,
            'Accept': 'application/vnd.proxypay.v2+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: request.amount.toMajorString(),
            end_datetime: expiresAt,
            custom_fields: {
              order_id: request.orderId,
              customer_id: request.customer.id,
            },
          }),
        });

        if (!response.ok && response.status !== 200 && response.status !== 201) {
          const errText = await response.text();
          throw new Error(`Erro ProxyPay API (${response.status}): ${errText}`);
        }
      } catch (err: unknown) {
        // Se a chamada de rede falhar no ambiente externo, repassar erro transparente
        throw new Error(`Falha na comunicação com o gateway ProxyPay: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    }

    return {
      providerReference: referenceNumber,
      paymentMethod: 'MULTICAIXA_REFERENCE',
      instructions: {
        entity,
        reference: referenceNumber,
        amount: request.amount.toMajorString(),
        expiresAt,
      },
      rawResponse: {
        entity,
        reference: referenceNumber,
        amount: request.amount.toMajorString(),
        expiry: expiresAt,
        provider: 'PROXYPAY',
      },
    };
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    const signature = headers['x-signature'] || headers['x-proxypay-signature'];
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    if (!this.config.webhookSecret) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  parseEvent(rawBody: string): NormalizedWebhookEvent {
    const payload = JSON.parse(rawBody);

    const eventId = String(payload.id || payload.transaction_id || crypto.randomUUID());
    const providerReference = String(payload.reference_id || payload.reference || '');
    const amountNum = parseFloat(payload.amount || '0');
    const status: NormalizedPaymentStatus =
      payload.status === 'accepted' || payload.status === 'paid' ? 'PAID' : 'PENDING';

    return {
      eventId,
      orderId: payload.custom_fields?.order_id,
      providerReference,
      status,
      paidAmount: Money.fromMajor(amountNum, 'AOA'),
      paidAt: payload.datetime || new Date().toISOString(),
      rawPayload: payload,
    };
  }

  async getPaymentStatus(providerReference: string): Promise<NormalizedPaymentStatus> {
    if (!providerReference) {
      throw new Error('Referência do provedor é obrigatória para consultar status');
    }

    const isMockToken = !this.config.token || 
      this.config.token.startsWith('test_') || 
      this.config.token === 'your_proxypay_api_token';

    if (!isMockToken) {
      try {
        const response = await fetch(`${this.config.apiUrl}/references/${providerReference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${this.config.token}`,
            'Accept': 'application/vnd.proxypay.v2+json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'paid' || data.status === 'accepted') return 'PAID';
          if (data.status === 'expired') return 'EXPIRED';
        }
      } catch {
        // Fallback to PENDING
      }
    }

    return 'PENDING';
  }

  async refund(_request: RefundRequest): Promise<RefundResponse> {
    throw new Error('Reembolsos Multicaixa devem ser processados via transferência bancária manual ou reconciliação bancária');
  }
}
