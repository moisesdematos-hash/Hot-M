import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { SponsorshipService, SPONSORSHIP_PLANS } from '@/modules/marketing/sponsorship-service';
import { LedgerService } from '@/modules/ledger/ledger-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sponsorshipService = new SponsorshipService(supabase);
    const activeSponsorship = await sponsorshipService.getActiveSponsorship(productId);

    const ledgerService = new LedgerService(supabase);
    const balance = await ledgerService.getUserBalanceSummary(session.id, 'AOA');

    const formattedPlans = Object.values(SPONSORSHIP_PLANS).map((p) => ({
      ...p,
      priceMinor: p.priceMinor.toString(),
    }));

    return NextResponse.json({
      success: true,
      activeSponsorship,
      plans: formattedPlans,
      creatorBalance: {
        availableAmount: balance.availableAmount,
        availableAmountMinor: balance.availableAmountMinor.toString(),
        currency: 'AOA',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao buscar dados de patrocínio';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const planType = body.planType;

    if (!planType || typeof planType !== 'string') {
      return NextResponse.json({ error: 'planType é obrigatório' }, { status: 400 });
    }

    const sponsorshipService = new SponsorshipService(supabase);
    const sponsorship = await sponsorshipService.createSponsorship({
      creatorId: session.id,
      productId,
      planType,
    });

    return NextResponse.json({ success: true, sponsorship }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao ativar impulsionamento';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
