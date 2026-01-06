-- Enable realtime for clicks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.clicks;

-- Enable realtime for pre_save_actions table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_save_actions;