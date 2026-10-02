GRANT SELECT ON public.campaigns TO anon;
GRANT SELECT ON public.campaign_templates TO anon;

DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns"
ON public.campaigns
FOR SELECT
TO anon, authenticated
USING (status = 'active' OR auth.uid() = user_id);

DROP TRIGGER IF EXISTS invalidate_meta_campaigns ON public.campaigns;
CREATE TRIGGER invalidate_meta_campaigns
AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.invalidate_meta_cache('id');

ALTER TABLE public.ad_impressions
ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_id
ON public.ad_impressions(campaign_id);