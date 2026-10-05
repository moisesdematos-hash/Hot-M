-- ==============================================================================
-- HOT-M MULTI-CURRENCY & EXCHANGE RATES ENGINE (FX)
-- Section 75 (Phase 17: FX Engine, Multi-Currency Display & Dynamic Pricing)
-- ==============================================================================

-- 1. EXCHANGE RATES (TAXAS DE CÂMBIO OFICIAIS)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
    source TEXT NOT NULL DEFAULT 'MANUAL',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_base_target_currency UNIQUE (base_currency, target_currency)
);

-- Habilitar RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Public can view exchange rates"
    ON public.exchange_rates FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage exchange rates"
    ON public.exchange_rates FOR ALL
    USING (public.current_user_is_admin_or_super());

-- Cargas Iniciais Canónicas de Câmbio (AOA como moeda âncora)
INSERT INTO public.exchange_rates (base_currency, target_currency, rate, source) VALUES
    ('AOA', 'AOA', 1.00000000, 'CANONICAL'),
    ('AOA', 'USD', 0.00108696, 'BNA_REFERENCE'), -- ~920 AOA = 1 USD
    ('AOA', 'EUR', 0.00100500, 'BNA_REFERENCE'), -- ~995 AOA = 1 EUR
    ('AOA', 'BRL', 0.00625000, 'BNA_REFERENCE'), -- ~160 AOA = 1 BRL
    ('USD', 'AOA', 920.00000000, 'BNA_REFERENCE'),
    ('USD', 'USD', 1.00000000, 'CANONICAL'),
    ('USD', 'EUR', 0.92462312, 'CROSS_RATE'),
    ('USD', 'BRL', 5.75000000, 'CROSS_RATE'),
    ('EUR', 'AOA', 995.00000000, 'BNA_REFERENCE'),
    ('EUR', 'EUR', 1.00000000, 'CANONICAL'),
    ('EUR', 'USD', 1.08152174, 'CROSS_RATE'),
    ('EUR', 'BRL', 6.21875000, 'CROSS_RATE'),
    ('BRL', 'AOA', 160.00000000, 'BNA_REFERENCE'),
    ('BRL', 'BRL', 1.00000000, 'CANONICAL'),
    ('BRL', 'USD', 0.17391304, 'CROSS_RATE'),
    ('BRL', 'EUR', 0.16080402, 'CROSS_RATE')
ON CONFLICT (base_currency, target_currency) DO UPDATE
    SET rate = EXCLUDED.rate, updated_at = NOW();
