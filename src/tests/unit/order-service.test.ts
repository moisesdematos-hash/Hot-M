import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '@/modules/orders/order-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('OrderService Unit Tests (Section 27, INV-002, INV-012, INV-013)', () => {
  it('should successfully create order with frozen values from valid quote', async () => {
    const mockOrderInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ord-uuid-100',
            buyer_id: 'buyer-uuid-1',
            currency: 'AOA',
            total_amount_minor: 1000000n, // 10,000.00 AOA
            status: 'PENDING_PAYMENT',
            affiliate_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockItemsInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'item-uuid-1',
            order_id: 'ord-uuid-100',
            product_id: 'prod-uuid-1',
            offer_id: 'off-uuid-1',
            price_id: 'price-uuid-1',
            unit_amount_minor: 1000000n,
            quantity: 1,
          },
        ],
        error: null,
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pricing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'quote-valid-uuid',
                    offer_id: 'off-uuid-1',
                    currency: 'AOA',
                    base_amount_minor: 1000000n,
                    discount_amount_minor: 0n,
                    order_bumps_amount_minor: 0n,
                    total_amount_minor: 1000000n,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min left
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
                    id: 'off-uuid-1',
                    product_id: 'prod-uuid-1',
                    products: { id: 'prod-uuid-1', status: 'PUBLISHED' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'price-uuid-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          return { insert: mockOrderInsert };
        }
        if (table === 'order_items') {
          return { insert: mockItemsInsert };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const orderService = new OrderService(mockSupabase);

    const result = await orderService.createOrder({
      buyerId: 'buyer-uuid-1',
      input: { quoteId: 'quote-valid-uuid' },
      requestId: 'req-order-1',
    });

    expect(result.order.id).toBe('ord-uuid-100');
    expect(result.order.status).toBe('PENDING_PAYMENT'); // INV-002
    expect(result.order.currency).toBe('AOA');
    expect(result.order.total_amount_minor).toBe(1000000n); // INV-012: Frozen
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.unit_amount_minor).toBe(1000000n);
  });
});
