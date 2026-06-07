
-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. api_logs table
CREATE TABLE IF NOT EXISTS public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL,
  step text NOT NULL,
  level text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  pre_save_id uuid,
  fan_id uuid,
  user_id uuid,
  origin text,
  user_agent text,
  ip text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.api_logs TO authenticated;
GRANT ALL ON public.api_logs TO service_role;

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view api logs" ON public.api_logs;
CREATE POLICY "Admins can view api logs" ON public.api_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_category ON public.api_logs (category, created_at DESC);
