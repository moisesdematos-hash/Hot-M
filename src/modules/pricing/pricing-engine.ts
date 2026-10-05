import { SupabaseClient } from '@supabase/supabase-js';
import { Money, CurrencyCode } from '@/core/fintech/money';
import { QuoteRequestInput } from './schemas';

export interface PricingQuote {
  quoteId: string;
  offerId: string;
  currency: CurrencyCode;
  baseAmount: string; // Major string e.g. "100.00"
  discountAmount: string;
  orderBumpsAmount: string;
  totalAmount: string; // Major string
  baseAmountMinor: bigint;
  discountAmountMinor: bigint;
  orderBumpsAmountMinor: bigint;
  totalAmountMinor: bigint;
  productId?: string;
  appliedCoupon: {
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
  } | null;
  orderBumps: Array<{
    offerId: string;
    amount: string;
    amountMinor: bigint;
  }>;
  orderBumpOfferIds?: string[];
  expiresAt: string;
}

export class PricingEngine {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Generates a tamper-proof expiring pricing quote (INV-001).
   * All prices are fetched directly from the database and computed server-side.
   */
  async calculateQuote(input: QuoteRequestInput): Promise<PricingQuote> {
    const { offerId, currency, couponCode, orderBumpOfferIds } = input;

    // 1. Fetch Base Offer & Price
    const basePriceRecord = await this.getOfferPrice(offerId, currency);
    if (!basePriceRecord) {
      throw new Error(`Preço não configurado para a oferta na moeda ${currency}`);
    }

    const baseMoney = Money.fromMinor(basePriceRecord.amount_minor, currency);

    // 2. Coupon Validation & Calculation
    let discountMoney = Money.zero(currency);
    let appliedCouponData: PricingQuote['appliedCoupon'] = null;
    let couponId: string | null = null;

    if (couponCode) {
      const coupon = await this.validateAndFetchCoupon(couponCode, currency, basePriceRecord.product_id);
      if (coupon) {
        couponId = coupon.id;
        if (coupon.discount_type === 'PERCENTAGE') {
          const percent = Number(coupon.discount_value);
          if (percent > 100) {
            throw new Error('Desconto percentual inválido');
          }
          discountMoney = baseMoney.multiply(percent / 100);
        } else if (coupon.discount_type === 'FIXED_AMOUNT') {
          discountMoney = Money.fromMinor(coupon.discount_value, currency);
        }

        // Cap discount at base price
        if (discountMoney.amount > baseMoney.amount) {
          discountMoney = baseMoney;
        }

        appliedCouponData = {
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: Number(coupon.discount_value),
        };
      }
    }

    // 3. Order Bumps Calculation
    let orderBumpsMoney = Money.zero(currency);
    const orderBumpsDetails: PricingQuote['orderBumps'] = [];

    if (orderBumpOfferIds && orderBumpOfferIds.length > 0) {
      for (const bumpId of orderBumpOfferIds) {
        const bumpPriceRecord = await this.getOfferPrice(bumpId, currency);
        if (!bumpPriceRecord) {
          throw new Error(`Preço do Order Bump ${bumpId} não encontrado na moeda ${currency}`);
        }
        const bumpMoney = Money.fromMinor(bumpPriceRecord.amount_minor, currency);
        orderBumpsMoney = orderBumpsMoney.add(bumpMoney);

        orderBumpsDetails.push({
          offerId: bumpId,
          amount: bumpMoney.toMajorString(),
          amountMinor: bumpMoney.amount,
        });
      }
    }

    // 4. Final Total Calculation
    // Total = (Base - Discount) + OrderBumps
    const discountedBase = baseMoney.subtract(discountMoney);
    const finalTotal = discountedBase.add(orderBumpsMoney);

    if (finalTotal.amount <= 0n) {
      throw new Error('Total da cotação deve ser estritamente maior que zero');
    }

    // 5. Expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 6. Persist Ephemeral Quote to Database
    const { data: quoteRecord, error: quoteError } = await this.client
      .from('pricing_quotes')
      .insert({
        offer_id: offerId,
        currency,
        base_amount_minor: baseMoney.amount,
        discount_amount_minor: discountMoney.amount,
        order_bumps_amount_minor: orderBumpsMoney.amount,
        total_amount_minor: finalTotal.amount,
        order_bump_offer_ids: orderBumpOfferIds,
        coupon_id: couponId,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (quoteError || !quoteRecord) {
      throw new Error(`Falha ao registrar cotação: ${quoteError?.message || 'Erro'}`);
    }

    return {
      quoteId: quoteRecord.id,
      offerId,
      productId: basePriceRecord.product_id,
      currency,
      baseAmount: baseMoney.toMajorString(),
      discountAmount: discountMoney.toMajorString(),
      orderBumpsAmount: orderBumpsMoney.toMajorString(),
      totalAmount: finalTotal.toMajorString(),
      baseAmountMinor: baseMoney.amount,
      discountAmountMinor: discountMoney.amount,
      orderBumpsAmountMinor: orderBumpsMoney.amount,
      totalAmountMinor: finalTotal.amount,
      appliedCoupon: appliedCouponData,
      orderBumps: orderBumpsDetails,
      orderBumpOfferIds: orderBumpOfferIds || [],
      expiresAt,
    };
  }

  /**
   * Validates and retrieves an existing quote from the database, enforcing expiration.
   */
  async getValidQuote(quoteId: string): Promise<PricingQuote> {
    const { data: record, error } = await this.client
      .from('pricing_quotes')
      .select('*, coupons(code, discount_type, discount_value)')
      .eq('id', quoteId)
      .maybeSingle();

    if (error || !record) {
      throw new Error('Cotação não encontrada');
    }

    const now = new Date();
    const expiry = new Date(record.expires_at);

    if (now > expiry) {
      throw new Error('QUOTE_EXPIRED: A cotação expirou. Solicite uma nova cotação.');
    }

    const currency = record.currency as CurrencyCode;
    const baseMoney = Money.fromMinor(record.base_amount_minor, currency);
    const discountMoney = Money.fromMinor(record.discount_amount_minor, currency);
    const bumpsMoney = Money.fromMinor(record.order_bumps_amount_minor, currency);
    const totalMoney = Money.fromMinor(record.total_amount_minor, currency);

    const { data: offerData } = await this.client
      .from('offers')
      .select('product_id')
      .eq('id', record.offer_id)
      .maybeSingle();

    const orderBumpsDetails: PricingQuote['orderBumps'] = [];
    if (record.order_bump_offer_ids && record.order_bump_offer_ids.length > 0) {
      for (const bumpId of record.order_bump_offer_ids) {
        const bumpPriceRecord = await this.getOfferPrice(bumpId, currency);
        if (bumpPriceRecord) {
          const bumpMoney = Money.fromMinor(bumpPriceRecord.amount_minor, currency);
          orderBumpsDetails.push({
            offerId: bumpId,
            amount: bumpMoney.toMajorString(),
            amountMinor: bumpMoney.amount,
          });
        }
      }
    }

    return {
      quoteId: record.id,
      offerId: record.offer_id,
      productId: offerData?.product_id,
      currency,
      baseAmount: baseMoney.toMajorString(),
      discountAmount: discountMoney.toMajorString(),
      orderBumpsAmount: bumpsMoney.toMajorString(),
      totalAmount: totalMoney.toMajorString(),
      baseAmountMinor: baseMoney.amount,
      discountAmountMinor: discountMoney.amount,
      orderBumpsAmountMinor: bumpsMoney.amount,
      totalAmountMinor: totalMoney.amount,
      appliedCoupon: record.coupons
        ? {
            code: record.coupons.code,
            discountType: record.coupons.discount_type,
            discountValue: Number(record.coupons.discount_value),
          }
        : null,
      orderBumps: orderBumpsDetails,
      orderBumpOfferIds: record.order_bump_offer_ids || [],
      expiresAt: record.expires_at,
    };
  }

  private async getOfferPrice(offerId: string, currency: string) {
    const { data, error } = await this.client
      .from('prices')
      .select('amount_minor, offer_id, offers(product_id)')
      .eq('offer_id', offerId)
      .eq('currency', currency)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    const offerObj = data.offers as unknown as { product_id: string } | null;
    return {
      amount_minor: BigInt(data.amount_minor),
      product_id: offerObj?.product_id,
    };
  }

  private async validateAndFetchCoupon(code: string, currency: string, productId?: string) {
    const { data: coupon, error } = await this.client
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !coupon) {
      throw new Error(`Cupom '${code}' não encontrado ou inativo`);
    }

    // Expiry check
    if (coupon.valid_until && new Date() > new Date(coupon.valid_until)) {
      throw new Error(`Cupom '${code}' expirado`);
    }

    // Max uses check
    if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
      throw new Error(`Cupom '${code}' atingiu o limite máximo de utilização`);
    }

    // Currency check if FIXED_AMOUNT
    if (coupon.discount_type === 'FIXED_AMOUNT' && coupon.currency !== currency) {
      throw new Error(`Cupom '${code}' é válido apenas para a moeda ${coupon.currency}`);
    }

    // Product check if coupon is product-restricted
    if (coupon.product_id && productId && coupon.product_id !== productId) {
      throw new Error(`Cupom '${code}' não é aplicável a este produto`);
    }

    return coupon;
  }
}
