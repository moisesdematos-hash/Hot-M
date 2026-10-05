import { describe, it, expect, vi } from 'vitest';
import { CurrencyService, SUPPORTED_CURRENCIES, FALLBACK_RATES } from '@/modules/fx/currency-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('CurrencyService Unit Tests (Phase 17 - FX Engine & Multi-Currency)', () => {
  const adminId = 'admin-fx-uuid';
  const buyerId = 'buyer-fx-uuid';

  it('returns all supported currencies with correct metadata', () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new CurrencyService(mockSupabase);

    const currencies = service.getSupportedCurrencies();
    expect(currencies).toEqual(SUPPORTED_CURRENCIES);
    expect(currencies.map((c) => c.code)).toEqual(['AOA', 'USD', 'EUR', 'BRL']);
  });

  it('returns 1.0 when converting to same currency', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new CurrencyService(mockSupabase);

    const rate = await service.getExchangeRate('USD', 'USD');
    expect(rate).toBe(1.0);
  });

  it('retrieves exchange rate from database when available', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'exchange_rates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { rate: 950.5 },
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

    const service = new CurrencyService(mockSupabase);
    const rate = await service.getExchangeRate('USD', 'AOA');
    expect(rate).toBe(950.5);
  });

  it('falls back to reference rates if database has no record', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'exchange_rates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
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

    const service = new CurrencyService(mockSupabase);
    const rate = await service.getExchangeRate('USD', 'AOA');
    expect(rate).toBe(FALLBACK_RATES['USD_AOA']);
    expect(rate).toBe(920.0);
  });

  it('throws for negative conversion amounts (INV-005)', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new CurrencyService(mockSupabase);

    await expect(service.convert(-100n, 'USD', 'AOA')).rejects.toThrow('INVALID_AMOUNT');
  });

  it('converts zero amount deterministically', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new CurrencyService(mockSupabase);

    const result = await service.convert(0n, 'USD', 'AOA');
    expect(result.amount).toBe(0n);
    expect(result.currency).toBe('AOA');
  });

  it('converts using integer minor-unit scaled arithmetic', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'exchange_rates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { rate: 920.0 },
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

    const service = new CurrencyService(mockSupabase);
    // 10.00 USD = 1000 minor units
    // Converted to AOA at 920.0 = 9200.00 AOA = 920000 minor units
    const converted = await service.convert(1000n, 'USD', 'AOA');
    expect(converted.currency).toBe('AOA');
    expect(converted.amount).toBe(920000n);
    expect(converted.toMajorString()).toBe('9200.00');
  });

  it('rejects rate update if rate is non-positive', async () => {
    const mockSupabase = {} as unknown as SupabaseClient;
    const service = new CurrencyService(mockSupabase);

    await expect(
      service.updateExchangeRate('USD', 'AOA', 0, adminId)
    ).rejects.toThrow('INVALID_RATE');

    await expect(
      service.updateExchangeRate('USD', 'AOA', -10, adminId)
    ).rejects.toThrow('INVALID_RATE');
  });

  it('rejects rate update from non-admin user (RBAC defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'BUYER' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CurrencyService(mockSupabase);

    await expect(
      service.updateExchangeRate('USD', 'AOA', 950.0, buyerId)
    ).rejects.toThrow('FORBIDDEN');
  });

  it('updates rate and reciprocal pair when executed by ADMIN', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'ADMIN' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'exchange_rates') {
          return {
            upsert: upsertSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CurrencyService(mockSupabase);
    const result = await service.updateExchangeRate('USD', 'AOA', 1000.0, adminId);

    expect(result.success).toBe(true);
    expect(result.rate).toBe(1000.0);
    // Must have upserted direct rate AND reciprocal rate (1/1000 = 0.001)
    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        base_currency: 'USD',
        target_currency: 'AOA',
        rate: 1000.0,
        source: 'ADMIN_MANUAL',
      }),
      { onConflict: 'base_currency,target_currency' }
    );
    expect(upsertSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        base_currency: 'AOA',
        target_currency: 'USD',
        rate: 0.001,
        source: 'RECIPROCAL_AUTO',
      }),
      { onConflict: 'base_currency,target_currency' }
    );
  });
});
