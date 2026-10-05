import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AffiliateService } from '@/modules/affiliates/affiliate-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const supabase = await createServerSupabaseClient();
    const affiliateService = new AffiliateService(supabase);

    const result = await affiliateService.resolveReferralCode(code);

    // Target redirect URL (product landing or checkout)
    const redirectUrl = result.productSlug
      ? `/products/${result.productSlug}?ref=${result.code}`
      : `/?ref=${result.code}`;

    const response = NextResponse.redirect(new URL(redirectUrl, _request.url));

    // Set HttpOnly Attribution Cookie (INV-013)
    const cookiePayload = JSON.stringify({
      code: result.code,
      affiliateId: result.affiliateId,
      productId: result.productId,
      timestamp: Date.now(),
    });

    response.cookies.set('hotm_aff', cookiePayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: result.cookieDurationDays * 24 * 60 * 60, // e.g. 30 days
    });

    return response;
  } catch {
    // If referral code is invalid or program disabled, fallback redirect to homepage
    return NextResponse.redirect(new URL('/', _request.url));
  }
}
