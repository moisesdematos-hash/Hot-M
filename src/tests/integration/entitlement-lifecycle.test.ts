import { describe, it, expect, vi } from 'vitest';
import { EntitlementService } from '@/modules/entitlements/entitlement-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Entitlement Lifecycle Integration Tests (Phase 9 - INV-007)', () => {
  const buyerId = 'buyer-uuid-canonical';
  const orderId = 'order-uuid-canonical';
  const productId = 'prod-software-uuid';
  const entitlementId = 'ent-software-uuid';

  it('should support full lifecycle: grant -> access -> download -> revoke -> block', async () => {
    let entitlementState = {
      id: entitlementId,
      buyer_id: buyerId,
      product_id: productId,
      order_id: orderId,
      is_active: true,
      granted_at: new Date().toISOString(),
      revoked_at: null as string | null,
      revoke_reason: null as string | null,
    };

    const auditTrail: Array<{ action: string; entity_id: string; reason?: string }> = [];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'entitlements') {
          return {
            upsert: vi.fn().mockImplementation((data: typeof entitlementState) => {
              entitlementState = { ...entitlementState, ...data, is_active: true };
              return Promise.resolve({ error: null });
            }),
            update: vi.fn().mockImplementation((data: Partial<typeof entitlementState>) => {
              entitlementState = { ...entitlementState, ...data };
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((col: string, _val: string) => {
                if (col === 'id') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        ...entitlementState,
                        products: {
                          id: productId,
                          title: 'Software Dev Kit',
                          product_type: 'DIGITAL_DOWNLOAD',
                          asset_file_url: 'downloads/sdk-v1.zip',
                        },
                      },
                      error: null,
                    }),
                  };
                }
                if (col === 'buyer_id') {
                  return {
                    eq: vi.fn().mockImplementation((c2: string, v2: string) => {
                      if (c2 === 'product_id' && v2 === productId) {
                        return {
                          eq: vi.fn().mockReturnValue({
                            maybeSingle: vi.fn().mockResolvedValue({
                              data: entitlementState.is_active ? entitlementState : null,
                              error: null,
                            }),
                          }),
                        };
                      }
                      if (c2 === 'is_active') {
                        return {
                          order: vi.fn().mockResolvedValue({
                            data: entitlementState.is_active
                              ? [
                                  {
                                    ...entitlementState,
                                    products: {
                                      id: productId,
                                      title: 'Software Dev Kit',
                                      slug: 'sdk',
                                      description: 'Kit de desenvolvimento',
                                      product_type: 'DIGITAL_DOWNLOAD',
                                      cover_image_url: null,
                                      asset_file_url: 'downloads/sdk-v1.zip',
                                    },
                                  },
                                ]
                              : [],
                            error: null,
                          }),
                        };
                      }
                      return {};
                    }),
                  };
                }
                return {};
              }),
            })),
          };
        }

        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockImplementation((entry: { action: string; entity_id: string; reason?: string }) => {
              auditTrail.push(entry);
              return Promise.resolve({ error: null });
            }),
          };
        }

        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://cdn.hot-m.internal/signed/sdk-v1.zip' },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);

    // 1. Grant Entitlement
    await service.grantEntitlement(buyerId, productId, orderId);
    expect(auditTrail.some((a) => a.action === 'ENTITLEMENT_GRANTED')).toBe(true);

    // 2. Verify Access
    const hasAccess = await service.verifyAccess(buyerId, productId);
    expect(hasAccess).toBe(true);

    // 3. User lists library
    const library = await service.getUserEntitlements(buyerId);
    expect(library).toHaveLength(1);
    expect(library[0]?.product.title).toBe('Software Dev Kit');

    // 4. Download file
    const download = await service.getSignedDownloadUrl(buyerId, entitlementId);
    expect(download.fileName).toBe('sdk-v1.zip');
    expect(download.downloadUrl).toContain('signed');
    expect(auditTrail.some((a) => a.action === 'DOWNLOAD_REQUESTED')).toBe(true);

    // 5. Revoke entitlement (e.g. buyer requested refund)
    await service.revokeEntitlement(entitlementId, 'Reembolso aprovado pela moderação', 'admin-uuid');
    expect(entitlementState.is_active).toBe(false);
    expect(auditTrail.some((a) => a.action === 'ENTITLEMENT_REVOKED')).toBe(true);

    // 6. Verify Access now returns false
    const accessAfterRevoke = await service.verifyAccess(buyerId, productId);
    expect(accessAfterRevoke).toBe(false);

    // 7. Download attempt after revocation must throw
    await expect(
      service.getSignedDownloadUrl(buyerId, entitlementId)
    ).rejects.toThrow('ENTITLEMENT_REVOKED');
  });
});
