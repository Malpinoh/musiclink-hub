ALTER TABLE public.pre_saves
  ADD COLUMN IF NOT EXISTS preview_start real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_end real DEFAULT 30,
  ADD COLUMN IF NOT EXISTS waveform_data jsonb DEFAULT NULL;