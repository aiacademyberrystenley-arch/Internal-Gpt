import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anon && !url.includes('your_'));
export const supabase = supabaseConfigured ? createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) : null;

// Cache last session to avoid redundant calls
let cachedSession = null;
let sessionCache = { expires: 0 };

export async function getSessionCached() {
  const now = Date.now();
  if (cachedSession && sessionCache.expires > now) {
    return cachedSession;
  }
  
  if (!supabase) return null;
  
  try {
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 3000))
    ]);
    
    cachedSession = data.session;
    sessionCache.expires = now + 60000; // Cache for 1 minute
    return data.session;
  } catch (error) {
    console.warn('Failed to get session:', error.message);
    return null;
  }
}
