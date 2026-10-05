import { SupabaseClient } from '@supabase/supabase-js';
import { RBACManager, UserRole } from '@/core/security/rbac';
import { AuditLogger } from '@/core/security/audit';
import {
  CreateProductInput,
  UpdateProductInput,
  generateProductSlug,
} from './schemas';
import { ProductStateMachine, ProductStatus } from './state-machine';

export interface ProductRecord {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  description: string | null;
  product_type: string;
  status: ProductStatus;
  cover_image_url: string | null;
  asset_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export class ProductService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async createProduct(params: {
    creatorId: string;
    roles: UserRole[];
    input: CreateProductInput;
    requestId: string;
  }): Promise<ProductRecord> {
    const { creatorId, roles, input, requestId } = params;

    // RBAC: Enforce creator permissions
    RBACManager.assertPermission(roles, 'product:create');

    const slug = generateProductSlug(input.title);

    const { data, error } = await this.client
      .from('products')
      .insert({
        creator_id: creatorId,
        title: input.title,
        slug,
        description: input.description ?? null,
        product_type: input.productType,
        status: 'DRAFT', // Always starts as DRAFT (Section 25)
        cover_image_url: input.coverImageUrl || null,
        asset_file_url: input.assetFileUrl || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Falha ao criar produto: ${error?.message || 'Erro desconhecido'}`);
    }

    // Audit log
    await this.logAudit({
      actorId: creatorId,
      actorRole: roles[0] ?? 'CREATOR',
      action: 'product:create',
      entity: 'products',
      entityId: data.id,
      beforeState: null,
      afterState: data,
      requestId,
    });

    return data as ProductRecord;
  }

  async updateProduct(params: {
    creatorId: string;
    roles: UserRole[];
    productId: string;
    input: UpdateProductInput;
    requestId: string;
  }): Promise<ProductRecord> {
    const { creatorId, roles, productId, input, requestId } = params;

    const existing = await this.getProductById(productId);
    if (!existing) {
      throw new Error('Produto não encontrado');
    }

    // Non-admins can only update their own products
    if (existing.creator_id !== creatorId && !roles.includes('ADMIN') && !roles.includes('SUPER_ADMIN')) {
      throw new Error('ACCESS_DENIED: Não tem permissão para alterar este produto');
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.coverImageUrl !== undefined) updatePayload.cover_image_url = input.coverImageUrl;
    if (input.assetFileUrl !== undefined) updatePayload.asset_file_url = input.assetFileUrl;

    const { data, error } = await this.client
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Falha ao atualizar produto: ${error?.message || 'Erro'}`);
    }

    await this.logAudit({
      actorId: creatorId,
      actorRole: roles[0] ?? 'CREATOR',
      action: 'product:update',
      entity: 'products',
      entityId: productId,
      beforeState: existing as unknown as Record<string, unknown>,
      afterState: data,
      requestId,
    });

    return data as ProductRecord;
  }

  async transitionStatus(params: {
    actorId: string;
    roles: UserRole[];
    productId: string;
    nextStatus: ProductStatus;
    reason?: string;
    requestId: string;
  }): Promise<ProductRecord> {
    const { actorId, roles, productId, nextStatus, reason, requestId } = params;

    const existing = await this.getProductById(productId);
    if (!existing) {
      throw new Error('Produto não encontrado');
    }

    // Verify valid state machine transition
    ProductStateMachine.transition(existing.status, nextStatus);

    // Permission enforcement:
    // Publishing requires 'product:publish'
    if (nextStatus === 'PUBLISHED') {
      RBACManager.assertPermission(roles, 'product:publish');
    }

    // Suspending requires 'product:suspend_any'
    if (nextStatus === 'SUSPENDED') {
      RBACManager.assertPermission(roles, 'product:suspend_any');
    }

    const { data, error } = await this.client
      .from('products')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Falha ao transitar status: ${error?.message || 'Erro'}`);
    }

    await this.logAudit({
      actorId,
      actorRole: roles[0] ?? 'USER',
      action: `product:transition:${nextStatus}`,
      entity: 'products',
      entityId: productId,
      beforeState: { status: existing.status },
      afterState: { status: nextStatus },
      reason,
      requestId,
    });

    return data as ProductRecord;
  }

  async getProductById(productId: string): Promise<ProductRecord | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (error || !data) return null;
    return data as ProductRecord;
  }

  async getProductBySlug(slug: string): Promise<ProductRecord | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return null;
    return data as ProductRecord;
  }

  async listCreatorProducts(creatorId: string): Promise<ProductRecord[]> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ProductRecord[];
  }

  async listPublishedProducts(): Promise<ProductRecord[]> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ProductRecord[];
  }

  private async logAudit(entry: {
    actorId: string;
    actorRole: string;
    action: string;
    entity: string;
    entityId: string;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
    reason?: string;
    requestId: string;
  }) {
    try {
      const payload = AuditLogger.createEntry({
        ...entry,
        beforeState: AuditLogger.sanitizeForLog(entry.beforeState),
        afterState: AuditLogger.sanitizeForLog(entry.afterState),
      });

      await this.client.from('audit_logs').insert({
        actor_id: payload.actorId,
        actor_role: payload.actorRole,
        action: payload.action,
        entity: payload.entity,
        entity_id: payload.entityId,
        before_state: payload.beforeState,
        after_state: payload.afterState,
        reason: payload.reason,
        request_id: payload.requestId,
      });
    } catch {
      // Non-blocking log emission fallback
    }
  }
}
