import { describe, it, expect } from 'vitest';
import { signUpSchema, signInSchema, passwordRecoverySchema } from '@/modules/auth/schemas';

describe('Auth Validation Schemas (Section 24)', () => {
  it('should accept valid signup data with strong password', () => {
    const valid = {
      email: 'creator@hot-m.ao',
      password: 'SecurePassword123!',
      fullName: 'António Agostinho',
      country: 'AO',
    };

    const res = signUpSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('should reject weak passwords lacking uppercase or numbers', () => {
    const weakNoUpper = {
      email: 'test@hot-m.ao',
      password: 'weakpassword123',
      fullName: 'Teste User',
      country: 'AO',
    };
    expect(signUpSchema.safeParse(weakNoUpper).success).toBe(false);

    const weakNoNumber = {
      email: 'test@hot-m.ao',
      password: 'WeakPasswordNoNumber',
      fullName: 'Teste User',
      country: 'AO',
    };
    expect(signUpSchema.safeParse(weakNoNumber).success).toBe(false);

    const tooShort = {
      email: 'test@hot-m.ao',
      password: 'Short1',
      fullName: 'Teste User',
      country: 'AO',
    };
    expect(signUpSchema.safeParse(tooShort).success).toBe(false);
  });

  it('should reject invalid email formats', () => {
    expect(signInSchema.safeParse({ email: 'notanemail', password: '123' }).success).toBe(false);
    expect(passwordRecoverySchema.safeParse({ email: 'invalid-email' }).success).toBe(false);
  });

  it('should reject too short full names', () => {
    const shortName = {
      email: 'valid@hot-m.ao',
      password: 'ValidPassword123',
      fullName: 'Al', // < 3 chars
      country: 'AO',
    };
    expect(signUpSchema.safeParse(shortName).success).toBe(false);
  });
});
