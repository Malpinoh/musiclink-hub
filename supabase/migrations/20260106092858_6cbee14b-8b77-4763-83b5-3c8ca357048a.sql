-- Add geographic columns to pre_save_actions table
ALTER TABLE public.pre_save_actions
ADD COLUMN country text,
ADD COLUMN city text;