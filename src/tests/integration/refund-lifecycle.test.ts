import { describe, it, expect, vi } from 'vitest';
import { RefundService } from '@/modules/refunds/refund-service';
import { EntitlementService } from '@/modules/entitlements/entitlement-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Refund & Entitlement Revocation Lifecycle Integration Test (Phase 11 - INV-007)', () => {
  const buyerId = 'buyer-lifecycle-uuid';
  const orderId = 'order-lifecycle-uuid';
  const productId = 'prod-ebook-uuid';
  const entitlementId = 'ent-lifecycle-uuid';

  it('revokes access immediately upon refund approval and blocks further downloads', async () => {
    let orderState = {
      id: orderId,
      buyer_id: buyerId,
      total_amount_minor: 500000n, // 5,000.00 AOA
      currency: 'AOA',
      status: 'PAID',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      affiliate_id: null,
      order_items: [{ product_id: productId, products: { creator_id: 'creator-uuid' } }],
    };

    let entitlementState = {
      id: entitlementId,
      buyer_id: buyerId,
      product_id: productId,
      order_id: orderId,
      is_active: true,
      granted_at: new Date().toISOString(),
      revoked_at: null as string | null,
      revoke_reason: null as string | null,
      products: {
        id: productId,
        title: 'Guia de Produtividade',
        product_type: 'DIGITAL_DOWNLOAD',
        asset_file_url: 'ebooks/guia.pdf',
      },
    };

    let refundRequestState = {
      id: 'req-uuid-1',
      order_id: orderId,
      buyer_id: buyerId,
      reason: 'Solicitação de cancelamento',
      status: 'REQUESTED',
    };

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, _val: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { ...orderState },
                  error: null,
                }),
              })),
            }),
            update: vi.fn().mockImplementation((updates: Partial<typeof orderState>) => {
              orderState = { ...orderState, ...updates };
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }

        if (table === 'refund_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, _val: string) => {
                if (col === 'order_id') {
                  return {
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  };
                }
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { ...refundRequestState },
                    error: null,
                  }),
                };
              }),
            }),
            insert: vi.fn().mockImplementation((data: typeof refundRequestState) => {
              refundRequestState = { ...refundRequestState, ...data };
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...refundRequestState },
                    error: null,
                  }),
                }),
              };
            }),
            update: vi.fn().mockImplementation((updates: Partial<typeof refundRequestState>) => {
              refundRequestState = { ...refundRequestState, ...updates };
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }

        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, _val: string) => {
                if (col === 'id') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { ...entitlementState },
                      error: null,
                    }),
                  };
                }
                if (col === 'buyer_id') {
                  return {
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: entitlementState.is_active ? entitlementState : null,
                          error: null,
                        }),
                      }),
                    }),
                  };
                }
                return {};
              }),
            }),
            update: vi.fn().mockImplementation((updates: Partial<typeof entitlementState>) => {
              entitlementState = { ...entitlementState, ...updates };
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }

        if (table === 'refunds') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'ref-1' }, error: null }),
              }),
            }),
          };
        }

        if (table === 'ledger_accounts') {
          const chain: Record<string, unknown> = {};
          chain.select = vi.fn().mockReturnValue(chain);
          chain.eq = vi.fn().mockReturnValue(chain);
          chain.is = vi.fn().mockReturnValue(chain);
          chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'acc-found' }, error: null });
          return chain;
        }

        if (table === 'ledger_transactions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'tx-rev-1' }, error: null }),
              }),
            }),
          };
        }

        if (table === 'ledger_entries') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }

        if (table === 'outbox_events' || table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }

        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://cdn.hot-m.internal/signed/guia.pdf' },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient;

    const entitlementService = new EntitlementService(mockSupabase);
    const refundService = new RefundService(mockSupabase);

    // 1. Initial State: Access is verified and download succeeds
    const initialAccess = await entitlementService.verifyAccess(buyerId, productId);
    expect(initialAccess).toBe(true);

    const initialDownload = await entitlementService.getSignedDownloadUrl(buyerId, entitlementId);
    expect(initialDownload.downloadUrl).toContain('signed');

    // 2. Buyer requests refund within warranty window
    await refundService.requestRefund(buyerId, orderId, 'Quero cancelar o produto');
    expect(orderState.status).toBe('REFUND_REQUESTED');

    // 3. Admin approves refund
    const approvalResult = await refundService.approveRefund(refundRequestState.id, 'admin-uuid');
    expect(approvalResult.status).toBe('COMPLETED');
    expect(orderState.status).toBe('REFUNDED');
    expect(entitlementState.is_active).toBe(false);

    // 4. Access verification now returns false
    const accessAfterRefund = await entitlementService.verifyAccess(buyerId, productId);
    expect(accessAfterRefund).toBe(false);

    // 5. Subsequent download attempts are strictly blocked (INV-007)
    await expect(
      entitlementService.getSignedDownloadUrl(buyerId, entitlementId)
    ).rejects.toThrow('ENTITLEMENT_REVOKED');
  });
});
