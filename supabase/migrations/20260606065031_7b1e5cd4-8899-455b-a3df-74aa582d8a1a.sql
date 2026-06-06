-- Fix RLS on presave_fans so anonymous fans can sign up for pre-saves
DROP POLICY IF EXISTS "Anyone can insert fan signups" ON public.presave_fans;

CREATE POLICY "Anyone can insert fan signups"
ON public.presave_fans
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Ensure explicit grants exist for Data API access
GRANT INSERT ON public.presave_fans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presave_fans TO authenticated;
GRANT ALL ON public.presave_fans TO service_role;

-- Also make sure anon can insert pre_save_actions (recorded during OAuth callback flow,
-- but inserts come from server using service_role; still safe to ensure grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_save_actions TO authenticated;
GRANT ALL ON public.pre_save_actions TO service_role;
GRANT ALL ON public.pre_saves TO service_role;