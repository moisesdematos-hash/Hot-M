import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { FunnelService } from '@/modules/funnels/funnel-service';
import { PricingEngine } from '@/modules/pricing/pricing-engine';
import { OrderService } from '@/modules/orders/order-service';
import { WebhookEngine } from '@/modules/webhooks/webhook-engine';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Order Bumps & Funnel Optimization Lifecycle (Phase 15 - INV-007, INV-012)', () => {
  const creatorId = 'creator-funnel-uuid';
  const buyerId = 'buyer-funnel-uuid';
  const mainProductId = 'prod-main-uuid';
  const bumpProductId = 'prod-bump-uuid';
  const mainOfferId = 'offer-main-uuid';
  const bumpOfferId = 'offer-bump-uuid';
  const mainPriceId = 'price-main-uuid';
  const bumpPriceId = 'price-bump-uuid';
  const quoteId = 'quote-funnel-uuid';
  const orderId = 'order-funnel-uuid';

  it('orchestrates complete funnel flow: order bump configuration -> multi-item quote -> order creation -> webhook ledger split -> multi-entitlement grant', async () => {
    const grantedEntitlements: Array<{ buyer_id: string; product_id: string }> = [];
    const insertedLedgerEntries: Array<{ account_id: string; direction: string; amount_minor: bigint }> = [];
    const insertedOrderItems: Array<{ product_id: string; offer_id: string; unit_amount_minor: bigint }> = [];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: val,
                    creator_id: creatorId,
                    status: 'PUBLISHED',
                    title: val === mainProductId ? 'Curso Master' : 'Kit de Templates',
                  },
                  error: null,
                }),
              })),
            }),
          };
        }

        if (table === 'offers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: val,
                    product_id: val === mainOfferId ? mainProductId : bumpProductId,
                    products: { id: val === mainOfferId ? mainProductId : bumpProductId, status: 'PUBLISHED' },
                  },
                  error: null,
                }),
              })),
            }),
          };
        }

        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col1: string, val1: string) => ({
                eq: vi.fn().mockImplementation((_col2: string, _val2: string) => {
                  const offerId = val1;
                  const isMain = offerId === mainOfferId;
                  return {
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: isMain ? mainPriceId : bumpPriceId,
                          amount_minor: isMain ? 1000000n : 250000n, // 10,000.00 AOA main, 2,500.00 AOA bump
                          currency: 'AOA',
                          offer_id: offerId,
                          offers: { product_id: isMain ? mainProductId : bumpProductId },
                        },
                        error: null,
                      }),
                    }),
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: isMain ? mainPriceId : bumpPriceId,
                        amount_minor: isMain ? 1000000n : 250000n,
                        currency: 'AOA',
                        offer_id: offerId,
                        offers: { product_id: isMain ? mainProductId : bumpProductId },
                      },
                      error: null,
                    }),
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: isMain ? mainPriceId : bumpPriceId,
                        amount_minor: isMain ? 1000000n : 250000n,
                        currency: 'AOA',
                      },
                      error: null,
                    }),
                  };
                }),
              })),
            }),
          };
        }

        if (table === 'order_bumps') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'bump-123' }, error: null }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'bump-123',
                      product_id: mainProductId,
                      bump_product_id: bumpProductId,
                      bump_offer_id: bumpOfferId,
                      headline: 'Adicionar Kit de Templates',
                      description: 'Modelos prontos',
                      is_active: true,
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'pricing_quotes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: quoteId }, error: null }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: quoteId,
                    offer_id: mainOfferId,
                    currency: 'AOA',
                    base_amount_minor: 1000000n,
                    discount_amount_minor: 0n,
                    order_bumps_amount_minor: 250000n,
                    total_amount_minor: 1250000n,
                    order_bump_offer_ids: [bumpOfferId],
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: orderId,
                    buyer_id: buyerId,
                    currency: 'AOA',
                    total_amount_minor: 1250000n,
                    status: 'PENDING_PAYMENT',
                    affiliate_id: null,
                  },
                  error: null,
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: orderId,
                    buyer_id: buyerId,
                    currency: 'AOA',
                    total_amount_minor: 1250000n,
                    status: 'PENDING_PAYMENT',
                    affiliate_id: null,
                    order_items: [
                      { product_id: mainProductId, offer_id: mainOfferId },
                      { product_id: bumpProductId, offer_id: bumpOfferId },
                    ],
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

        if (table === 'order_items') {
          return {
            insert: vi.fn().mockImplementation((items: Array<{ product_id: string; offer_id: string; unit_amount_minor: bigint }>) => {
              insertedOrderItems.push(...items);
              return {
                select: vi.fn().mockResolvedValue({ data: items, error: null }),
              };
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
                      id: 'att-funnel-1',
                      order_id: orderId,
                      provider_reference: '111222333',
                      currency: 'AOA',
                      amount_minor: 1250000n,
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
                single: vi.fn().mockResolvedValue({ data: { id: 'tx-funnel-1' }, error: null }),
              }),
            }),
          };
        }

        if (table === 'ledger_entries') {
          return {
            insert: vi.fn().mockImplementation((entries: Array<{ account_id: string; direction: string; amount_minor: bigint }>) => {
              insertedLedgerEntries.push(...entries);
              return Promise.resolve({ error: null });
            }),
          };
        }

        if (table === 'entitlements') {
          return {
            upsert: vi.fn().mockImplementation((rec: { buyer_id: string; product_id: string }) => {
              grantedEntitlements.push(rec);
              return Promise.resolve({ error: null });
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

    // 1. Creator configures Order Bump for main product
    const funnelService = new FunnelService(mockSupabase);
    const bump = await funnelService.createOrderBump(mainProductId, creatorId, {
      bumpProductId,
      bumpOfferId,
      headline: 'Adicionar Kit de Templates',
    });
    expect(bump.id).toBe('bump-123');

    // 2. Buyer requests quote with Order Bump
    const pricingEngine = new PricingEngine(mockSupabase);
    const quote = await pricingEngine.calculateQuote({
      offerId: mainOfferId,
      currency: 'AOA',
      orderBumpOfferIds: [bumpOfferId],
    });

    expect(quote.baseAmountMinor).toBe(1000000n); // 10,000.00
    expect(quote.orderBumpsAmountMinor).toBe(250000n); // 2,500.00
    expect(quote.totalAmountMinor).toBe(1250000n); // 12,500.00 AOA

    // 3. Buyer creates order from quote
    const orderService = new OrderService(mockSupabase);
    const { order } = await orderService.createOrder({
      buyerId,
      input: { quoteId: quote.quoteId },
      requestId: 'req-funnel-1',
    });

    expect(order.total_amount_minor).toBe(1250000n);
    expect(insertedOrderItems).toHaveLength(2); // Main item + Bump item!
    expect(insertedOrderItems[0]?.product_id).toBe(mainProductId);
    expect(insertedOrderItems[1]?.product_id).toBe(bumpProductId);

    // 4. Webhook confirms payment via ProxyPay
    const secretKey = 'funnel_test_secret';
    const adapter = new ProxyPayAdapter({
      apiUrl: 'https://api.sandbox.proxypay.co.ao',
      token: 'test_token',
      entity: '99999',
      webhookSecret: secretKey,
    });
    const webhookEngine = new WebhookEngine(mockSupabase, adapter);

    const rawPayload = JSON.stringify({
      id: 'evt-funnel-pay-1',
      reference_id: '111222333',
      amount: '12500.00',
      status: 'accepted',
      datetime: '2026-03-05T12:00:00Z',
    });

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(rawPayload);
    const validSignature = hmac.digest('hex');

    const result = await webhookEngine.processProxyPayWebhook({
      headers: { 'x-signature': validSignature },
      rawBody: rawPayload,
      requestId: 'req-webhook-funnel',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('PAID');

    // 5. Verify ledger balance: debits == credits = 12,500.00 AOA (INV-006)
    let totalDebits = 0n;
    let totalCredits = 0n;
    for (const e of insertedLedgerEntries) {
      if (e.direction === 'DEBIT') totalDebits += BigInt(e.amount_minor);
      if (e.direction === 'CREDIT') totalCredits += BigInt(e.amount_minor);
    }
    expect(totalDebits).toBe(1250000n);
    expect(totalCredits).toBe(1250000n);

    // 6. Verify Buyer receives Entitlements for BOTH products (INV-007)
    expect(grantedEntitlements).toHaveLength(2);
    expect(grantedEntitlements.some((e) => e.product_id === mainProductId)).toBe(true);
    expect(grantedEntitlements.some((e) => e.product_id === bumpProductId)).toBe(true);
  });
});
