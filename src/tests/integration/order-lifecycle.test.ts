import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '@/modules/orders/order-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Order Lifecycle & Security Gates (Section 27 & Invariants)', () => {
  it('REJECT: Attempt to create order for an unpublished product (DRAFT) must fail', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pricing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'quote-draft-product',
                    offer_id: 'off-draft',
                    currency: 'AOA',
                    base_amount_minor: 500000n,
                    discount_amount_minor: 0n,
                    order_bumps_amount_minor: 0n,
                    total_amount_minor: 500000n,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'offers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'off-draft',
                    product_id: 'prod-draft',
                    products: { id: 'prod-draft', status: 'DRAFT' }, // Still in DRAFT!
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

    const orderService = new OrderService(mockSupabase);

    await expect(
      orderService.createOrder({
        buyerId: 'buyer-test-1',
        input: { quoteId: 'quote-draft-product' },
        requestId: 'req-err-1',
      })
    ).rejects.toThrow('PRODUTO_INDISPONIVEL: O produto não está publicado para venda');
  });

  it('SECURITY: User cannot access an order belonging to another buyer (IDOR barrier)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'ord-victim-1',
                    buyer_id: 'victim-user-uuid', // Victim's order
                    currency: 'AOA',
                    total_amount_minor: 1000000n,
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

    const orderService = new OrderService(mockSupabase);

    await expect(
      orderService.getOrderById({
        orderId: 'ord-victim-1',
        actorId: 'attacker-user-uuid', // Attacker
        roles: ['BUYER'],
      })
    ).rejects.toThrow('ACCESS_DENIED: Não tem permissão para visualizar este pedido');
  });
});
