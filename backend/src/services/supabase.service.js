import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && serviceRoleKey && !url.includes('your_'));

// supabase-js always constructs a Realtime client, which needs a WebSocket
// implementation. Node < 22 has no native WebSocket, so we supply `ws`.
// Server-side only: no session persistence is used.
const options = { auth: { persistSession: false }, realtime: { transport: ws } };

export const supabaseAdmin = isSupabaseConfigured ? createClient(url, serviceRoleKey, options) : null;

export const supabaseAnon =
  url && anonKey && !url.includes('your_') ? createClient(url, anonKey, options) : null;

export function requireSupabase() {
  if (!supabaseAdmin) {
    const error = new Error('Supabase is not configured. Copy backend/.env.example to backend/.env and add project keys.');
    error.status = 503;
    throw error;
  }
  return supabaseAdmin;
}
