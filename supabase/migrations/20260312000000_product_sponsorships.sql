-- ==============================================================================
-- HOT-M SPONSORED PRODUCTS & HOTPLACE ADS ENGINE (Phase 22)
-- Native internal ads and priority catalog placement for creators
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.product_sponsorships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- '3_DAYS', '7_DAYS', '15_DAYS', '30_DAYS'
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'AOA',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'CANCELLED'
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    payment_source VARCHAR(50) NOT NULL DEFAULT 'LEDGER_BALANCE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_product_sponsorships_active 
    ON public.product_sponsorships (product_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_product_sponsorships_creator 
    ON public.product_sponsorships (creator_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.product_sponsorships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view active sponsorships" ON public.product_sponsorships;
CREATE POLICY "Public can view active sponsorships"
    ON public.product_sponsorships FOR SELECT
    USING (status = 'ACTIVE' AND expires_at > NOW());

DROP POLICY IF EXISTS "Creators can view their own sponsorships" ON public.product_sponsorships;
CREATE POLICY "Creators can view their own sponsorships"
    ON public.product_sponsorships FOR SELECT
    USING (auth.uid() = creator_id OR public.current_user_is_admin_or_super());

DROP POLICY IF EXISTS "Creators can create sponsorships for their products" ON public.product_sponsorships;
CREATE POLICY "Creators can create sponsorships for their products"
    ON public.product_sponsorships FOR INSERT
    WITH CHECK (auth.uid() = creator_id OR public.current_user_is_admin_or_super());
