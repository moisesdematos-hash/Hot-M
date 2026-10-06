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
