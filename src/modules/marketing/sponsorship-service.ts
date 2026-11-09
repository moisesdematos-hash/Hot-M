import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from '@/modules/ledger/ledger-service';

export interface SponsorshipPlan {
  id: '3_DAYS' | '7_DAYS' | '15_DAYS' | '30_DAYS';
  name: string;
  days: number;
  priceMinor: bigint;
  priceFormatted: string;
  isPopular?: boolean;
  discountBadge?: string;
  description: string;
}

export const SPONSORSHIP_PLANS: Record<string, SponsorshipPlan> = {
  '3_DAYS': {
    id: '3_DAYS',
    name: 'Impulso Rápido',
    days: 3,
    priceMinor: 250000n,
    priceFormatted: '2.500 Kz',
    description: 'Destaque no topo do Hotplace durante 3 dias para testar campanhas.',
  },
  '7_DAYS': {
    id: '7_DAYS',
    name: 'Semana de Tração',
    days: 7,
    priceMinor: 500000n,
    priceFormatted: '5.000 Kz',
    isPopular: true,
    description: 'Mais escolhido por criadores. 7 dias completos no topo da vitrine com selo dourado.',
  },
  '15_DAYS': {
    id: '15_DAYS',
    name: 'Escala Quinzenal',
    days: 15,
    priceMinor: 900000n,
    priceFormatted: '9.000 Kz',
    discountBadge: '10% DESCONTO',
    description: 'Visibilidade contínua durante 15 dias com economia em relação ao plano semanal.',
  },
  '30_DAYS': {
    id: '30_DAYS',
    name: 'Mensal Dominante',
    days: 30,
    priceMinor: 1500000n,
    priceFormatted: '15.000 Kz',
    discountBadge: '25% DESCONTO',
    description: 'Máxima autoridade: seu produto fixado no topo do Hotplace pelo mês inteiro.',
  },
};

export interface ActiveSponsorshipInfo {
  id: string;
  productId: string;
  planType: string;
  planName: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  remainingDays: number;
  isActive: boolean;
}

export class SponsorshipService {
  private client: SupabaseClient;
  private ledgerService: LedgerService;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.ledgerService = new LedgerService(client);
  }

  /**
   * Asserts product ownership.
   */
  private async assertProductOwnership(productId: string, creatorId: string): Promise<{ id: string; title: string }> {
    const { data: product, error } = await this.client
      .from('products')
      .select('id, title, creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (error || !product) {
      throw new Error('Produto não encontrado');
    }

    if (product.creator_id !== creatorId) {
      throw new Error('ACESSO_NEGADO: Você não tem permissão para patrocinar este produto');
    }

    return { id: product.id, title: product.title };
  }

  /**
   * Checks if a product has an active sponsorship.
   */
  async getActiveSponsorship(productId: string): Promise<ActiveSponsorshipInfo | null> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('product_sponsorships')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const expiresDate = new Date(data.expires_at);
    const diffMs = expiresDate.getTime() - Date.now();
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const plan = SPONSORSHIP_PLANS[data.plan_type];

    return {
      id: data.id,
      productId: data.product_id,
      planType: data.plan_type,
      planName: plan?.name || data.plan_type,
      status: data.status,
      startsAt: data.starts_at,
      expiresAt: data.expires_at,
      remainingDays,
      isActive: true,
    };
  }

  /**
   * Returns a set of product IDs with active sponsorships.
   */
  async listActiveSponsoredProductIds(): Promise<Set<string>> {
    const now = new Date().toISOString();

    const { data } = await this.client
      .from('product_sponsorships')
      .select('product_id')
      .eq('status', 'ACTIVE')
      .gt('expires_at', now);

    return new Set((data || []).map((row) => row.product_id));
  }

  /**
   * Activates a sponsorship plan for a product using creator ledger balance.
   */
  async createSponsorship(params: {
    creatorId: string;
    productId: string;
    planType: string;
  }): Promise<ActiveSponsorshipInfo> {
    const { creatorId, productId, planType } = params;

    const plan = SPONSORSHIP_PLANS[planType];
    if (!plan) {
      throw new Error(`Plano inválido: ${planType}. Escolha entre 3_DAYS, 7_DAYS, 15_DAYS ou 30_DAYS.`);
    }

    // 1. Verify product ownership
    const product = await this.assertProductOwnership(productId, creatorId);

    // 2. Verify creator available balance
    const balance = await this.ledgerService.getUserBalanceSummary(creatorId, 'AOA');
    if (balance.availableAmountMinor < plan.priceMinor) {
      const neededMajor = (Number(plan.priceMinor) / 100).toLocaleString('pt-AO');
      const availableMajor = (Number(balance.availableAmountMinor) / 100).toLocaleString('pt-AO');
      throw new Error(
        `SALDO_INSUFICIENTE: Saldo disponível de ${availableMajor} Kz é insuficiente para ativar o plano ${plan.name} (${neededMajor} Kz).`
      );
    }

    // 3. Find or create Creator Balance Account
    const { data: creatorAcc } = await this.client
      .from('ledger_accounts')
      .select('id')
      .eq('owner_id', creatorId)
      .eq('account_type', 'CREATOR_BALANCE')
      .eq('currency', 'AOA')
      .maybeSingle();

    // Find Master Platform Revenue Account (owner_id IS NULL)
    let { data: platformAcc } = await this.client
      .from('ledger_accounts')
      .select('id')
      .is('owner_id', null)
      .eq('account_type', 'PLATFORM_REVENUE')
      .eq('currency', 'AOA')
      .maybeSingle();

    if (!platformAcc) {
      const { data: newPlatformAcc } = await this.client
        .from('ledger_accounts')
        .insert({
          owner_id: null,
          account_type: 'PLATFORM_REVENUE',
          currency: 'AOA',
        })
        .select('id')
        .single();
      platformAcc = newPlatformAcc;
    }

    // 4. Calculate expiration
    const existing = await this.getActiveSponsorship(productId);
    const startDate = existing ? new Date(existing.expiresAt) : new Date();
    const expiresDate = new Date(startDate.getTime() + plan.days * 24 * 60 * 60 * 1000);

    // 5. Insert sponsorship record
    const { data: sponsorship, error: sponsorErr } = await this.client
      .from('product_sponsorships')
      .insert({
        product_id: productId,
        creator_id: creatorId,
        plan_type: planType,
        amount_minor: plan.priceMinor.toString(),
        currency: 'AOA',
        status: 'ACTIVE',
        starts_at: startDate.toISOString(),
        expires_at: expiresDate.toISOString(),
        payment_source: 'LEDGER_BALANCE',
      })
      .select()
      .single();

    if (sponsorErr || !sponsorship) {
      throw new Error(`Falha ao registrar patrocínio: ${sponsorErr?.message}`);
    }

    // 6. Record Double-Entry Ledger Transaction (INV-005) if accounts exist
    if (creatorAcc && platformAcc) {
      const { data: tx } = await this.client
        .from('ledger_transactions')
        .insert({
          reference_id: sponsorship.id,
          transaction_type: 'SPONSORSHIP_FEE',
          description: `HOT-M Ads: Impulsionamento ${plan.name} para ${product.title}`,
          currency: 'AOA',
        })
        .select('id')
        .single();

      if (tx) {
        await this.client.from('ledger_entries').insert([
          {
            transaction_id: tx.id,
            account_id: creatorAcc.id,
            direction: 'DEBIT',
            amount_minor: plan.priceMinor.toString(),
          },
          {
            transaction_id: tx.id,
            account_id: platformAcc.id,
            direction: 'CREDIT',
            amount_minor: plan.priceMinor.toString(),
          },
        ]);
      }
    }

    const diffMs = expiresDate.getTime() - Date.now();
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      id: sponsorship.id,
      productId: sponsorship.product_id,
      planType: sponsorship.plan_type,
      planName: plan.name,
      status: sponsorship.status,
      startsAt: sponsorship.starts_at,
      expiresAt: sponsorship.expires_at,
      remainingDays,
      isActive: true,
    };
  }
}
