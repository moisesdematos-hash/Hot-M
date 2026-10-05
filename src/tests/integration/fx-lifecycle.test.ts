import { describe, it, expect, vi } from 'vitest';
import { CurrencyService, ExchangeRateItem } from '@/modules/fx/currency-service';
import type { CurrencyCode } from '@/core/fintech/money';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('FX Engine & Multi-Currency Lifecycle (Phase 17 - Cross-Border Payments)', () => {
  const adminId = 'admin-fx-e2e-uuid';
  const customerId = 'customer-fx-e2e-uuid';

  // In-memory store for rates and users
  const ratesStore = new Map<string, ExchangeRateItem>();
  // Seed with default reference rates
  ratesStore.set('USD_AOA', {
    baseCurrency: 'USD',
    targetCurrency: 'AOA',
    rate: 920.0,
    source: 'BNA_REFERENCE',
    updatedAt: new Date().toISOString(),
  });
  ratesStore.set('AOA_USD', {
    baseCurrency: 'AOA',
    targetCurrency: 'USD',
    rate: 0.00108696,
    source: 'BNA_REFERENCE',
    updatedAt: new Date().toISOString(),
  });
  ratesStore.set('EUR_AOA', {
    baseCurrency: 'EUR',
    targetCurrency: 'AOA',
    rate: 995.0,
    source: 'BNA_REFERENCE',
    updatedAt: new Date().toISOString(),
  });
  ratesStore.set('AOA_EUR', {
    baseCurrency: 'AOA',
    targetCurrency: 'EUR',
    rate: 0.001005,
    source: 'BNA_REFERENCE',
    updatedAt: new Date().toISOString(),
  });

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_col: string, val: string) => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  val === adminId
                    ? { id: adminId, role: 'ADMIN' }
                    : { id: customerId, role: 'BUYER' },
                error: null,
              }),
            })),
          }),
        };
      }

      if (table === 'exchange_rates') {
        return {
          select: vi.fn().mockImplementation((fields?: string) => {
            if (fields === 'rate') {
              return {
                eq: vi.fn().mockImplementation((_c1: string, base: string) => ({
                  eq: vi.fn().mockImplementation((_c2: string, target: string) => {
                    const key = `${base}_${target}`;
                    const found = ratesStore.get(key);
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: found ? { rate: found.rate } : null,
                        error: null,
                      }),
                    };
                  }),
                })),
              };
            }
            // getAllRates query
            return Promise.resolve({
              data: Array.from(ratesStore.values()).map((r) => ({
                base_currency: r.baseCurrency,
                target_currency: r.targetCurrency,
                rate: r.rate,
                source: r.source,
                updated_at: r.updatedAt,
              })),
              error: null,
            });
          }),
          upsert: vi.fn().mockImplementation((record: {
            base_currency: string;
            target_currency: string;
            rate: number;
            source: string;
            updated_at: string;
          }) => {
            const key = `${record.base_currency}_${record.target_currency}`;
            ratesStore.set(key, {
              baseCurrency: record.base_currency as CurrencyCode,
              targetCurrency: record.target_currency as CurrencyCode,
              rate: record.rate,
              source: record.source,
              updatedAt: record.updated_at,
            });
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  it('orchestrates end-to-end FX lifecycle: rate lookup -> price conversion -> malicious rate injection blocked -> admin official update -> live re-conversion', async () => {
    const fxService = new CurrencyService(mockSupabase);

    // 1. Buyer loads checkout for a 15,000.00 Kz (1,500,000 minor units) digital product
    const productPriceAoaMinor = 1_500_000n; // 15,000.00 Kz

    // 2. Buyer views equivalent in USD and EUR
    const usdConverted = await fxService.convert(productPriceAoaMinor, 'AOA', 'USD');
    const eurConverted = await fxService.convert(productPriceAoaMinor, 'AOA', 'EUR');

    // 15,000 * 0.00108696 = ~16.30 USD
    expect(usdConverted.currency).toBe('USD');
    expect(Number(usdConverted.toMajorString())).toBeCloseTo(16.3, 1);

    // 15,000 * 0.001005 = ~15.07 EUR
    expect(eurConverted.currency).toBe('EUR');
    expect(Number(eurConverted.toMajorString())).toBeCloseTo(15.08, 1);

    // 3. Buyer/Attacker attempts to set custom rate (e.g. 1 USD = 1 AOA) to exploit payment -> BLOCKED BY RBAC
    await expect(
      fxService.updateExchangeRate('USD', 'AOA', 1.0, customerId)
    ).rejects.toThrow('FORBIDDEN');

    // 4. Platform Admin officially updates exchange rate: USD -> AOA adjusted to 950.00
    const updateResult = await fxService.updateExchangeRate('USD', 'AOA', 950.0, adminId);
    expect(updateResult.success).toBe(true);
    expect(updateResult.rate).toBe(950.0);

    // 5. Verify direct rate in store
    const directRate = await fxService.getExchangeRate('USD', 'AOA');
    expect(directRate).toBe(950.0);

    // 6. Verify automatic reciprocal rate in store (1 / 950 = ~0.00105263)
    const reciprocalRate = await fxService.getExchangeRate('AOA', 'USD');
    expect(reciprocalRate).toBeCloseTo(0.00105263, 6);

    // 7. Re-convert product price with updated rate: 15,000 * (1/950) = ~15.79 USD
    const updatedUsd = await fxService.convert(productPriceAoaMinor, 'AOA', 'USD');
    expect(Number(updatedUsd.toMajorString())).toBeCloseTo(15.79, 1);
  });
});
