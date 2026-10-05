import { SupabaseClient } from '@supabase/supabase-js';
import { Money, CurrencyCode } from '@/core/fintech/money';

export interface ExchangeRateItem {
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number;
  source: string;
  updatedAt: string;
}

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'AOA', name: 'Kwanza Angolano', symbol: 'Kz', decimals: 2 },
  { code: 'USD', name: 'Dólar Americano', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', decimals: 2 },
];

export const FALLBACK_RATES: Record<string, number> = {
  'AOA_AOA': 1.0,
  'AOA_USD': 0.00108696,
  'AOA_EUR': 0.00100500,
  'AOA_BRL': 0.00625000,
  'USD_AOA': 920.0,
  'USD_USD': 1.0,
  'USD_EUR': 0.92462312,
  'USD_BRL': 5.75,
  'EUR_AOA': 995.0,
  'EUR_EUR': 1.0,
  'EUR_USD': 1.08152174,
  'EUR_BRL': 6.21875,
  'BRL_AOA': 160.0,
  'BRL_BRL': 1.0,
  'BRL_USD': 0.17391304,
  'BRL_EUR': 0.16080402,
};

export class CurrencyService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Returns metadata for all supported currencies.
   */
  getSupportedCurrencies(): CurrencyMeta[] {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Retrieves exchange rate between two currencies.
   */
  async getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    if (from === to) return 1.0;

    const { data: record, error } = await this.client
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', from)
      .eq('target_currency', to)
      .maybeSingle();

    if (!error && record && record.rate) {
      return Number(record.rate);
    }

    // Fallback to reference dictionary
    const key = `${from}_${to}`;
    if (FALLBACK_RATES[key] !== undefined) {
      return FALLBACK_RATES[key]!;
    }

    throw new Error(`EXCHANGE_RATE_NOT_FOUND: Taxa de câmbio não encontrada para ${from} -> ${to}`);
  }

  /**
   * Retrieves all exchange rates active in the system.
   */
  async getAllRates(): Promise<ExchangeRateItem[]> {
    const { data: records, error } = await this.client
      .from('exchange_rates')
      .select('base_currency, target_currency, rate, source, updated_at');

    if (!error && records && records.length > 0) {
      return records.map((r) => ({
        baseCurrency: r.base_currency as CurrencyCode,
        targetCurrency: r.target_currency as CurrencyCode,
        rate: Number(r.rate),
        source: r.source,
        updatedAt: r.updated_at,
      }));
    }

    // Default fallback array
    const now = new Date().toISOString();
    return Object.entries(FALLBACK_RATES).map(([key, rate]) => {
      const [base, target] = key.split('_') as [CurrencyCode, CurrencyCode];
      return {
        baseCurrency: base,
        targetCurrency: target,
        rate,
        source: 'BNA_REFERENCE',
        updatedAt: now,
      };
    });
  }

  /**
   * Performs high-precision integer minor-unit conversion.
   * Guarantees Invariants INV-005 & INV-006 by using integer arithmetic.
   */
  async convert(amountMinor: bigint, from: CurrencyCode, to: CurrencyCode): Promise<Money> {
    if (amountMinor < 0n) {
      throw new Error('INVALID_AMOUNT: Valor para conversão não pode ser negativo.');
    }

    if (from === to || amountMinor === 0n) {
      return Money.fromMinor(amountMinor, to);
    }

    const rate = await this.getExchangeRate(from, to);

    // Scale rate by 10^8 to ensure integer precision
    const SCALE = 100_000_000n;
    const rateScaled = BigInt(Math.round(rate * 100_000_000));

    // Converted minor = (amountMinor * rateScaled) / SCALE
    const convertedMinor = (amountMinor * rateScaled) / SCALE;

    return Money.fromMinor(convertedMinor, to);
  }

  /**
   * Updates an exchange rate pair.
   * Defesa RBAC: Only ADMIN or SUPER_ADMIN can update official exchange rates.
   */
  async updateExchangeRate(
    from: CurrencyCode,
    to: CurrencyCode,
    rate: number,
    userId: string
  ): Promise<{ success: boolean; rate: number }> {
    if (rate <= 0) {
      throw new Error('INVALID_RATE: Taxa de câmbio deve ser estritamente positiva.');
    }

    // 1. Verify admin privilege
    const { data: userProfile } = await this.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
      throw new Error('FORBIDDEN: Apenas administradores podem atualizar taxas de câmbio oficiais.');
    }

    const now = new Date().toISOString();

    // 2. Upsert direct rate
    const { error: directErr } = await this.client.from('exchange_rates').upsert(
      {
        base_currency: from,
        target_currency: to,
        rate,
        source: 'ADMIN_MANUAL',
        updated_at: now,
      },
      { onConflict: 'base_currency,target_currency' }
    );

    if (directErr) {
      throw new Error(`FX_UPDATE_FAILED: ${directErr.message}`);
    }

    // 3. Upsert reciprocal rate
    const reciprocalRate = Number((1 / rate).toFixed(8));
    await this.client.from('exchange_rates').upsert(
      {
        base_currency: to,
        target_currency: from,
        rate: reciprocalRate,
        source: 'RECIPROCAL_AUTO',
        updated_at: now,
      },
      { onConflict: 'base_currency,target_currency' }
    );

    return { success: true, rate };
  }
}
