import { createClient } from '@supabase/supabase-js';
import cws from 'ws';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && serviceRoleKey && !url.includes('your_'));

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(url, serviceRoleKey, { 
      auth: { persistSession: false },
      realtime: { transport: ws }
    })
  : null;

export const supabaseAnon = url && anonKey && !url.includes('your_')
  ? createClient(url, anonKey, { 
      auth: { persistSession: false },
      realtime: { transport: ws }
    })
  : null;

export function requireSupabase() {
  if (!supabaseAdmin) {
    const error = new Error('Supabase is not configured. Copy backend/.env.example to backend/.env and add project keys.');
    error.status = 503;
    throw error;
  }
  return supabaseAdmin;
}
