import { supabase, getSessionCached } from './supabaseClient';

// Empty string => same-origin relative requests (e.g. behind an Nginx /api proxy).
// Unset => local dev default. Use ?? so an explicit "" is preserved.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5050';

async function token() {
  if (!supabase) return null;
  const session = await getSessionCached();
  return session?.access_token || null;
}

export async function api(path, options = {}) {
  const accessToken = await token();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const controller = options.signal ? null : new AbortController();
  const signal = options.signal || controller?.signal;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null; // 10s timeout

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers, signal });
    if (timeoutId) clearTimeout(timeoutId);
    
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
