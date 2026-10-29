-- ==============================================================================
-- PHASE 19: AFFILIATES, CO-PRODUCTION & EXTENDED RLS SECURITY POLICIES
-- ==============================================================================

-- 1. Enable RLS on remaining tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status 
    ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_reference 
    ON public.payment_attempts(provider_reference);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_code 
    ON public.affiliate_links(code);

CREATE INDEX IF NOT EXISTS idx_entitlements_buyer_product 
    ON public.entitlements(buyer_id, product_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account 
    ON public.ledger_entries(account_id, created_at DESC);

-- 3. RLS Policies

-- ROLES
CREATE POLICY "Public read for roles"
    ON public.roles FOR SELECT
    USING (true);

-- AFFILIATE PROGRAMS
CREATE POLICY "Active affiliate programs are viewable by all"
    ON public.affiliate_programs FOR SELECT
    USING (is_active = TRUE OR public.current_user_is_admin_or_super() OR EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = affiliate_programs.product_id AND p.creator_id = auth.uid()
    ));

CREATE POLICY "Product creators can manage affiliate programs"
    ON public.affiliate_programs FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = affiliate_programs.product_id AND p.creator_id = auth.uid()
    ) OR public.current_user_is_admin_or_super());

-- AFFILIATE LINKS
CREATE POLICY "Affiliates can view own links"
    ON public.affiliate_links FOR SELECT
    USING (auth.uid() = affiliate_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Affiliates can create own links"
    ON public.affiliate_links FOR INSERT
    WITH CHECK (auth.uid() = affiliate_id);

-- AFFILIATE ATTRIBUTIONS & COMMISSIONS
CREATE POLICY "Affiliates can view own attributions"
    ON public.affiliate_attributions FOR SELECT
    USING (auth.uid() = affiliate_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Affiliates can view own commissions"
    ON public.affiliate_commissions FOR SELECT
    USING (auth.uid() = affiliate_id OR public.current_user_is_admin_or_super());

-- PRODUCT PARTNERS & REVENUE SHARES
CREATE POLICY "Partners can view own partnerships"
    ON public.product_partners FOR SELECT
    USING (auth.uid() = partner_id OR public.current_user_is_admin_or_super() OR EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = product_partners.product_id AND p.creator_id = auth.uid()
    ));

CREATE POLICY "Creators can manage partners"
    ON public.product_partners FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = product_partners.product_id AND p.creator_id = auth.uid()
    ) OR public.current_user_is_admin_or_super());

CREATE POLICY "Partners and creators can view revenue shares"
    ON public.revenue_shares FOR SELECT
    USING (auth.uid() = partner_id OR public.current_user_is_admin_or_super() OR EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = revenue_shares.product_id AND p.creator_id = auth.uid()
    ));

CREATE POLICY "Creators can manage revenue shares"
    ON public.revenue_shares FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = revenue_shares.product_id AND p.creator_id = auth.uid()
    ) OR public.current_user_is_admin_or_super());
