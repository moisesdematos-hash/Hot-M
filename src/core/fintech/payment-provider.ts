/**
 * HOT-M PAYMENT PROVIDER ABSTRACTION (Section 28)
 * 
 * Common contract for all payment processors (ProxyPay, and future PayPay / Stripe).
 * Invariant INV-001: Browser never defines final price.
 * Invariant INV-003: Frontend never confirms payment.
 */

import { Money } from './money';

export interface PaymentCreationRequest {
  orderId: string;
  amount: Money;
  customer: {
    id: string;
    email: string;
    name: string;
    phone?: string;
  };
  expiryMinutes?: number;
  metadata?: Record<string, string>;
}

export interface PaymentCreationResponse {
  providerReference: string; // e.g. ProxyPay reference ID
  paymentMethod: 'MULTICAIXA_REFERENCE' | 'CREDIT_CARD' | 'WALLET';
  instructions: {
    entity?: string; // e.g. 00000 for ProxyPay
    reference?: string; // 9-digit Multicaixa reference
    amount: string;
    expiresAt: string;
  };
  rawResponse: Record<string, unknown>;
}

export type NormalizedPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

export interface NormalizedWebhookEvent {
  eventId: string;
  orderId?: string;
  providerReference: string;
  status: NormalizedPaymentStatus;
  paidAmount?: Money;
  paidAt?: string;
  rawPayload: Record<string, unknown>;
}

export interface RefundRequest {
  orderId: string;
  paymentAttemptId: string;
  amount: Money;
  reason: string;
}

export interface RefundResponse {
  refundId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  rawResponse: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly providerName: string;

  /**
   * Generates a payment intent or bank reference.
   */
  createPayment(request: PaymentCreationRequest): Promise<PaymentCreationResponse>;

  /**
   * Validates cryptographic authenticity (HMAC signature) of an inbound webhook.
   */
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean;

  /**
   * Normalizes gateway-specific webhook payload into the HOT-M canonical format.
   */
  parseEvent(rawBody: string): NormalizedWebhookEvent;

  /**
   * Queries payment status directly from the gateway for reconciliation.
   */
  getPaymentStatus(providerReference: string): Promise<NormalizedPaymentStatus>;

  /**
   * Initiates a refund through the provider.
   */
  refund(request: RefundRequest): Promise<RefundResponse>;
}
