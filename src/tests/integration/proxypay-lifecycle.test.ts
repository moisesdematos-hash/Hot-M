import { describe, it, expect, vi } from 'vitest';
import { PaymentService } from '@/modules/payments/payment-service';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('ProxyPay Lifecycle & IDOR Protection (Section 28 & 29)', () => {
  const adapter = new ProxyPayAdapter({
    apiUrl: 'https://api.sandbox.proxypay.co.ao',
    token: 'test_token',
    entity: '99999',
    webhookSecret: 'secret_hmac',
  });

  it('SECURITY: User cannot access payment details belonging to another buyer', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'ord-victim',
                    buyer_id: 'legit-buyer-uuid', // Victim buyer
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

    const paymentService = new PaymentService(mockSupabase, adapter);

    await expect(
      paymentService.getPaymentAttemptByOrderId({
        orderId: 'ord-victim',
        actorId: 'attacker-uuid', // Attacker
      })
    ).rejects.toThrow('ACCESS_DENIED: Não tem permissão para visualizar este pagamento');
  });

  it('INVARIANTS: Multicaixa instructions must contain valid 9-digit reference', async () => {
    const mockAttemptInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'attempt-valid-9digits',
            order_id: 'ord-test-9',
            provider: 'PROXYPAY',
            provider_reference: '987654321',
            payment_method: 'MULTICAIXA_REFERENCE',
            amount_minor: 1500000n, // 15,000.00 AOA
            currency: 'AOA',
            status: 'PENDING',
            instructions: {
              entity: '99999',
              reference: '987654321',
              amount: '15000.00',
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
                    id: 'ord-test-9',
                    buyer_id: 'buyer-legit',
                    status: 'PENDING_PAYMENT',
                    currency: 'AOA',
                    total_amount_minor: 1500000n,
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
                  order: vi.fn().mockResolvedValue({ data: [] }),
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
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
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

    const paymentService = new PaymentService(mockSupabase, adapter);

    const result = await paymentService.initiatePayment({
      orderId: 'ord-test-9',
      actorId: 'buyer-legit',
      requestId: 'req-test-9',
    });

    expect(result.instructions.reference).toHaveLength(9);
    expect(result.instructions.entity).toBe('99999');
    expect(result.status).toBe('PENDING');
  });
});
