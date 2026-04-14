
-- Create fan_contacts table
CREATE TABLE public.fan_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.fanlinks(id) ON DELETE CASCADE,
  email text,
  phone text,
  consent boolean DEFAULT true,
  collected_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  country text
);

-- Enable RLS
ALTER TABLE public.fan_contacts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public fan submission)
CREATE POLICY "Anyone can insert fan contacts"
ON public.fan_contacts
FOR INSERT
WITH CHECK (true);

-- Artists can view contacts for their own fanlinks
CREATE POLICY "Artists can view their fan contacts"
ON public.fan_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fanlinks
    WHERE fanlinks.id = fan_contacts.link_id
    AND fanlinks.user_id = auth.uid()
  )
);

-- Add lead capture settings to fanlinks
ALTER TABLE public.fanlinks
ADD COLUMN collect_email boolean DEFAULT false,
ADD COLUMN collect_phone boolean DEFAULT false,
ADD COLUMN require_contact boolean DEFAULT false;
