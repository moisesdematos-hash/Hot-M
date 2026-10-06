import { SupabaseClient } from '@supabase/supabase-js';
import { CurrencyCode } from '@/core/fintech/money';

export interface ProductPerformanceItem {
  productId: string;
  title: string;
  salesCount: number;
  revenueMinor: string;
}

export interface DailyRevenueItem {
  date: string;
  revenueMinor: string;
  orderCount: number;
}

export interface CreatorAnalyticsResult {
  currency: CurrencyCode;
  grossRevenueMinor: string;
  grossRevenueMajor: string;
  completedOrders: number;
  totalOrders: number;
  refundedOrders: number;
  refundRatePercent: number;
  averageOrderValueMajor: string;
  productPerformance: ProductPerformanceItem[];
  dailyRevenue: DailyRevenueItem[];
}

export interface PlatformGlobalMetrics {
  totalOrders: number;
  paidOrders: number;
  gmvByCurrency: Record<string, string>;
  totalUsers: number;
  creatorsCount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmountMinor: string;
  openTicketsCount: number;
  platformFeePercent: number;
}

export class AnalyticsService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Computes comprehensive performance analytics for a specific creator.
   */
  async getCreatorAnalytics(
    creatorId: string,
    currency: CurrencyCode = 'AOA',
    days = 30
  ): Promise<CreatorAnalyticsResult> {
    // 1. Fetch products owned by this creator
    const { data: products, error: prodErr } = await this.client
      .from('products')
      .select('id, title')
      .eq('creator_id', creatorId);

    if (prodErr) {
      throw new Error(`ANALYTICS_FAILED: ${prodErr.message}`);
    }

    const productIds = (products || []).map((p) => p.id);
    const productTitleMap = new Map<string, string>(
      (products || []).map((p) => [p.id, p.title])
    );

    if (productIds.length === 0) {
      return {
        currency,
        grossRevenueMinor: '0',
        grossRevenueMajor: '0.00',
        completedOrders: 0,
        totalOrders: 0,
        refundedOrders: 0,
        refundRatePercent: 0,
        averageOrderValueMajor: '0.00',
        productPerformance: [],
        dailyRevenue: [],
      };
    }

    // 2. Fetch order items for creator's products
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data: orderItems, error: itemsErr } = await this.client
      .from('order_items')
      .select('product_id, price_minor, orders!inner(id, status, currency, created_at)')
      .in('product_id', productIds)
      .eq('orders.currency', currency)
      .gte('orders.created_at', sinceDate.toISOString());

    if (itemsErr) {
      throw new Error(`ANALYTICS_FAILED: ${itemsErr.message}`);
    }

    // 3. Aggregate totals
    let grossMinor = 0n;
    let completedCount = 0;
    let refundedCount = 0;
    const orderSet = new Set<string>();

    const prodStats = new Map<string, { count: number; revenue: bigint }>();
    for (const pId of productIds) {
      prodStats.set(pId, { count: 0, revenue: 0n });
    }

    const dailyMap = new Map<string, { revenue: bigint; count: number }>();

    for (const item of orderItems || []) {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      if (!order) continue;

      orderSet.add(order.id);
      const isPaid = order.status === 'PAID';
      const isRefunded = order.status === 'REFUNDED';
      const itemPrice = BigInt(item.price_minor || 0);

      if (isPaid || isRefunded) {
        if (isPaid) {
          grossMinor += itemPrice;
          completedCount++;

          // Product breakdown
          const pStat = prodStats.get(item.product_id) || { count: 0, revenue: 0n };
          pStat.count++;
          pStat.revenue += itemPrice;
          prodStats.set(item.product_id, pStat);

          // Daily breakdown
          const dayKey = order.created_at.split('T')[0] || 'unknown';
          const dayStat = dailyMap.get(dayKey) || { revenue: 0n, count: 0 };
          dayStat.revenue += itemPrice;
          dayStat.count++;
          dailyMap.set(dayKey, dayStat);
        }

        if (isRefunded) {
          refundedCount++;
        }
      }
    }

    const totalOrdersCount = orderSet.size;
    const refundRate = totalOrdersCount > 0 ? (refundedCount / totalOrdersCount) * 100 : 0;
    const aovMinor = completedCount > 0 ? grossMinor / BigInt(completedCount) : 0n;

    // Format product performance
    const productPerformance: ProductPerformanceItem[] = Array.from(prodStats.entries())
      .map(([pId, stat]) => ({
        productId: pId,
        title: productTitleMap.get(pId) || 'Produto',
        salesCount: stat.count,
        revenueMinor: stat.revenue.toString(),
      }))
      .sort((a, b) => Number(BigInt(b.revenueMinor) - BigInt(a.revenueMinor)));

    // Format daily timeline
    const dailyRevenue: DailyRevenueItem[] = Array.from(dailyMap.entries())
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .map(([date, stat]) => ({
        date,
        revenueMinor: stat.revenue.toString(),
        orderCount: stat.count,
      }));

    return {
      currency,
      grossRevenueMinor: grossMinor.toString(),
      grossRevenueMajor: (Number(grossMinor) / 100).toFixed(2),
      completedOrders: completedCount,
      totalOrders: totalOrdersCount,
      refundedOrders: refundedCount,
      refundRatePercent: parseFloat(refundRate.toFixed(2)),
      averageOrderValueMajor: (Number(aovMinor) / 100).toFixed(2),
      productPerformance,
      dailyRevenue,
    };
  }

  /**
   * Computes platform-wide KPIs for Admin operations.
   */
  async getPlatformAdminMetrics(userId: string): Promise<PlatformGlobalMetrics> {
    // 1. RBAC check
    const { data: userProfile } = await this.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
      throw new Error('FORBIDDEN: Apenas administradores podem acessar métricas globais.');
    }

    // 2. Orders aggregation
    const { data: allOrders } = await this.client
      .from('orders')
      .select('status, total_amount_minor, currency');

    const totalOrders = (allOrders || []).length;
    let paidOrders = 0;
    const gmvByCurrency: Record<string, bigint> = { AOA: 0n, USD: 0n, EUR: 0n, BRL: 0n };

    for (const ord of allOrders || []) {
      if (ord.status === 'PAID') {
        paidOrders++;
        const curr = ord.currency || 'AOA';
        const amount = BigInt(ord.total_amount_minor || 0);
        gmvByCurrency[curr] = (gmvByCurrency[curr] || 0n) + amount;
      }
    }

    // 3. User counts
    const { count: totalUsers } = await this.client
      .from('user_profiles')
      .select('id', { count: 'exact', head: true });

    // Distinct creators
    const { data: creatorsData } = await this.client
      .from('products')
      .select('creator_id');
    const distinctCreators = new Set((creatorsData || []).map((p) => p.creator_id)).size;

    // 4. Pending withdrawals
    const { data: pendingWithdrawals } = await this.client
      .from('withdrawals')
      .select('amount_minor')
      .eq('status', 'PENDING');

    let pendingWithdrawalsTotal = 0n;
    for (const w of pendingWithdrawals || []) {
      pendingWithdrawalsTotal += BigInt(w.amount_minor || 0);
    }

    // 5. Open tickets
    const { count: openTickets } = await this.client
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER']);

    // 6. Platform fee from settings
    const { data: feeSetting } = await this.client
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fee_percent')
      .maybeSingle();

    const platformFee = feeSetting?.value ? Number(feeSetting.value) : 10;

    return {
      totalOrders,
      paidOrders,
      gmvByCurrency: {
        AOA: (Number(gmvByCurrency['AOA'] || 0n) / 100).toFixed(2),
        USD: (Number(gmvByCurrency['USD'] || 0n) / 100).toFixed(2),
        EUR: (Number(gmvByCurrency['EUR'] || 0n) / 100).toFixed(2),
        BRL: (Number(gmvByCurrency['BRL'] || 0n) / 100).toFixed(2),
      },
      totalUsers: totalUsers || 0,
      creatorsCount: distinctCreators,
      pendingWithdrawalsCount: (pendingWithdrawals || []).length,
      pendingWithdrawalsAmountMinor: pendingWithdrawalsTotal.toString(),
      openTicketsCount: openTickets || 0,
      platformFeePercent: platformFee,
    };
  }
}
