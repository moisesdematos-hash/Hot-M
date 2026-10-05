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
