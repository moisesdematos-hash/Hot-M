import { describe, it, expect, vi } from 'vitest';
import { EntitlementService } from '@/modules/entitlements/entitlement-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('EntitlementService Unit Tests (Phase 9 - INV-007)', () => {
  const buyerId = 'buyer-uuid-123';
  const otherBuyerId = 'hacker-uuid-999';
  const productId = 'prod-ebook-uuid';
  const entitlementId = 'ent-uuid-001';

  it('should return active entitlements formatted with product data', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: entitlementId,
                    buyer_id: buyerId,
                    product_id: productId,
                    order_id: 'ord-1',
                    is_active: true,
                    granted_at: '2026-10-05T10:00:00Z',
                    revoked_at: null,
                    revoke_reason: null,
                    products: {
                      id: productId,
                      title: 'Guia de Finanças',
                      slug: 'guia-financas',
                      description: 'Livro digital completo',
                      product_type: 'DIGITAL_DOWNLOAD',
                      cover_image_url: 'https://cdn.example.com/cover.png',
                      asset_file_url: 'products/guia.pdf',
                    },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);
    const entitlements = await service.getUserEntitlements(buyerId);

    expect(entitlements).toHaveLength(1);
    expect(entitlements[0]?.id).toBe(entitlementId);
    expect(entitlements[0]?.product.title).toBe('Guia de Finanças');
    expect(entitlements[0]?.product.productType).toBe('DIGITAL_DOWNLOAD');
  });

  it('should verify access correctly (INV-007)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: entitlementId, is_active: true },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);
    const hasAccess = await service.verifyAccess(buyerId, productId);
    expect(hasAccess).toBe(true);
  });

  it('should block download attempt with IDOR defense if caller is not the owner', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: entitlementId,
                buyer_id: buyerId, // Belongs to buyerId, NOT otherBuyerId
                is_active: true,
                products: {
                  id: productId,
                  title: 'Guia de Finanças',
                  product_type: 'DIGITAL_DOWNLOAD',
                  asset_file_url: 'products/guia.pdf',
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);

    await expect(
      service.getSignedDownloadUrl(otherBuyerId, entitlementId)
    ).rejects.toThrow('FORBIDDEN: Este acesso não pertence ao seu usuário');
  });

  it('should block download attempt if entitlement was revoked', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: entitlementId,
                buyer_id: buyerId,
                is_active: false, // Revoked
                products: {
                  id: productId,
                  title: 'Guia de Finanças',
                  product_type: 'DIGITAL_DOWNLOAD',
                  asset_file_url: 'products/guia.pdf',
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);

    await expect(
      service.getSignedDownloadUrl(buyerId, entitlementId)
    ).rejects.toThrow('ENTITLEMENT_REVOKED');
  });

  it('should block download attempt if product type is COURSE', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: entitlementId,
                buyer_id: buyerId,
                is_active: true,
                products: {
                  id: productId,
                  title: 'Curso Completo',
                  product_type: 'COURSE',
                  asset_file_url: 'courses/video.mp4',
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);

    await expect(
      service.getSignedDownloadUrl(buyerId, entitlementId)
    ).rejects.toThrow('INVALID_PRODUCT_TYPE');
  });

  it('should generate signed URL and create audit log for legitimate download', async () => {
    const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: entitlementId,
                    buyer_id: buyerId,
                    is_active: true,
                    products: {
                      id: productId,
                      title: 'Guia de Finanças',
                      product_type: 'DIGITAL_DOWNLOAD',
                      asset_file_url: 'ebooks/guia.pdf',
                    },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: mockInsertAudit,
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.supabase.co/signed/guia.pdf?token=xyz' },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient;

    const service = new EntitlementService(mockSupabase);
    const result = await service.getSignedDownloadUrl(buyerId, entitlementId, 900);

    expect(result.downloadUrl).toContain('signed');
    expect(result.expiresInSeconds).toBe(900);
    expect(result.fileName).toBe('guia.pdf');
    expect(mockInsertAudit).toHaveBeenCalled();
  });
});
