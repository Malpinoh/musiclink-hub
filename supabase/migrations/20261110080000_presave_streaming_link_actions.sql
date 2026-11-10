-- Distinguish a true pre-release action from a normal streaming destination.
-- Existing rows remain valid and default to a normal listen action.
ALTER TABLE public.presave_streaming_links
  ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'listen';

ALTER TABLE public.presave_streaming_links
  DROP CONSTRAINT IF EXISTS presave_streaming_links_action_type_check;

ALTER TABLE public.presave_streaming_links
  ADD CONSTRAINT presave_streaming_links_action_type_check
  CHECK (action_type IN ('presave', 'preadd', 'listen', 'notify'));

CREATE INDEX IF NOT EXISTS idx_presave_streaming_links_action
  ON public.presave_streaming_links (pre_save_id, action_type);
