import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { WebhookEngine } from '@/modules/webhooks/webhook-engine';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('WebhookEngine Unit Tests (Section 30: 15-step Engine)', () => {
  const secretKey = 'test_webhook_secret_key_123';
  const adapter = new ProxyPayAdapter({
    apiUrl: 'https://api.sandbox.proxypay.co.ao',
    token: 'test_token',
    entity: '99999',
    webhookSecret: secretKey,
  });

  it('REJECT: Webhook with forged or missing HMAC signature must throw UNAUTHORIZED_SIGNATURE', async () => {
    const mockSupabase = {} as SupabaseClient;
    const engine = new WebhookEngine(mockSupabase, adapter);

    await expect(
      engine.processProxyPayWebhook({
        headers: { 'x-signature': 'invalid_forged_signature' },
        rawBody: JSON.stringify({ id: 'evt-1' }),
        requestId: 'req-bad-sig',
      })
    ).rejects.toThrow('UNAUTHORIZED_SIGNATURE');
  });

  it('REJECT: Webhook with amount mismatch must throw error and not mark order as PAID', async () => {
    const payload = JSON.stringify({
      id: 'evt-amount-mismatch',
      reference_id: '123456789',
      amount: '3000.00', // Received 3,000.00 AOA
      status: 'accepted',
    });

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(payload);
    const validSignature = hmac.digest('hex');

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_provider_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }), // Not duplicate
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'att-1',
                      order_id: 'ord-expected-5000',
                      provider_reference: '123456789',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'ord-expected-5000',
                    currency: 'AOA',
                    total_amount_minor: 500000n, // Expected 5,000.00 AOA!
                    status: 'PENDING_PAYMENT',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const engine = new WebhookEngine(mockSupabase, adapter);

    await expect(
      engine.processProxyPayWebhook({
        headers: { 'x-signature': validSignature },
        rawBody: payload,
        requestId: 'req-mismatch',
      })
    ).rejects.toThrow('Divergência monetária: esperado 500000, recebido 300000');
  });
});
