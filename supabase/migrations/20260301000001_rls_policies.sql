-- ==============================================================================
-- HOT-M ROW LEVEL SECURITY (RLS) POLICIES
-- Section 22 & Invariant INV-010 / INV-014
-- ==============================================================================

-- Helper functions for Auth & RBAC
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_id = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_is_admin_or_super()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_id IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. ENABLE RLS ON ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id OR public.current_user_is_admin_or_super());

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. USER ROLES (INV-010: Never self-assign privileged role)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Only SuperAdmin can manage user roles"
    ON public.user_roles FOR ALL
    USING (public.current_user_has_role('SUPER_ADMIN'));

-- ------------------------------------------------------------------------------
-- 4. PRODUCTS, OFFERS & PRICES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view published products"
    ON public.products FOR SELECT
    USING (status = 'PUBLISHED' OR auth.uid() = creator_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Creators can insert own products"
    ON public.products FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own products"
    ON public.products FOR UPDATE
    USING (auth.uid() = creator_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Offers visible if product accessible"
    ON public.offers FOR SELECT
    USING (is_active = TRUE OR public.current_user_is_admin_or_super());

CREATE POLICY "Prices visible if offer accessible"
    ON public.prices FOR SELECT
    USING (is_active = TRUE OR public.current_user_is_admin_or_super());

-- ------------------------------------------------------------------------------
-- 5. ORDERS & PAYMENTS (INV-001, INV-003)
-- ------------------------------------------------------------------------------
CREATE POLICY "Buyers can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = buyer_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Order items viewable by order owner or admin"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.buyer_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );

CREATE POLICY "Payment attempts viewable by order buyer"
    ON public.payment_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = payment_attempts.order_id 
            AND (orders.buyer_id = auth.uid() OR public.current_user_is_admin_or_super())
        )
    );

-- Payment events are internal server-only, never visible to standard users
CREATE POLICY "Payment provider events only visible to Finance/Admin"
    ON public.payment_provider_events FOR SELECT
    USING (public.current_user_has_role('FINANCE') OR public.current_user_is_admin_or_super());

-- ------------------------------------------------------------------------------
-- 6. ENTITLEMENTS (INV-007)
-- ------------------------------------------------------------------------------
CREATE POLICY "Buyers can view own active entitlements"
    ON public.entitlements FOR SELECT
    USING (auth.uid() = buyer_id OR public.current_user_is_admin_or_super());

-- ------------------------------------------------------------------------------
-- 7. FINANCIAL LEDGER (INV-005: Ledger is immutable)
-- ------------------------------------------------------------------------------
CREATE POLICY "Owners can view own ledger accounts"
    ON public.ledger_accounts FOR SELECT
    USING (auth.uid() = owner_id OR public.current_user_has_role('FINANCE') OR public.current_user_is_admin_or_super());

CREATE POLICY "Ledger entries viewable by account owner or Finance"
    ON public.ledger_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ledger_accounts 
            WHERE ledger_accounts.id = ledger_entries.account_id 
            AND (ledger_accounts.owner_id = auth.uid() OR public.current_user_has_role('FINANCE') OR public.current_user_is_admin_or_super())
        )
    );

-- Ledger inserts/updates are restricted to backend service role (RLS default denies user insert/update/delete)

-- ------------------------------------------------------------------------------
-- 8. WITHDRAWALS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own withdrawal methods"
    ON public.withdrawal_methods FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawals"
    ON public.withdrawals FOR SELECT
    USING (auth.uid() = user_id OR public.current_user_has_role('FINANCE') OR public.current_user_is_admin_or_super());

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOGS (Immutable & restricted)
-- ------------------------------------------------------------------------------
CREATE POLICY "Audit logs only viewable by Compliance, Finance, Admin"
    ON public.audit_logs FOR SELECT
    USING (
        public.current_user_has_role('COMPLIANCE') OR 
        public.current_user_has_role('FINANCE') OR 
        public.current_user_is_admin_or_super()
    );
