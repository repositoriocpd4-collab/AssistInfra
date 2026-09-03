import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vvdbbwgcubddfvsxsehb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bxi6F4RHTA4GDbnTO0Wg3w_Ax5TWAbz';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
