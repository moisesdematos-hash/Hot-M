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
