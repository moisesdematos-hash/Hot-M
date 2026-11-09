import { SupabaseClient } from '@supabase/supabase-js';
import { SavePixelInput, PixelProvider } from './schemas';

export interface ProductPixelRecord {
  id: string;
  productId: string;
  provider: PixelProvider;
  pixelId: string;
  triggerEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class PixelService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Asserts that the product belongs to the creator (or user is admin).
   */
  private async assertProductOwnership(productId: string, creatorId: string): Promise<void> {
    const { data: product, error } = await this.client
      .from('products')
      .select('id, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (error || !product) {
      throw new Error('Produto não encontrado');
    }

    if (product.creator_id !== creatorId) {
      throw new Error('ACESSO_NEGADO: Você não tem permissão para gerenciar os pixels deste produto');
    }
  }

  /**
   * Lists all pixels for a product.
   */
  async listProductPixels(productId: string, activeOnly = false): Promise<ProductPixelRecord[]> {
    let query = this.client
      .from('product_pixels')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Falha ao carregar pixels: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      provider: row.provider as PixelProvider,
      pixelId: row.pixel_id,
      triggerEvents: row.trigger_events || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Adds or updates a tracking pixel for a product.
   */
  async savePixel(
    creatorId: string,
    productId: string,
    input: SavePixelInput
  ): Promise<ProductPixelRecord> {
    await this.assertProductOwnership(productId, creatorId);

    const payload = {
      product_id: productId,
      provider: input.provider,
      pixel_id: input.pixelId,
      trigger_events: input.triggerEvents,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (input.id) {
      // Update existing
      result = await this.client
        .from('product_pixels')
        .update(payload)
        .eq('id', input.id)
        .eq('product_id', productId)
        .select()
        .single();
    } else {
      // Insert new or upsert based on (product_id, provider, pixel_id)
      result = await this.client
        .from('product_pixels')
        .upsert(payload, { onConflict: 'product_id,provider,pixel_id' })
        .select()
        .single();
    }

    if (result.error || !result.data) {
      throw new Error(`Falha ao salvar pixel: ${result.error?.message || 'Erro desconhecido'}`);
    }

    const row = result.data;
    return {
      id: row.id,
      productId: row.product_id,
      provider: row.provider as PixelProvider,
      pixelId: row.pixel_id,
      triggerEvents: row.trigger_events || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Deletes a pixel from a product.
   */
  async deletePixel(creatorId: string, productId: string, pixelId: string): Promise<boolean> {
    await this.assertProductOwnership(productId, creatorId);

    const { error } = await this.client
      .from('product_pixels')
      .delete()
      .eq('id', pixelId)
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Falha ao remover pixel: ${error.message}`);
    }

    return true;
  }
}
