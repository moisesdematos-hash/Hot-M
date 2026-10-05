-- ==============================================================================
-- HOT-M ORDER BUMPS & POST-PURCHASE UPSELLS / FUNNEL ENGINE
-- Section 75 (Phase 15: Order Bumps & Funnel Optimization)
-- ==============================================================================

-- 1. ORDER BUMPS (OFERTAS ADICIONAIS NO CHECKOUT)
CREATE TABLE IF NOT EXISTS public.order_bumps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    bump_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    bump_offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. POST-PURCHASE UPSELLS (OFERTAS EXCLUSIVAS DE 1 CLIQUE PÓS-COMPRA)
CREATE TABLE IF NOT EXISTS public.post_purchase_upsells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    upsell_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    upsell_offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    discount_percentage INT NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_purchase_upsells ENABLE ROW LEVEL SECURITY;

-- Políticas de Order Bumps
CREATE POLICY "Public can view active order bumps"
    ON public.order_bumps FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Creators can manage order bumps for their products"
    ON public.order_bumps FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = order_bumps.product_id
            AND (products.creator_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );

-- Políticas de Post-Purchase Upsells
CREATE POLICY "Public can view active upsells"
    ON public.post_purchase_upsells FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Creators can manage upsells for their products"
    ON public.post_purchase_upsells FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = post_purchase_upsells.product_id
            AND (products.creator_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );
