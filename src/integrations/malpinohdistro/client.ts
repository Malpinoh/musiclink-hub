import { createClient } from '@supabase/supabase-js';

// MALPINOHDISTRO shared Supabase backend
const SUPABASE_URL = "https://hewyffhdykietximpfbu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y";

export const supabaseMD = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Re-export as default supabase for easy drop-in replacement
export const supabase = supabaseMD;
