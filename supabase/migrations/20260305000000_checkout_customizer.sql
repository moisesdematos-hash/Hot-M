-- ==============================================================================
-- HOT-M CHECKOUT CUSTOMIZER & CONVERSION OPTIMIZATION ENGINE
-- Section 75 (Phase 16: Checkout Customizer, Timers, Scarcity & Testimonials)
-- ==============================================================================

-- 1. CHECKOUT SETTINGS (CONFIGURAÇÃO VISUAL & GATILHOS)
CREATE TABLE IF NOT EXISTS public.checkout_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    show_countdown_timer BOOLEAN NOT NULL DEFAULT TRUE,
    countdown_minutes INT NOT NULL DEFAULT 15 CHECK (countdown_minutes > 0 AND countdown_minutes <= 120),
    timer_headline TEXT NOT NULL DEFAULT 'Oferta com tempo limitado! Garanta sua vaga com desconto:',
    show_security_badges BOOLEAN NOT NULL DEFAULT TRUE,
    guarantee_days INT NOT NULL DEFAULT 7 CHECK (guarantee_days >= 0 AND guarantee_days <= 90),
    show_social_proof BOOLEAN NOT NULL DEFAULT TRUE,
    primary_color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
    banner_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRODUCT TESTIMONIALS (DEPOIMENTOS & PROVA SOCIAL)
CREATE TABLE IF NOT EXISTS public.product_testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT,
    content TEXT NOT NULL,
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.checkout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_testimonials ENABLE ROW LEVEL SECURITY;

-- Políticas de Checkout Settings
CREATE POLICY "Public can view checkout settings"
    ON public.checkout_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Creators can manage checkout settings for their products"
    ON public.checkout_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = checkout_settings.product_id
            AND (products.creator_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );

-- Políticas de Testimonials
CREATE POLICY "Public can view testimonials"
    ON public.product_testimonials FOR SELECT
    USING (TRUE);

CREATE POLICY "Creators can manage testimonials for their products"
    ON public.product_testimonials FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_testimonials.product_id
            AND (products.creator_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );
