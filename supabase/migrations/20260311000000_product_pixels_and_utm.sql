-- ==============================================================================
-- HOT-M MARKETING PIXELS & AD TRACKING ENGINE (Phase 21)
-- Meta (Facebook), TikTok, Google Ads & UTM Campaign Attribution
-- ==============================================================================

-- 1. Create product_pixels table
CREATE TABLE IF NOT EXISTS public.product_pixels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('FACEBOOK', 'TIKTOK', 'GOOGLE_ADS')),
    pixel_id TEXT NOT NULL,
    trigger_events TEXT[] NOT NULL DEFAULT '{"INITIATE_CHECKOUT", "PURCHASE"}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_provider_pixel UNIQUE (product_id, provider, pixel_id)
);

-- 2. Add UTM and Traffic Attribution columns to orders table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_source') THEN
        ALTER TABLE public.orders ADD COLUMN utm_source TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_medium') THEN
        ALTER TABLE public.orders ADD COLUMN utm_medium TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_campaign') THEN
        ALTER TABLE public.orders ADD COLUMN utm_campaign TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_content') THEN
        ALTER TABLE public.orders ADD COLUMN utm_content TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_term') THEN
        ALTER TABLE public.orders ADD COLUMN utm_term TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'src') THEN
        ALTER TABLE public.orders ADD COLUMN src TEXT;
    END IF;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_product_pixels_product 
    ON public.product_pixels (product_id, is_active);

CREATE INDEX IF NOT EXISTS idx_orders_utm_source 
    ON public.orders (utm_source) WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign 
    ON public.orders (utm_campaign) WHERE utm_campaign IS NOT NULL;

-- 4. Enable Row Level Security
ALTER TABLE public.product_pixels ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Public can view active product pixels" ON public.product_pixels;
CREATE POLICY "Public can view active product pixels"
    ON public.product_pixels FOR SELECT
    USING (is_active = TRUE OR public.current_user_is_admin_or_super() OR EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_pixels.product_id AND p.creator_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Creators can manage pixels for their products" ON public.product_pixels;
CREATE POLICY "Creators can manage pixels for their products"
    ON public.product_pixels FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_pixels.product_id AND p.creator_id = auth.uid()
    ) OR public.current_user_is_admin_or_super());
