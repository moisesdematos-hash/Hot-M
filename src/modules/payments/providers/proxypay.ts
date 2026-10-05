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

  async createPayment(request: PaymentCreationRequest): Promise<PaymentCreationResponse> {
    if (request.amount.currency !== 'AOA') {
      throw new Error(`ProxyPay only supports AOA currency, received ${request.amount.currency}`);
    }

    // In a live call, HOT-M calls ProxyPay PUT /references/:referenceId
    // For Phase 0/Foundation, the adapter defines the contractual HTTP call and validation
    const referenceNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    const expiryDate = new Date(Date.now() + (request.expiryMinutes ?? 1440) * 60 * 1000).toISOString();

    return {
      providerReference: referenceNumber,
      paymentMethod: 'MULTICAIXA_REFERENCE',
      instructions: {
        entity: this.config.entity,
        reference: referenceNumber,
        amount: request.amount.toMajorString(),
        expiresAt: expiryDate,
      },
      rawResponse: {
        entity: this.config.entity,
        reference: referenceNumber,
        amount: request.amount.toMajorString(),
        expiry: expiryDate,
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
    
    // ProxyPay event schema: { id, reference_id, amount, datetime, status }
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
    // Contractual method to query ProxyPay API
    if (!providerReference) {
      throw new Error('Provider reference is required to check status');
    }
    return 'PENDING';
  }

  async refund(_request: RefundRequest): Promise<RefundResponse> {
    throw new Error('ProxyPay Multicaixa reference refunds must be processed through manual/bank-transfer workflow');
  }
}
