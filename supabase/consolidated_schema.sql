-- ==============================================================================
-- FILE: 20260301000000_canonical_schema.sql
-- ==============================================================================
-- ==============================================================================
-- HOT-M CANONICAL DATABASE SCHEMA (PostgreSQL / Supabase)
-- Single Source of Truth - Section 15
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USERS & ROLES (RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY, -- 'BUYER', 'CREATOR', 'AFFILIATE', etc.
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.roles (id, description) VALUES
    ('BUYER', 'Standard purchaser of digital products and courses'),
    ('CREATOR', 'Content creator and digital product vendor'),
    ('AFFILIATE', 'Promoter earning commissions via referral links'),
    ('SUPPORT', 'Customer care representative with view & ticket permissions'),
    ('COMPLIANCE', 'KYC and regulatory officer'),
    ('FINANCE', 'Financial reconciler and payout processor'),
    ('ADMIN', 'Platform operational administrator'),
    ('SUPER_ADMIN', 'Root platform administrator')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    country VARCHAR(2) NOT NULL DEFAULT 'AO',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- ------------------------------------------------------------------------------
-- 2. KYC (KNOW YOUR CUSTOMER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- NOT_STARTED, PENDING, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED
    document_type VARCHAR(50) NOT NULL, -- BI_AO, PASSPORT, NATIONAL_ID
    document_number TEXT NOT NULL,
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    selfie_url TEXT NOT NULL,
    tax_id TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS, OFFERS & PRICING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    product_type VARCHAR(50) NOT NULL, -- DIGITAL_DOWNLOAD, COURSE
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, UNDER_REVIEW, PUBLISHED, SUSPENDED, ARCHIVED
    cover_image_url TEXT,
    asset_file_url TEXT, -- Private bucket storage path for digital downloads
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL, -- 'AOA', 'USD', 'EUR'
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0), -- e.g. 1000000 for 10,000.00 AOA
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. ORDERS & PAYMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL,
    total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_PAYMENT, PAID, FULFILLED, PAYMENT_FAILED, CANCELLED, REFUNDED
    affiliate_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
    price_id UUID NOT NULL REFERENCES public.prices(id) ON DELETE RESTRICT,
    unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor > 0),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL, -- PROXYPAY, PAYPAY
    provider_reference TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- MULTICAIXA_REFERENCE
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, EXPIRED, FAILED
    instructions JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    provider_event_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, PROCESSED, DUPLICATE, FAILED
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id)
);

-- ------------------------------------------------------------------------------
-- 5. ENTITLEMENTS (CUSTOMER ACCESS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    CONSTRAINT uq_buyer_product UNIQUE (buyer_id, product_id)
);

-- ------------------------------------------------------------------------------
-- 6. IMMUTABLE DOUBLE-ENTRY FINANCIAL LEDGER (INV-005, INV-006)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.user_profiles(id), -- NULL for Platform Master accounts
    account_type VARCHAR(50) NOT NULL, -- PLATFORM_REVENUE, CREATOR_BALANCE, AFFILIATE_BALANCE, PAYMENT_CLEARING, WITHDRAWAL_CLEARING
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_owner_account_type_currency UNIQUE (owner_id, account_type, currency)
);

CREATE TABLE IF NOT EXISTS public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id UUID NOT NULL, -- order_id, withdrawal_id, refund_id
    transaction_type VARCHAR(50) NOT NULL, -- SALE, REFUND, WITHDRAWAL_HOLD, WITHDRAWAL_RELEASE
    description TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. WITHDRAWALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    method_type VARCHAR(50) NOT NULL, -- IBAN_AO
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    withdrawal_method_id UUID NOT NULL REFERENCES public.withdrawal_methods(id) ON DELETE RESTRICT,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, UNDER_REVIEW, APPROVED, PROCESSING, PAID, REJECTED, FAILED, CANCELLED
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    payout_reference TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. REFUNDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, APPROVED, REJECTED
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    refund_request_id UUID REFERENCES public.refund_requests(id),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. AFFILIATES & REVENUE SHARE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliate_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    commission_percentage INT NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    cookie_duration_days INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
    affiliate_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    affiliate_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    link_id UUID REFERENCES public.affiliate_links(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribution_id UUID NOT NULL REFERENCES public.affiliate_attributions(id) ON DELETE RESTRICT,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, AVAILABLE, CANCELLED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.revenue_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    percentage INT NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. LMS (COURSES, MODULES, LESSONS, PROGRESS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- VIDEO, AUDIO, PDF, TEXT
    content_url TEXT,
    body_text TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_lesson UNIQUE (user_id, lesson_id)
);

-- ------------------------------------------------------------------------------
-- 11. AUDIT, NOTIFICATIONS, SUPPORT, OUTBOX & PLATFORM SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id),
    actor_role TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    request_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    destination_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (key, value, description) VALUES
    ('platform_fee_percent', '10'::jsonb, 'Default platform fee percentage'),
    ('min_withdrawal_aoa', '500000'::jsonb, 'Minimum withdrawal in minor units (5,000.00 AOA)'),
    ('kyc_required_for_payout', 'true'::jsonb, 'Whether KYC is mandatory before any payout')
ON CONFLICT (key) DO NOTHING;



-- ==============================================================================
-- FILE: 20260301000001_rls_policies.sql
-- ==============================================================================
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



-- ==============================================================================
-- FILE: 20260302000000_auth_triggers.sql
-- ==============================================================================
-- ==============================================================================
-- HOT-M AUTH TRIGGER & USER PROFILE INITIALIZATION
-- Section 24 (Phase 1: Auth)
-- ==============================================================================

-- Function to handle new user signup from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role VARCHAR(50) := 'BUYER';
    user_full_name TEXT;
    user_country VARCHAR(2);
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    user_country := COALESCE(NEW.raw_user_meta_data->>'country', 'AO');

    -- 1. Create User Profile
    INSERT INTO public.user_profiles (id, email, full_name, country, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_country,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- 2. Grant Default Role ('BUYER')
    INSERT INTO public.user_roles (user_id, role_id, granted_at)
    VALUES (NEW.id, default_role, NOW())
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing after user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- ==============================================================================
-- FILE: 20260303000000_coupons_and_quotes.sql
-- ==============================================================================
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
    currency VARCHAR(3), -- ObrigatÃ³rio se FIXED_AMOUNT
    max_uses INT,
    times_used INT NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COTAÃ‡Ã•ES EFÃŠMERAS (PRICING QUOTES)
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

-- PolÃ­ticas de Cupons
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

-- PolÃ­ticas de CotaÃ§Ãµes (PÃºblicas para leitura durante a janela de validade da compra)
CREATE POLICY "Public can read quotes"
    ON public.pricing_quotes FOR SELECT
    USING (TRUE);



-- ==============================================================================
-- FILE: 20260304000000_bumps_and_funnels.sql
-- ==============================================================================
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

-- 2. POST-PURCHASE UPSELLS (OFERTAS EXCLUSIVAS DE 1 CLIQUE PÃ“S-COMPRA)
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

-- PolÃ­ticas de Order Bumps
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

-- PolÃ­ticas de Post-Purchase Upsells
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



-- ==============================================================================
-- FILE: 20260305000000_checkout_customizer.sql
-- ==============================================================================
-- ==============================================================================
-- HOT-M CHECKOUT CUSTOMIZER & CONVERSION OPTIMIZATION ENGINE
-- Section 75 (Phase 16: Checkout Customizer, Timers, Scarcity & Testimonials)
-- ==============================================================================

-- 1. CHECKOUT SETTINGS (CONFIGURAÃ‡ÃƒO VISUAL & GATILHOS)
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

-- PolÃ­ticas de Checkout Settings
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

-- PolÃ­ticas de Testimonials
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



-- ==============================================================================
-- FILE: 20260306000000_exchange_rates.sql
-- ==============================================================================
-- ==============================================================================
-- HOT-M MULTI-CURRENCY & EXCHANGE RATES ENGINE (FX)
-- Section 75 (Phase 17: FX Engine, Multi-Currency Display & Dynamic Pricing)
-- ==============================================================================

-- 1. EXCHANGE RATES (TAXAS DE CÃ‚MBIO OFICIAIS)
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

-- PolÃ­ticas de RLS
CREATE POLICY "Public can view exchange rates"
    ON public.exchange_rates FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage exchange rates"
    ON public.exchange_rates FOR ALL
    USING (public.current_user_is_admin_or_super());

-- Cargas Iniciais CanÃ³nicas de CÃ¢mbio (AOA como moeda Ã¢ncora)
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



-- ==============================================================================
-- FILE: 20260307000000_notifications_and_outbox.sql
-- ==============================================================================
-- ==============================================================================
-- PHASE 18: NOTIFICATIONS & OUTBOX WORKER ENHANCEMENTS
-- ==============================================================================

-- 1. Extend notifications table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'INFO';
    END IF;
END $$;

-- 2. Extend outbox_events table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outbox_events' AND column_name = 'error_message') THEN
        ALTER TABLE public.outbox_events ADD COLUMN error_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outbox_events' AND column_name = 'processed_at') THEN
        ALTER TABLE public.outbox_events ADD COLUMN processed_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created 
    ON public.outbox_events (status, created_at ASC);

-- 4. RLS Policies for Notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id OR public.current_user_is_admin_or_super());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service or admin can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.current_user_is_admin_or_super());

-- 5. RLS Policies for Outbox Events
CREATE POLICY "Admin can manage outbox events"
    ON public.outbox_events FOR ALL
    USING (public.current_user_is_admin_or_super());



-- ==============================================================================
-- FILE: 20260308000000_support_and_disputes.sql
-- ==============================================================================
-- ==============================================================================
-- PHASE 19: SUPPORT TICKETS, IN-TICKET MESSAGING & DISPUTE RESOLUTION
-- ==============================================================================

-- 1. Extend support_tickets table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'order_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'priority') THEN
        ALTER TABLE public.support_tickets ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'category') THEN
        ALTER TABLE public.support_tickets ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'GENERAL';
    END IF;
END $$;

-- 2. Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status 
    ON public.support_tickets (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
    ON public.support_ticket_messages (ticket_id, created_at ASC);

-- 4. Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for support_tickets
DROP POLICY IF EXISTS "Users can view own tickets or staff can view all" ON public.support_tickets;
CREATE POLICY "Users can view own tickets or staff can view all"
    ON public.support_tickets FOR SELECT
    USING (
        auth.uid() = user_id OR 
        public.current_user_has_role('SUPPORT') OR 
        public.current_user_is_admin_or_super()
    );

DROP POLICY IF EXISTS "Users can create own tickets" ON public.support_tickets;
CREATE POLICY "Users can create own tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tickets or staff can manage" ON public.support_tickets;
CREATE POLICY "Users can update own tickets or staff can manage"
    ON public.support_tickets FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        public.current_user_has_role('SUPPORT') OR 
        public.current_user_is_admin_or_super()
    );

-- 6. RLS Policies for support_ticket_messages
DROP POLICY IF EXISTS "Ticket messages viewable by participants and staff" ON public.support_ticket_messages;
CREATE POLICY "Ticket messages viewable by participants and staff"
    ON public.support_ticket_messages FOR SELECT
    USING (
        sender_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE support_tickets.id = support_ticket_messages.ticket_id
            AND (support_tickets.user_id = auth.uid() OR public.current_user_has_role('SUPPORT') OR public.current_user_is_admin_or_super())
        )
    );

DROP POLICY IF EXISTS "Ticket participants and staff can insert messages" ON public.support_ticket_messages;
CREATE POLICY "Ticket participants and staff can insert messages"
    ON public.support_ticket_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE support_tickets.id = support_ticket_messages.ticket_id
            AND (support_tickets.user_id = auth.uid() OR public.current_user_has_role('SUPPORT') OR public.current_user_is_admin_or_super())
        )
    );



-- ==============================================================================
-- FILE: 20260309000000_analytics_and_admin.sql
-- ==============================================================================
-- ==============================================================================
-- PHASE 20: ANALYTICS & ADMIN OPERATIONS
-- ==============================================================================

-- 1. Enable RLS on platform_settings if not already enabled
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform settings viewable by authenticated users" ON public.platform_settings;
CREATE POLICY "Platform settings viewable by authenticated users"
    ON public.platform_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform settings manageable by Admin and SuperAdmin" ON public.platform_settings;
CREATE POLICY "Platform settings manageable by Admin and SuperAdmin"
    ON public.platform_settings FOR ALL
    USING (public.current_user_is_admin_or_super());

-- 2. Performance indexes for analytics aggregation
CREATE INDEX IF NOT EXISTS idx_orders_analytics_created 
    ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_analytics_status_created 
    ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created 
    ON public.ledger_entries (account_id, created_at DESC);

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




