import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { WebhookEngine } from '@/modules/webhooks/webhook-engine';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('E2E-006: Webhook × 100 Idempotency Stress Test (Sections 30 & 55)', () => {
  const secretKey = 'strict_test_secret_for_idempotency_test';
  const adapter = new ProxyPayAdapter({
    apiUrl: 'https://api.sandbox.proxypay.co.ao',
    token: 'test_token',
    entity: '99999',
    webhookSecret: secretKey,
  });

  it('E2E-006: Processing the exact same webhook 100 times must produce exactly ONE payment effect', async () => {
    const rawPayload = JSON.stringify({
      id: 'tx-multicaixa-event-100-times',
      reference_id: '123456789',
      amount: '10000.00',
      status: 'accepted',
      datetime: '2026-03-05T12:00:00Z',
    });

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(rawPayload);
    const validSignature = hmac.digest('hex');

    // Estado em memória para simular persistência do banco
    const eventsStore = new Map<string, { status: string }>();
    let orderStatus = 'PENDING_PAYMENT';
    let ledgerTxCount = 0;
    let entitlementsCount = 0;

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_provider_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((_col: string, eventId: string) => ({
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    const found = eventsStore.get(eventId);
                    return { data: found ? { id: 'evt-db', status: found.status } : null };
                  }),
                })),
              }),
            }),
            insert: vi.fn().mockImplementation(async (record: { provider_event_id: string }) => {
              if (eventsStore.has(record.provider_event_id)) {
                return { error: { message: 'duplicate key value violates unique constraint' } };
              }
              eventsStore.set(record.provider_event_id, { status: 'RECEIVED' });
              return { error: null };
            }),
            update: vi.fn().mockImplementation((data: { status: string }) => ({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((_col: string, eventId: string) => {
                  eventsStore.set(eventId, { status: data.status });
                  return Promise.resolve({ error: null });
                }),
              }),
            })),
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
                      order_id: 'ord-100',
                      provider_reference: '123456789',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation(async () => ({
                  data: {
                    id: 'ord-100',
                    buyer_id: 'buyer-user-1',
                    currency: 'AOA',
                    total_amount_minor: 1000000n, // 10,000.00 AOA
                    status: orderStatus,
                    order_items: [{ product_id: 'prod-1' }],
                  },
                  error: null,
                })),
              }),
            }),
            update: vi.fn().mockImplementation((updateData: { status: string }) => {
              orderStatus = updateData.status;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === 'ledger_accounts') {
          const chain = {
            eq: vi.fn(),
            is: vi.fn(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'acc-1' }, error: null }),
          };
          chain.eq.mockReturnValue(chain);
          chain.is.mockReturnValue(chain);
          return {
            select: vi.fn().mockReturnValue(chain),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'acc-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'ledger_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => {
              ledgerTxCount++;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'tx-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'ledger_entries') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'entitlements') {
          return {
            upsert: vi.fn().mockImplementation(async () => {
              entitlementsCount++;
              return { error: null };
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { creator_id: 'crt-1' } }),
              }),
            }),
          };
        }
        if (table === 'audit_logs' || table === 'outbox_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const engine = new WebhookEngine(mockSupabase, adapter);

    const results = [];

    // EXECUTA O MESMO WEBHOOK 100 VEZES
    for (let i = 0; i < 100; i++) {
      const res = await engine.processProxyPayWebhook({
        headers: { 'x-signature': validSignature },
        rawBody: rawPayload,
        requestId: `req-e2e-006-${i}`,
      });
      results.push(res);
    }

    // EVIDÊNCIAS DE IDEMPOTÊNCIA
    const firstCall = results[0];
    const subsequentCalls = results.slice(1);

    expect(firstCall?.success).toBe(true);
    expect(firstCall?.duplicate).toBe(false);
    expect(firstCall?.status).toBe('PAID');

    // As outras 99 chamadas DEVEM ser marcadas como DUPLICATE
    expect(subsequentCalls).toHaveLength(99);
    for (const call of subsequentCalls) {
      expect(call.success).toBe(true);
      expect(call.duplicate).toBe(true);
    }

    // EFEITO EXATO: Apenas 1 transação no ledger e 1 atribuição de entitlement
    expect(orderStatus).toBe('PAID');
    expect(ledgerTxCount).toBe(1);
    expect(entitlementsCount).toBe(1);
  });
});
