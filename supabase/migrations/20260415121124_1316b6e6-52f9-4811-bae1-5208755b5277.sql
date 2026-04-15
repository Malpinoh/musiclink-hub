
-- Campaign Templates (reference data)
CREATE TABLE public.campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  default_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
ON public.campaign_templates FOR SELECT
USING (true);

-- Campaigns (user data)
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.campaign_templates(id),
  campaign_name text NOT NULL,
  artist_name text,
  release_date timestamptz,
  artwork_url text,
  status text NOT NULL DEFAULT 'draft',
  fanlink_id uuid,
  pre_save_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
ON public.campaigns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns"
ON public.campaigns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
ON public.campaigns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
ON public.campaigns FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes (skip idx_clicks_fanlink_id as it already exists)
CREATE INDEX IF NOT EXISTS idx_fan_contacts_link_id ON public.fan_contacts(link_id);
CREATE INDEX IF NOT EXISTS idx_pre_save_actions_pre_save_id ON public.pre_save_actions(pre_save_id);

-- Insert default templates
INSERT INTO public.campaign_templates (name, description, template_type, default_settings) VALUES
('New Song Release', 'Promote a new single with pre-save and fanlink campaign', 'song_release', '{"collect_email": true, "require_contact": false, "create_presave": true, "create_fanlink": true}'::jsonb),
('Music Video Launch', 'Drive traffic to your new music video', 'video_launch', '{"collect_email": true, "create_fanlink": true, "create_presave": false}'::jsonb),
('Album / EP Launch', 'Promote an album or EP release across all platforms', 'album_launch', '{"collect_email": true, "create_presave": true, "create_fanlink": true}'::jsonb),
('Concert Promotion', 'Promote a live event or concert', 'event_promotion', '{"collect_email": true, "create_fanlink": true, "create_presave": false}'::jsonb);
