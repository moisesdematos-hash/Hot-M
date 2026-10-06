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
