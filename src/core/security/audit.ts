/**
 * HOT-M AUDIT LOG CORE
 * Invariant: Every state-changing and financial action must generate an immutable audit log (Section 58)
 */

export interface AuditLogEntry {
  id?: string;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reason?: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export class AuditLogger {
  static createEntry(params: Omit<AuditLogEntry, 'timestamp'>): AuditLogEntry {
    return {
      ...params,
      timestamp: new Date().toISOString(),
    };
  }

  static sanitizeForLog(data: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data) return null;
    const sanitized: Record<string, unknown> = { ...data };
    const sensitiveKeys = ['password', 'secret', 'token', 'cvv', 'card_number', 'key', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
