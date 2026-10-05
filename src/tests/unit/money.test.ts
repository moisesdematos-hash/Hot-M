import { describe, it, expect } from 'vitest';
import { Money } from '@/core/fintech/money';

describe('FinTech Money Engine (Integer Minor Units)', () => {
  it('should initialize correctly from minor units', () => {
    const m = Money.fromMinor(1099, 'USD');
    expect(m.amount).toBe(1099n);
    expect(m.currency).toBe('USD');
    expect(m.toMajorString()).toBe('10.99');
  });

  it('should parse from major string avoiding floating-point imprecision', () => {
    const m = Money.fromMajor('19.99', 'AOA');
    expect(m.amount).toBe(1999n);
    expect(m.currency).toBe('AOA');
    expect(m.toMajorString()).toBe('19.99');
  });

  it('should add money amounts of same currency correctly', () => {
    const m1 = Money.fromMinor(1000, 'AOA');
    const m2 = Money.fromMinor(2500, 'AOA');
    const result = m1.add(m2);

    expect(result.amount).toBe(3500n);
    expect(result.currency).toBe('AOA');
  });

  it('should throw an error when adding different currencies', () => {
    const m1 = Money.fromMinor(1000, 'AOA');
    const m2 = Money.fromMinor(1000, 'USD');

    expect(() => m1.add(m2)).toThrow('Currency mismatch');
  });

  it('should subtract money amounts correctly', () => {
    const m1 = Money.fromMinor(5000, 'EUR');
    const m2 = Money.fromMinor(1500, 'EUR');
    const result = m1.subtract(m2);

    expect(result.amount).toBe(3500n);
  });

  it('should multiply factor safely without floating inaccuracy', () => {
    const base = Money.fromMinor(10000, 'USD'); // 100.00 USD
    const fee = base.multiply(0.1); // 10% fee

    expect(fee.amount).toBe(1000n); // 10.00 USD
    expect(fee.toMajorString()).toBe('10.00');
  });
});
