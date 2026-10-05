import { describe, it, expect, vi } from 'vitest';
import { PaymentService } from '@/modules/payments/payment-service';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('PaymentService Unit Tests (Section 28 & 29)', () => {
  const mockAdapter = new ProxyPayAdapter({
    apiUrl: 'https://api.sandbox.proxypay.co.ao',
    token: 'test_token',
    entity: '99999',
    webhookSecret: 'secret_123',
  });

  it('should successfully initiate payment attempt with frozen order values', async () => {
    const mockAttemptInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'attempt-uuid-001',
            order_id: 'ord-uuid-1',
            provider: 'PROXYPAY',
            provider_reference: '123456789',
            payment_method: 'MULTICAIXA_REFERENCE',
            amount_minor: 500000n, // 5,000.00 AOA
            currency: 'AOA',
            status: 'PENDING',
            instructions: {
              entity: '99999',
              reference: '123456789',
              amount: '5000.00',
              expiresAt: new Date(Date.now() + 1440 * 60 * 1000).toISOString(),
            },
            expires_at: new Date(Date.now() + 1440 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'ord-uuid-1',
                    buyer_id: 'buyer-user-uuid',
                    status: 'PENDING_PAYMENT',
                    currency: 'AOA',
                    total_amount_minor: 500000n,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [], // No existing attempt
                    error: null,
                  }),
                }),
              }),
            }),
            insert: mockAttemptInsert,
          };
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: 'buyer@test.ao', full_name: 'Comprador Teste' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const paymentService = new PaymentService(mockSupabase, mockAdapter);

    const result = await paymentService.initiatePayment({
      orderId: 'ord-uuid-1',
      actorId: 'buyer-user-uuid',
      requestId: 'req-pay-01',
    });

    expect(result.id).toBe('attempt-uuid-001');
    expect(result.provider).toBe('PROXYPAY');
    expect(result.payment_method).toBe('MULTICAIXA_REFERENCE');
    expect(result.amount_minor).toBe(500000n);
    expect(result.currency).toBe('AOA');
  });

  it('should reject payment initiation if order is already PAID (INV-002 violation)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'ord-paid-uuid',
                    buyer_id: 'buyer-user-uuid',
                    status: 'PAID', // Already paid!
                    currency: 'AOA',
                    total_amount_minor: 500000n,
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

    const paymentService = new PaymentService(mockSupabase, mockAdapter);

    await expect(
      paymentService.initiatePayment({
        orderId: 'ord-paid-uuid',
        actorId: 'buyer-user-uuid',
        requestId: 'req-pay-err',
      })
    ).rejects.toThrow('STATUS_INVALIDO: O pedido encontra-se no estado PAID e não aceita pagamento');
  });
});
