import { describe, it, expect } from 'vitest';
import { RBACManager } from '@/core/security/rbac';
import { AuthService, UserSessionData } from '@/modules/auth/auth-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Auth Security & Privilege Escalation Mitigation (INV-010, Section 24)', () => {
  const dummyClient = {} as SupabaseClient;
  const authService = new AuthService(dummyClient);

  it('ATTACK SCENARIO: Normal buyer attempts to invoke creator product publishing', () => {
    const buyerSession: UserSessionData = {
      id: 'buyer-attacker-01',
      email: 'attacker@evil.com',
      fullName: 'Attacker',
      roles: ['BUYER'],
      isGuest: false,
    };

    // Buyer has order:create, but product:publish must fail
    expect(RBACManager.hasPermission(buyerSession.roles, 'product:publish')).toBe(false);
    expect(() => RBACManager.assertPermission(buyerSession.roles, 'product:publish')).toThrow('ACCESS_DENIED');
  });

  it('ATTACK SCENARIO: Normal buyer attempts to invoke KYC approval', () => {
    const buyerSession: UserSessionData = {
      id: 'buyer-attacker-02',
      email: 'attacker@evil.com',
      fullName: 'Attacker',
      roles: ['BUYER'],
      isGuest: false,
    };

    expect(RBACManager.hasPermission(buyerSession.roles, 'kyc:approve')).toBe(false);
    expect(() => RBACManager.assertPermission(buyerSession.roles, 'kyc:approve')).toThrow('ACCESS_DENIED');
  });

  it('ATTACK SCENARIO: Creator attempts to view platform ledger or approve withdrawal', () => {
    const creatorSession: UserSessionData = {
      id: 'creator-01',
      email: 'creator@hot-m.ao',
      fullName: 'Legit Creator',
      roles: ['CREATOR'],
      isGuest: false,
    };

    expect(RBACManager.hasPermission(creatorSession.roles, 'finance:view_platform_ledger')).toBe(false);
    expect(RBACManager.hasPermission(creatorSession.roles, 'finance:approve_withdrawal')).toBe(false);
    expect(() => RBACManager.assertPermission(creatorSession.roles, 'finance:approve_withdrawal')).toThrow(
      'ACCESS_DENIED'
    );
  });

  it('ATTACK SCENARIO: Anonymous guest attempts to trigger checkout / order creation', () => {
    const guestUser: UserSessionData = {
      id: 'anon-visitor',
      email: '',
      fullName: 'Anon',
      roles: ['BUYER'],
      isGuest: true,
    };

    expect(() => authService.assertNotGuestForFinancialOperation(guestUser)).toThrow('SECURITY_VIOLATION');
  });

  it('ATTACK SCENARIO: Admin attempts to promote self to SuperAdmin without root authority', () => {
    expect(RBACManager.canAssignRole(['ADMIN'], 'SUPER_ADMIN')).toBe(false);
    expect(RBACManager.canAssignRole(['ADMIN'], 'ADMIN')).toBe(false);
    expect(RBACManager.canAssignRole(['SUPER_ADMIN'], 'ADMIN')).toBe(true);
  });
});
