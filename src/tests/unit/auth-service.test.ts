import { describe, it, expect, vi } from 'vitest';
import { AuthService, UserSessionData } from '@/modules/auth/auth-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('AuthService Core Logic (Section 24 & Security Invariants)', () => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  } as unknown as SupabaseClient;

  const authService = new AuthService(mockSupabase);

  it('should block guest sessions from executing financial operations (Section 24 Rule)', () => {
    const guestSession: UserSessionData = {
      id: 'guest-1',
      email: '',
      fullName: 'Visitante',
      roles: ['BUYER'],
      isGuest: true,
    };

    expect(() => authService.assertNotGuestForFinancialOperation(guestSession)).toThrow(
      'SECURITY_VIOLATION: Operações financeiras exigem autenticação real'
    );

    expect(() => authService.assertNotGuestForFinancialOperation(null)).toThrow(
      'SECURITY_VIOLATION: Operações financeiras exigem autenticação real'
    );
  });

  it('should allow authentic verified users to proceed with operations', () => {
    const authenticatedSession: UserSessionData = {
      id: 'user-real-123',
      email: 'buyer@hot-m.ao',
      fullName: 'Comprador Real',
      roles: ['BUYER'],
      isGuest: false,
    };

    const res = authService.assertNotGuestForFinancialOperation(authenticatedSession);
    expect(res.id).toBe('user-real-123');
  });

  it('should prevent self privilege escalation (INV-010)', () => {
    // User attempting to assign ADMIN to themselves
    expect(() =>
      authService.assertNoSelfRoleEscalation('user-1', 'user-1', 'ADMIN')
    ).toThrow('SECURITY_VIOLATION: Tentativa de elevação de privilégio proibida (INV-010)');

    expect(() =>
      authService.assertNoSelfRoleEscalation('user-1', 'user-1', 'SUPER_ADMIN')
    ).toThrow('SECURITY_VIOLATION: Tentativa de elevação de privilégio proibida (INV-010)');

    // Different users (e.g. admin managing another user) does not trigger self-escalation error
    expect(() =>
      authService.assertNoSelfRoleEscalation('admin-1', 'user-2', 'ADMIN')
    ).not.toThrow();
  });
});
