import { SupabaseClient } from '@supabase/supabase-js';
import { PricingEngine } from '@/modules/pricing/pricing-engine';
import { AuditLogger } from '@/core/security/audit';
import { UserRole } from '@/core/security/rbac';
import { OrderStatus } from '@/core/fintech/state-machines';
import { CreateOrderInput } from './schemas';

export interface OrderRecord {
  id: string;
  buyer_id: string;
  currency: string;
  total_amount_minor: bigint;
  status: OrderStatus;
  affiliate_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  offer_id: string;
  price_id: string;
  unit_amount_minor: bigint;
  quantity: number;
}

export class OrderService {
  private client: SupabaseClient;
  private pricingEngine: PricingEngine;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.pricingEngine = new PricingEngine(client);
  }

  /**
   * Implements Section 27 (Phase 4):
   * 1. Authenticates buyer.
   * 2. Validates ephemeral quote (enforces expiry).
   * 3. Validates offer & product (must be PUBLISHED).
   * 4. Resolves and freezes affiliate (INV-013).
   * 5. Creates Order in PENDING_PAYMENT status with frozen total (INV-012).
   * 6. Creates OrderItems.
   * 7. Emits audit log.
   * 8. Returns Order UUID.
   */
  async createOrder(params: {
    buyerId: string;
    input: CreateOrderInput;
    requestId: string;
  }): Promise<{ order: OrderRecord; items: OrderItemRecord[] }> {
    const { buyerId, input, requestId } = params;

    // 1. Retrieve & validate quote (checks expiration and DB pricing)
    const quote = await this.pricingEngine.getValidQuote(input.quoteId);

    // 2. Validate main offer and published product status
    const { data: offerData, error: offerError } = await this.client
      .from('offers')
      .select('id, product_id, products(id, status)')
      .eq('id', quote.offerId)
      .maybeSingle();

    if (offerError || !offerData) {
      throw new Error('Oferta não encontrada');
    }

    const product = offerData.products as unknown as { id: string; status: string } | null;
    if (!product || product.status !== 'PUBLISHED') {
      throw new Error('PRODUTO_INDISPONIVEL: O produto não está publicado para venda');
    }

    // Retrieve main price record ID
    const { data: mainPriceRecord } = await this.client
      .from('prices')
      .select('id')
      .eq('offer_id', quote.offerId)
      .eq('currency', quote.currency)
      .single();

    if (!mainPriceRecord) {
      throw new Error('Preço da oferta principal não localizado');
    }

    // 3. Resolve and freeze affiliate attribution (INV-013)
    let affiliateId: string | null = null;
    if (input.affiliateCode) {
      const { data: linkRecord } = await this.client
        .from('affiliate_links')
        .select('affiliate_id, affiliate_programs(is_active)')
        .eq('code', input.affiliateCode)
        .maybeSingle();

      const program = linkRecord?.affiliate_programs as unknown as { is_active: boolean } | null;
      if (linkRecord && program?.is_active) {
        affiliateId = linkRecord.affiliate_id;
      }
    }

    // 4. Create Order with frozen amounts (INV-002, INV-012)
    const { data: orderRecord, error: orderError } = await this.client
      .from('orders')
      .insert({
        buyer_id: buyerId,
        currency: quote.currency,
        total_amount_minor: quote.totalAmountMinor,
        status: 'PENDING_PAYMENT',
        affiliate_id: affiliateId,
      })
      .select()
      .single();

    if (orderError || !orderRecord) {
      throw new Error(`Falha ao registrar pedido: ${orderError?.message || 'Erro'}`);
    }

    // 5. Create Order Items (Main Offer + Bumps)
    const itemsToInsert = [
      {
        order_id: orderRecord.id,
        product_id: offerData.product_id,
        offer_id: quote.offerId,
        price_id: mainPriceRecord.id,
        unit_amount_minor: quote.baseAmountMinor,
        quantity: 1,
      },
    ];

    if (quote.orderBumps && quote.orderBumps.length > 0) {
      for (const bump of quote.orderBumps) {
        const { data: bumpOffer } = await this.client
          .from('offers')
          .select('id, product_id')
          .eq('id', bump.offerId)
          .maybeSingle();

        const { data: bumpPrice } = await this.client
          .from('prices')
          .select('id')
          .eq('offer_id', bump.offerId)
          .eq('currency', quote.currency)
          .maybeSingle();

        if (bumpOffer) {
          itemsToInsert.push({
            order_id: orderRecord.id,
            product_id: bumpOffer.product_id,
            offer_id: bump.offerId,
            price_id: bumpPrice?.id || mainPriceRecord.id,
            unit_amount_minor: bump.amountMinor,
            quantity: 1,
          });
        }
      }
    }

    const { data: itemsRecords, error: itemsError } = await this.client
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError || !itemsRecords) {
      throw new Error(`Falha ao registrar itens do pedido: ${itemsError?.message || 'Erro'}`);
    }

    // 6. Record Audit Log
    try {
      const auditPayload = AuditLogger.createEntry({
        actorId: buyerId,
        actorRole: 'BUYER',
        action: 'order:create',
        entity: 'orders',
        entityId: orderRecord.id,
        beforeState: null,
        afterState: {
          orderId: orderRecord.id,
          totalAmount: quote.totalAmount,
          currency: quote.currency,
          affiliateId,
        },
        requestId,
      });

      await this.client.from('audit_logs').insert({
        actor_id: auditPayload.actorId,
        actor_role: auditPayload.actorRole,
        action: auditPayload.action,
        entity: auditPayload.entity,
        entity_id: auditPayload.entityId,
        before_state: auditPayload.beforeState,
        after_state: auditPayload.afterState,
        request_id: auditPayload.requestId,
      });
    } catch {
      // Non-blocking audit failure
    }

    return {
      order: {
        ...orderRecord,
        total_amount_minor: BigInt(orderRecord.total_amount_minor),
      },
      items: itemsRecords.map((i: Record<string, unknown>) => ({
        id: String(i.id),
        order_id: String(i.order_id),
        product_id: String(i.product_id),
        offer_id: String(i.offer_id),
        price_id: String(i.price_id),
        unit_amount_minor: BigInt(String(i.unit_amount_minor)),
        quantity: Number(i.quantity),
      })),
    };
  }

  async getOrderById(params: {
    orderId: string;
    actorId: string;
    roles: UserRole[];
  }): Promise<{ order: OrderRecord; items: OrderItemRecord[] } | null> {
    const { orderId, actorId, roles } = params;

    const { data: order, error } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) return null;

    // Check authorization: must be the buyer, or finance/admin
    const isOwner = order.buyer_id === actorId;
    const isElevated = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('FINANCE');

    if (!isOwner && !isElevated) {
      throw new Error('ACCESS_DENIED: Não tem permissão para visualizar este pedido');
    }

    const { data: items } = await this.client
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    return {
      order: {
        ...order,
        total_amount_minor: BigInt(order.total_amount_minor),
      },
      items: (items || []).map((i: Record<string, unknown>) => ({
        id: String(i.id),
        order_id: String(i.order_id),
        product_id: String(i.product_id),
        offer_id: String(i.offer_id),
        price_id: String(i.price_id),
        unit_amount_minor: BigInt(String(i.unit_amount_minor)),
        quantity: Number(i.quantity),
      })),
    };
  }

  async listBuyerOrders(buyerId: string): Promise<OrderRecord[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((o: Record<string, unknown>) => ({
      ...o,
      total_amount_minor: BigInt(String(o.total_amount_minor)),
    })) as OrderRecord[];
  }
}
