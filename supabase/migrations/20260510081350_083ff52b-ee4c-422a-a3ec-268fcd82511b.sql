
-- Tighten clicks INSERT: require fanlink_id to exist (no longer always true)
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.clicks;
CREATE POLICY "Anyone can insert clicks for valid fanlinks"
ON public.clicks
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.fanlinks WHERE fanlinks.id = clicks.fanlink_id));

-- Remove public INSERT on pre_save_actions; only edge functions (service role) write to it
DROP POLICY IF EXISTS "Anyone can create pre-save actions" ON public.pre_save_actions;

-- Add owner-scoped UPDATE/DELETE on pre_save_actions (service role bypasses RLS)
CREATE POLICY "Owners can update their pre-save actions"
ON public.pre_save_actions
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.pre_saves WHERE pre_saves.id = pre_save_actions.pre_save_id AND pre_saves.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.pre_saves WHERE pre_saves.id = pre_save_actions.pre_save_id AND pre_saves.user_id = auth.uid()));

CREATE POLICY "Owners can delete their pre-save actions"
ON public.pre_save_actions
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.pre_saves WHERE pre_saves.id = pre_save_actions.pre_save_id AND pre_saves.user_id = auth.uid()));
