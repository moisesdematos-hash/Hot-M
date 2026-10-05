/**
 * HOT-M ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
 * Principle: Least Privilege (Section 21)
 */

export type UserRole =
  | 'BUYER'
  | 'CREATOR'
  | 'AFFILIATE'
  | 'SUPPORT'
  | 'COMPLIANCE'
  | 'FINANCE'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type Permission =
  | 'order:create'
  | 'order:read_own'
  | 'order:read_any'
  | 'product:create'
  | 'product:update_own'
  | 'product:publish'
  | 'product:suspend_any'
  | 'kyc:submit_own'
  | 'kyc:review'
  | 'kyc:approve'
  | 'finance:view_own_balance'
  | 'finance:request_withdrawal'
  | 'finance:approve_withdrawal'
  | 'finance:process_payout'
  | 'finance:view_platform_ledger'
  | 'finance:reconcile'
  | 'admin:manage_roles'
  | 'admin:view_audit_logs'
  | 'support:read_tickets'
  | 'support:reply_tickets';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  BUYER: [
    'order:create',
    'order:read_own',
  ],
  CREATOR: [
    'order:create',
    'order:read_own',
    'product:create',
    'product:update_own',
    'product:publish',
    'kyc:submit_own',
    'finance:view_own_balance',
    'finance:request_withdrawal',
  ],
  AFFILIATE: [
    'order:create',
    'order:read_own',
    'kyc:submit_own',
    'finance:view_own_balance',
    'finance:request_withdrawal',
  ],
  SUPPORT: [
    'order:read_any',
    'support:read_tickets',
    'support:reply_tickets',
  ],
  COMPLIANCE: [
    'kyc:review',
    'kyc:approve',
    'product:suspend_any',
    'admin:view_audit_logs',
  ],
  FINANCE: [
    'finance:view_platform_ledger',
    'finance:approve_withdrawal',
    'finance:process_payout',
    'finance:reconcile',
    'order:read_any',
    'admin:view_audit_logs',
  ],
  ADMIN: [
    'order:read_any',
    'product:suspend_any',
    'kyc:review',
    'kyc:approve',
    'finance:view_platform_ledger',
    'finance:approve_withdrawal',
    'finance:process_payout',
    'finance:reconcile',
    'support:read_tickets',
    'support:reply_tickets',
    'admin:view_audit_logs',
  ],
  SUPER_ADMIN: [
    'order:create',
    'order:read_own',
    'order:read_any',
    'product:create',
    'product:update_own',
    'product:publish',
    'product:suspend_any',
    'kyc:submit_own',
    'kyc:review',
    'kyc:approve',
    'finance:view_own_balance',
    'finance:request_withdrawal',
    'finance:approve_withdrawal',
    'finance:process_payout',
    'finance:view_platform_ledger',
    'finance:reconcile',
    'admin:manage_roles',
    'admin:view_audit_logs',
    'support:read_tickets',
    'support:reply_tickets',
  ],
};

export class RBACManager {
  static hasPermission(roles: UserRole[], permission: Permission): boolean {
    return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
  }

  static assertPermission(roles: UserRole[], permission: Permission): void {
    if (!this.hasPermission(roles, permission)) {
      throw new Error(`ACCESS_DENIED: Missing required permission '${permission}'`);
    }
  }

  static canAssignRole(operatorRoles: UserRole[], targetRole: UserRole): boolean {
    if (operatorRoles.includes('SUPER_ADMIN')) {
      return true;
    }
    // Only SUPER_ADMIN can assign SUPER_ADMIN or ADMIN
    if (targetRole === 'SUPER_ADMIN' || targetRole === 'ADMIN') {
      return false;
    }
    if (operatorRoles.includes('ADMIN')) {
      return true;
    }
    return false;
  }
}
