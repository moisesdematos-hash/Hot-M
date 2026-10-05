import { describe, it, expect, vi } from 'vitest';
import { ReconciliationService } from '@/modules/ledger/reconciliation-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('ReconciliationService Integration Tests (Section 57)', () => {
  it('should detect PAID_GATEWAY_PENDING_ORDER anomaly', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'att-123',
                    order_id: 'ord-999',
                    provider_reference: '111222333',
                    orders: { id: 'ord-999', status: 'PENDING_PAYMENT' },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'ledger_transactions') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const reconciliation = new ReconciliationService(mockSupabase);
    const report = await reconciliation.runReconciliation();

    expect(report.status).toBe('ANOMALIES_DETECTED');
    expect(report.anomaliesCount).toBe(1);
    expect(report.anomalies[0]?.code).toBe('PAID_GATEWAY_PENDING_ORDER');
    expect(report.anomalies[0]?.severity).toBe('SEV-1');
    expect(report.anomalies[0]?.entityId).toBe('ord-999');
  });

  it('should detect PAID_ORDER_MISSING_LEDGER anomaly', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'ord-paid-no-ledger',
                    status: 'PAID',
                    order_items: [{ product_id: 'prod-1' }],
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'ledger_transactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'ent-1', is_active: true },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const reconciliation = new ReconciliationService(mockSupabase);
    const report = await reconciliation.runReconciliation();

    expect(report.status).toBe('ANOMALIES_DETECTED');
    const ledgerAnomaly = report.anomalies.find((a) => a.code === 'PAID_ORDER_MISSING_LEDGER');
    expect(ledgerAnomaly).toBeDefined();
    expect(ledgerAnomaly?.entityId).toBe('ord-paid-no-ledger');
  });

  it('should detect PAID_ORDER_MISSING_ENTITLEMENT anomaly', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'ord-paid-no-entitlement',
                    status: 'PAID',
                    order_items: [{ product_id: 'prod-course-1' }],
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'ledger_transactions') {
          return {
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'tx-ok' },
                  error: null,
                }),
              }),
            })),
          };
        }
        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const reconciliation = new ReconciliationService(mockSupabase);
    const report = await reconciliation.runReconciliation();

    expect(report.status).toBe('ANOMALIES_DETECTED');
    const entAnomaly = report.anomalies.find((a) => a.code === 'PAID_ORDER_MISSING_ENTITLEMENT');
    expect(entAnomaly).toBeDefined();
    expect(entAnomaly?.entityId).toBe('ord-paid-no-entitlement');
  });

  it('should detect LEDGER_IMBALANCE anomaly when debits != credits', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'ledger_transactions') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'tx-imbalanced',
                  reference_id: 'ref-999',
                  ledger_entries: [
                    { direction: 'DEBIT', amount_minor: 10000n },
                    { direction: 'CREDIT', amount_minor: 9000n }, // 1000 minor mismatch!
                  ],
                },
              ],
              error: null,
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const reconciliation = new ReconciliationService(mockSupabase);
    const report = await reconciliation.runReconciliation();

    expect(report.status).toBe('ANOMALIES_DETECTED');
    const balanceAnomaly = report.anomalies.find((a) => a.code === 'LEDGER_IMBALANCE');
    expect(balanceAnomaly).toBeDefined();
    expect(balanceAnomaly?.entityId).toBe('tx-imbalanced');
  });

  it('should return HEALTHY when all checks pass with zero anomalies', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'att-1',
                    order_id: 'ord-1',
                    provider_reference: '123456789',
                    orders: { id: 'ord-1', status: 'PAID' },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'ord-1',
                    status: 'PAID',
                    order_items: [{ product_id: 'prod-1' }],
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'ledger_transactions') {
          return {
            select: vi.fn().mockImplementation((col?: string) => {
              if (col === 'id') {
                return {
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: 'tx-1' },
                      error: null,
                    }),
                  }),
                };
              }
              return Promise.resolve({
                data: [
                  {
                    id: 'tx-1',
                    reference_id: 'ord-1',
                    ledger_entries: [
                      { direction: 'DEBIT', amount_minor: 10000n },
                      { direction: 'CREDIT', amount_minor: 10000n },
                    ],
                  },
                ],
                error: null,
              });
            }),
          };
        }
        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'ent-1', is_active: true },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const reconciliation = new ReconciliationService(mockSupabase);
    const report = await reconciliation.runReconciliation();

    expect(report.status).toBe('HEALTHY');
    expect(report.anomaliesCount).toBe(0);
    expect(report.anomalies).toHaveLength(0);
  });
});
