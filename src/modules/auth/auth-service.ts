import { SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '@/core/security/rbac';
import { SignUpInput, SignInInput, PasswordRecoveryInput, PasswordResetInput } from './schemas';

export interface UserSessionData {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  isGuest: boolean;
}

export class AuthService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async signUp(input: SignUpInput, redirectTo?: string) {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: input.fullName,
          country: input.country,
        },
      },
    });

    if (error) {
      throw new Error(`Falha no cadastro: ${error.message}`);
    }

    return data;
  }

  async signIn(input: SignInInput) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new Error(`Falha no login: ${error.message}`);
    }

    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(`Falha ao deslogar: ${error.message}`);
    }
  }

  async signInWithGoogle(redirectTo: string) {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw new Error(`Falha no login com Google: ${error.message}`);
    }

    return data;
  }

  async sendPasswordRecovery(input: PasswordRecoveryInput, redirectTo: string) {
    const { data, error } = await this.client.auth.resetPasswordForEmail(input.email, {
      redirectTo,
    });

    if (error) {
      throw new Error(`Falha ao solicitar recuperação de senha: ${error.message}`);
    }

    return data;
  }

  async resetPassword(input: PasswordResetInput) {
    const { data, error } = await this.client.auth.updateUser({
      password: input.password,
    });

    if (error) {
      throw new Error(`Falha ao redefinir senha: ${error.message}`);
    }

    return data;
  }

  async getCurrentSession(): Promise<UserSessionData | null> {
    const { data: { user }, error: authError } = await this.client.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Fetch user profile & roles
    const { data: profile } = await this.client
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const { data: roleRecords } = await this.client
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id);

    const roles: UserRole[] = roleRecords && roleRecords.length > 0
      ? (roleRecords.map((r: { role_id: string }) => r.role_id as UserRole))
      : ['BUYER'];

    return {
      id: user.id,
      email: user.email ?? '',
      fullName: profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? '',
      roles,
      isGuest: false,
    };
  }

  /**
   * Enforces Section 24: Guest mode is strictly allowed for navigation only.
   * Never for financial operations, checkout, withdrawals, or orders.
   */
  assertNotGuestForFinancialOperation(session: UserSessionData | null): UserSessionData {
    if (!session || session.isGuest) {
      throw new Error('SECURITY_VIOLATION: Operações financeiras exigem autenticação real. Guest mode proibido.');
    }
    return session;
  }

  /**
   * Enforces INV-010: Users can never elevate their own role.
   */
  assertNoSelfRoleEscalation(actorUserId: string, targetUserId: string, requestedRole: UserRole) {
    if (actorUserId === targetUserId && (requestedRole === 'ADMIN' || requestedRole === 'SUPER_ADMIN' || requestedRole === 'FINANCE')) {
      throw new Error('SECURITY_VIOLATION: Tentativa de elevação de privilégio proibida (INV-010).');
    }
  }
}
