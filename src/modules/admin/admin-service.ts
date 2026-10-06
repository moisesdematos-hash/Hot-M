import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '@/core/security/rbac';

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface PlatformSettingItem {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export class AdminService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Helper: validates that the user is an ADMIN or SUPER_ADMIN.
   */
  private async assertAdmin(userId: string): Promise<UserRole> {
    const { data: profile } = await this.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      throw new Error('FORBIDDEN: Apenas administradores podem executar esta operação.');
    }

    return profile.role as UserRole;
  }

  /**
   * Helper: validates that the user is strictly SUPER_ADMIN (INV-010).
   */
  private async assertSuperAdmin(userId: string): Promise<void> {
    const role = await this.assertAdmin(userId);
    if (role !== 'SUPER_ADMIN') {
      throw new Error('FORBIDDEN: Apenas Super Administradores podem gerenciar papéis de utilizadores.');
    }
  }

  /**
   * Lists registered users for admin operations.
   */
  async listUsers(
    adminUserId: string,
    options: { search?: string; limit?: number } = {}
  ): Promise<AdminUserItem[]> {
    await this.assertAdmin(adminUserId);

    const limit = options.limit || 50;
    let query = this.client
      .from('user_profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.search) {
      query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      throw new Error(`ADMIN_USERS_FETCH_FAILED: ${error.message}`);
    }

    return (users || []).map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role as UserRole,
      createdAt: u.created_at,
    }));
  }

  /**
   * Updates user role with strict INV-010 authorization: only SUPER_ADMIN.
   */
  async updateUserRole(
    superAdminUserId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<boolean> {
    await this.assertSuperAdmin(superAdminUserId);

    // Update in user_profiles
    const { error: profileErr } = await this.client
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (profileErr) {
      throw new Error(`ROLE_UPDATE_FAILED: ${profileErr.message}`);
    }

    // Upsert into user_roles table
    await this.client
      .from('user_roles')
      .upsert({
        user_id: targetUserId,
        role: newRole,
      }, { onConflict: 'user_id,role' });

    return true;
  }

  /**
   * Retrieves all platform configuration settings.
   */
  async getPlatformSettings(adminUserId: string): Promise<PlatformSettingItem[]> {
    await this.assertAdmin(adminUserId);

    const { data: settings, error } = await this.client
      .from('platform_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      throw new Error(`SETTINGS_FETCH_FAILED: ${error.message}`);
    }

    return (settings || []).map((s) => ({
      key: s.key,
      value: s.value,
      description: s.description,
      updatedAt: s.updated_at,
    }));
  }

  /**
   * Updates or creates a platform setting.
   */
  async updatePlatformSetting(
    adminUserId: string,
    key: string,
    value: unknown,
    description?: string
  ): Promise<boolean> {
    await this.assertAdmin(adminUserId);

    const now = new Date().toISOString();
    const { error } = await this.client
      .from('platform_settings')
      .upsert({
        key,
        value,
        description: description || null,
        updated_at: now,
      }, { onConflict: 'key' });

    if (error) {
      throw new Error(`SETTING_UPDATE_FAILED: ${error.message}`);
    }

    return true;
  }
}
