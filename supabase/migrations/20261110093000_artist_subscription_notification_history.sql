CREATE TABLE IF NOT EXISTS public.artist_subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.artist_email_subscriptions(id) ON DELETE CASCADE,
  pre_save_id UUID NOT NULL REFERENCES public.pre_saves(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, pre_save_id)
);
ALTER TABLE public.artist_subscription_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Artists can view their subscriber notification history" ON public.artist_subscription_notifications;
CREATE POLICY "Artists can view their subscriber notification history"
  ON public.artist_subscription_notifications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.artist_email_subscriptions s
    WHERE s.id = artist_subscription_notifications.subscription_id
      AND s.artist_user_id = auth.uid()
  ));
