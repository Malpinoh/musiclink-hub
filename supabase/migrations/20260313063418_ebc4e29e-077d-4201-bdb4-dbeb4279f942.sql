
CREATE TABLE public.presave_streaming_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pre_save_id UUID NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  platform_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pre_save_id, platform_name)
);

ALTER TABLE public.presave_streaming_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view streaming links" ON public.presave_streaming_links
  FOR SELECT TO public USING (true);

CREATE POLICY "Owners can manage streaming links" ON public.presave_streaming_links
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pre_saves WHERE pre_saves.id = presave_streaming_links.pre_save_id AND pre_saves.user_id = auth.uid())
  );

CREATE POLICY "Service can insert streaming links" ON public.presave_streaming_links
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Service can update streaming links" ON public.presave_streaming_links
  FOR UPDATE TO public USING (true);

-- Add links_resolved flag to pre_saves
ALTER TABLE public.pre_saves ADD COLUMN IF NOT EXISTS links_resolved BOOLEAN DEFAULT false;
