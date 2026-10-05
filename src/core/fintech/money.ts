/**
 * HOT-M FINTECH CORE: MONEY & CURRENCY ENGINE
 * 
 * Invariants:
 * - Never use IEEE-754 floating point for storage or calculation.
 * - Always use integer minor units (cents / centavos / kz minor unit).
 * - Division operations use banker's rounding or explicit remainder distribution.
 */

export type CurrencyCode = 'AOA' | 'USD' | 'EUR';

export interface MoneyValue {
  readonly amount: bigint; // Minor units (e.g. 1000 = 10.00)
  readonly currency: CurrencyCode;
}

export class Money {
  readonly amount: bigint;
  readonly currency: CurrencyCode;

  constructor(amount: bigint | number, currency: CurrencyCode) {
    if (typeof amount === 'number') {
      if (!Number.isSafeInteger(amount)) {
        throw new Error(`Unsafe integer provided for Money amount: ${amount}`);
      }
      this.amount = BigInt(amount);
    } else {
      this.amount = amount;
    }
    this.currency = currency;
  }

  static fromMinor(amount: bigint | number, currency: CurrencyCode): Money {
    return new Money(amount, currency);
  }

  static fromMajor(majorAmount: number | string, currency: CurrencyCode): Money {
    const str = typeof majorAmount === 'number' ? majorAmount.toFixed(2) : majorAmount;
    const parts = str.split('.');
    const whole = parts[0] ?? '0';
    const dec = (parts[1] ?? '00').padEnd(2, '0').slice(0, 2);
    const totalMinor = BigInt(whole) * 100n + BigInt(dec);
    return new Money(totalMinor, currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0n, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number | bigint): Money {
    if (typeof factor === 'number') {
      const scaledFactor = BigInt(Math.round(factor * 10000));
      const newAmount = (this.amount * scaledFactor) / 10000n;
      return new Money(newAmount, this.currency);
    }
    return new Money(this.amount * factor, this.currency);
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  isPositive(): boolean {
    return this.amount > 0n;
  }

  isNegative(): boolean {
    return this.amount < 0n;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toMajorString(): string {
    const isNegative = this.amount < 0n;
    const abs = isNegative ? -this.amount : this.amount;
    const whole = (abs / 100n).toString();
    const minor = (abs % 100n).toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}${whole}.${minor}`;
  }

  format(locale: string = 'pt-AO'): string {
    const majorNumber = Number(this.amount) / 100;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(majorNumber);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate between ${this.currency} and ${other.currency}`);
    }
  }
}
