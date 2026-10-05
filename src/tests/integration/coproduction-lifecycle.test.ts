import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { CoproductionService } from '@/modules/coproduction/coproduction-service';
import { WebhookEngine } from '@/modules/webhooks/webhook-engine';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Coproduction Lifecycle & Multi-Split Accounting Integration Test (Phase 13 - INV-006)', () => {
  const creatorId = 'creator-coprod-uuid';
  const partnerId = 'partner-coprod-uuid';
  const productId = 'prod-coprod-uuid';
  const orderId = 'order-coprod-uuid';

  it('correctly splits sale revenue between primary creator and co-producer into separate ledger accounts', async () => {
    const insertedLedgerEntries: Array<{
      account_id: string;
      direction: 'DEBIT' | 'CREDIT';
      amount_minor: bigint;
    }> = [];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: productId,
                    creator_id: creatorId,
                    title: 'Curso Empreendedorismo Digital',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'revenue_shares') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ partner_id: partnerId, percentage: 30 }], // Partner gets 30%
                error: null,
              }),
            }),
          };
        }

        if (table === 'payment_provider_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }

        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'att-123',
                      order_id: orderId,
                      provider_reference: '999888777',
                      currency: 'AOA',
                      amount_minor: 1000000n, // 10,000.00 AOA
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
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: orderId,
                    buyer_id: 'buyer-uuid',
                    status: 'PENDING_PAYMENT',
                    currency: 'AOA',
                    total_amount_minor: 1000000n, // 10,000.00 AOA
                    affiliate_id: null,
                    order_items: [{ product_id: productId }],
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === 'ledger_accounts') {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn().mockReturnValue(chain);
          chain.eq = vi.fn().mockImplementation((_c: string, val: string) => {
            chain._ownerId = val;
            return chain;
          });
          chain.is = vi.fn().mockReturnValue(chain);
          chain.maybeSingle = vi.fn().mockImplementation(() =>
            Promise.resolve({
              data: { id: `acc-${chain._ownerId || 'platform'}` },
              error: null,
            })
          );
          return chain;
        }

        if (table === 'ledger_transactions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'tx-coprod-1' }, error: null }),
              }),
            }),
          };
        }

        if (table === 'ledger_entries') {
          return {
            insert: vi.fn().mockImplementation((entries: Array<{ account_id: string; direction: 'DEBIT' | 'CREDIT'; amount_minor: bigint }>) => {
              insertedLedgerEntries.push(...entries);
              return Promise.resolve({ error: null });
            }),
          };
        }

        if (table === 'entitlements' || table === 'audit_logs' || table === 'outbox_events') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {};
      }),
    } as unknown as SupabaseClient;

    // 1. Verify Coproduction Split calculation
    const coprodService = new CoproductionService(mockSupabase);
    const split = await coprodService.calculateSplit(productId, 900000n); // 900,000 net after platform fee

    expect(split.partners).toHaveLength(1);
    expect(split.partners[0]?.amountMinor).toBe(270000n); // 30% of 900,000 = 270,000 minor
    expect(split.primaryCreatorAmountMinor).toBe(630000n); // 70% of 900,000 = 630,000 minor

    // 2. Process Webhook Payment and verify multi-split ledger entries
    const secretKey = 'webhook_secret_test';
    const adapter = new ProxyPayAdapter({
      apiUrl: 'https://api.sandbox.proxypay.co.ao',
      token: 'test_token',
      entity: '99999',
      webhookSecret: secretKey,
    });
    const webhookEngine = new WebhookEngine(mockSupabase, adapter);

    const rawPayload = JSON.stringify({
      id: 'evt-coprod-1',
      reference_id: '999888777',
      amount: '10000.00',
      status: 'accepted',
      datetime: '2026-03-05T12:00:00Z',
    });

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(rawPayload);
    const validSignature = hmac.digest('hex');

    await webhookEngine.processProxyPayWebhook({
      headers: {
        'x-signature': validSignature,
      },
      rawBody: rawPayload,
      requestId: 'req-coprod-1',
    });

    // 3. Validate Double-Entry Ledger entries (INV-006)
    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const e of insertedLedgerEntries) {
      if (e.direction === 'DEBIT') totalDebits += BigInt(e.amount_minor);
      if (e.direction === 'CREDIT') totalCredits += BigInt(e.amount_minor);
    }

    // Total Debits (Clearing: 10,000.00) strictly equals Total Credits (10,000.00)
    expect(totalDebits).toBe(1000000n);
    expect(totalCredits).toBe(1000000n);
    expect(totalDebits).toBe(totalCredits);

    // Verify individual credit components:
    // Platform Fee 10% = 100,000
    // Co-producer 30% of 900,000 = 270,000
    // Primary Creator 70% of 900,000 = 630,000
    const partnerCredit = insertedLedgerEntries.find(
      (e) => e.account_id === `acc-${partnerId}` && e.direction === 'CREDIT'
    );
    expect(partnerCredit).toBeDefined();
    expect(BigInt(partnerCredit!.amount_minor)).toBe(270000n);

    const creatorCredit = insertedLedgerEntries.find(
      (e) => e.account_id === `acc-${creatorId}` && e.direction === 'CREDIT'
    );
    expect(creatorCredit).toBeDefined();
    expect(BigInt(creatorCredit!.amount_minor)).toBe(630000n);
  });
});
