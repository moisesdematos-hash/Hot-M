import { describe, it, expect } from 'vitest';
import {
  validateAngolanIBAN,
  formatAngolanIBAN,
  sanitizeIBAN,
  ANGOLAN_BANKS,
} from '@/core/fintech/iban-ao';

describe('Angolan IBAN Validator & Formatter (AO06 / ISO 13616 / ISO 7064)', () => {
  // A valid calculated Angolan IBAN for BAI (0040):
  // BBAN: 0040 0000 1234 5678 9010 0
  // Check digits calculated: 69 -> AO69004000001234567890100
  const VALID_IBAN_BAI = 'AO69004000001234567890100';

  // Another valid calculated IBAN for BFA (0006):
  // BBAN: 0006 0001 9876 5432 1098 7 -> check: 79
  const VALID_IBAN_BFA = 'AO79000600019876543210987';

  it('correctly sanitizes spaces, dots, and hyphens', () => {
    expect(sanitizeIBAN(' AO69.0040.0000.1234.5678.9010.0 ')).toBe(VALID_IBAN_BAI);
    expect(sanitizeIBAN('ao69-0040-0000-1234-5678-9010-0')).toBe(VALID_IBAN_BAI);
    expect(sanitizeIBAN('ao69 0040 0000 1234 5678 9010 0')).toBe(VALID_IBAN_BAI);
  });

  it('formats clean IBAN in blocks of 4 separated by dots', () => {
    const formatted = formatAngolanIBAN(VALID_IBAN_BAI);
    expect(formatted).toBe('AO69.0040.0000.1234.5678.9010.0');
  });

  it('validates a correct BAI IBAN and identifies the bank name', () => {
    const result = validateAngolanIBAN(VALID_IBAN_BAI);
    expect(result.isValid).toBe(true);
    expect(result.bankCode).toBe('0040');
    expect(result.bankName).toContain('BAI');
    expect(result.ibanFormatted).toBe('AO69.0040.0000.1234.5678.9010.0');
    expect(result.errorMessage).toBeUndefined();
  });

  it('validates a correct BFA IBAN and identifies BFA bank', () => {
    const result = validateAngolanIBAN(VALID_IBAN_BFA);
    expect(result.isValid).toBe(true);
    expect(result.bankCode).toBe('0006');
    expect(result.bankName).toContain('BFA');
  });

  it('rejects empty or whitespace input', () => {
    const result = validateAngolanIBAN('   ');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/obrigatório/i);
  });

  it('rejects IBAN not starting with AO', () => {
    const result = validateAngolanIBAN('PT50004000001234567890100');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/deve iniciar com as letras "AO"/i);
  });

  it('rejects IBAN with incorrect length (< 25 or > 25)', () => {
    const shortResult = validateAngolanIBAN('AO690040000012345678');
    expect(shortResult.isValid).toBe(false);
    expect(shortResult.errorMessage).toMatch(/deve conter exatamente 25 caracteres/i);

    const longResult = validateAngolanIBAN('AO690040000012345678901009999');
    expect(longResult.isValid).toBe(false);
    expect(longResult.errorMessage).toMatch(/deve conter exatamente 25 caracteres/i);
  });

  it('rejects IBAN with non-numeric characters in the BBAN', () => {
    const result = validateAngolanIBAN('AO6900400000123456789010X');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/apenas números após o prefixo/i);
  });

  it('rejects IBAN with mathematically invalid MOD-97 check digits', () => {
    // Changing one digit makes MOD-97 fail
    const tampered = 'AO69004000001234567890101';
    const result = validateAngolanIBAN(tampered);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toMatch(/falha no cálculo bancário MOD-97/i);
  });

  it('exports comprehensive list of registered Angolan banks', () => {
    expect(ANGOLAN_BANKS['0040']).toContain('BAI');
    expect(ANGOLAN_BANKS['0006']).toContain('BFA');
    expect(ANGOLAN_BANKS['0051']).toContain('Atlântico');
    expect(ANGOLAN_BANKS['0043']).toContain('BPC');
    expect(ANGOLAN_BANKS['0058']).toContain('Standard Bank');
    expect(ANGOLAN_BANKS['0059']).toContain('Sol');
  });
});
