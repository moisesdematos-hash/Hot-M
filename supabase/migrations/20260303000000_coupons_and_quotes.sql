-- ==============================================================================
-- HOT-M PRICING ENGINE, COUPONS & EXPIRING QUOTES
-- Section 26 (Phase 3: Pricing Engine) & Invariant INV-001
-- ==============================================================================

-- 1. CUPONS DE DESCONTO
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value BIGINT NOT NULL CHECK (discount_value > 0), -- Se PERCENTAGE: 1 a 100. Se FIXED_AMOUNT: minor units.
    currency VARCHAR(3), -- Obrigatório se FIXED_AMOUNT
    max_uses INT,
    times_used INT NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COTAÇÕES EFÊMERAS (PRICING QUOTES)
CREATE TABLE IF NOT EXISTS public.pricing_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL,
    base_amount_minor BIGINT NOT NULL CHECK (base_amount_minor > 0),
    discount_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
    order_bumps_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (order_bumps_amount_minor >= 0),
    total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor > 0),
    order_bump_offer_ids UUID[] NOT NULL DEFAULT '{}',
    coupon_id UUID REFERENCES public.coupons(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_quotes ENABLE ROW LEVEL SECURITY;

-- Políticas de Cupons
CREATE POLICY "Public can view active coupons for validation"
    ON public.coupons FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Creators can manage coupons for own products"
    ON public.coupons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = coupons.product_id
            AND (products.creator_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );

-- Políticas de Cotações (Públicas para leitura durante a janela de validade da compra)
CREATE POLICY "Public can read quotes"
    ON public.pricing_quotes FOR SELECT
    USING (TRUE);
