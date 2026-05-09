import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import ws from 'ws';

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: ws as never,
    },
  }
);
