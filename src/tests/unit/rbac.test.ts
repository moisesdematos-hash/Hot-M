import { describe, it, expect } from 'vitest';
import { RBACManager } from '@/core/security/rbac';

describe('RBAC & Principle of Least Privilege (Section 21)', () => {
  it('should allow BUYER to create orders but not update products or approve KYC', () => {
    expect(RBACManager.hasPermission(['BUYER'], 'order:create')).toBe(true);
    expect(RBACManager.hasPermission(['BUYER'], 'product:update_own')).toBe(false);
    expect(RBACManager.hasPermission(['BUYER'], 'kyc:approve')).toBe(false);
  });

  it('should allow CREATOR to manage own products and view own balance', () => {
    expect(RBACManager.hasPermission(['CREATOR'], 'product:create')).toBe(true);
    expect(RBACManager.hasPermission(['CREATOR'], 'product:update_own')).toBe(true);
    expect(RBACManager.hasPermission(['CREATOR'], 'finance:view_own_balance')).toBe(true);
    expect(RBACManager.hasPermission(['CREATOR'], 'admin:manage_roles')).toBe(false);
  });

  it('should throw error when assertPermission fails', () => {
    expect(() => RBACManager.assertPermission(['BUYER'], 'admin:manage_roles')).toThrow('ACCESS_DENIED');
  });

  it('should prevent non-super admins from assigning SUPER_ADMIN or ADMIN role (INV-010)', () => {
    expect(RBACManager.canAssignRole(['ADMIN'], 'SUPER_ADMIN')).toBe(false);
    expect(RBACManager.canAssignRole(['CREATOR'], 'ADMIN')).toBe(false);
    expect(RBACManager.canAssignRole(['SUPER_ADMIN'], 'ADMIN')).toBe(true);
  });
});
