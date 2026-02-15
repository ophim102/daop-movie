import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_ADMIN_URL || '';
const key = import.meta.env.VITE_SUPABASE_ADMIN_ANON_KEY || '';

export const supabase = createClient(url, key);
