import { describe, it, expect, vi } from 'vitest';
import { ProductService } from '@/modules/products/product-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Product Lifecycle & Security Authorization (Section 25)', () => {
  it('should block BUYER from creating a product (RBAC violation)', async () => {
    const mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const productService = new ProductService(mockSupabase);

    await expect(
      productService.createProduct({
        creatorId: 'buyer-user-01',
        roles: ['BUYER'], // Does not have 'product:create'
        input: {
          title: 'Tentativa de Produto',
          productType: 'DIGITAL_DOWNLOAD',
        },
        requestId: 'req-test-1',
      })
    ).rejects.toThrow("ACCESS_DENIED: Missing required permission 'product:create'");
  });

  it('should allow CREATOR to initialize product in DRAFT state', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'prod-uuid-1',
            creator_id: 'creator-user-01',
            title: 'E-book Oficial',
            slug: 'e-book-oficial-1234',
            product_type: 'DIGITAL_DOWNLOAD',
            status: 'DRAFT',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return { insert: mockInsert };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const productService = new ProductService(mockSupabase);

    const created = await productService.createProduct({
      creatorId: 'creator-user-01',
      roles: ['CREATOR'],
      input: {
        title: 'E-book Oficial',
        productType: 'DIGITAL_DOWNLOAD',
      },
      requestId: 'req-test-2',
    });

    expect(created.id).toBe('prod-uuid-1');
    expect(created.status).toBe('DRAFT');
  });

  it('should prevent non-admin from updating products belonging to another creator (IDOR protection)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'prod-target',
                    creator_id: 'victim-creator', // Owned by victim
                    title: 'Curso Original',
                    status: 'DRAFT',
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

    const productService = new ProductService(mockSupabase);

    await expect(
      productService.updateProduct({
        creatorId: 'attacker-creator', // Attacker
        roles: ['CREATOR'],
        productId: 'prod-target',
        input: { title: 'Hackeado' },
        requestId: 'req-test-idor',
      })
    ).rejects.toThrow('ACCESS_DENIED: Não tem permissão para alterar este produto');
  });
});
