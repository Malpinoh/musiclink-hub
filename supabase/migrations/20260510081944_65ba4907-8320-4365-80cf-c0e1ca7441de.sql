ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description text;