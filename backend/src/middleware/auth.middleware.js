import { requireSupabase, supabaseAdmin } from '../services/supabase.service.js';

export async function requireAuth(req, _res, next) {
  try {
    requireSupabase();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      const error = new Error('Missing bearer token');
      error.status = 401;
      throw error;
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      const authError = new Error('Invalid or expired token');
      authError.status = 401;
      throw authError;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    let activeProfile = profile;
    if (!activeProfile) {
      const metadata = data.user.user_metadata || {};
      const { data: createdProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: metadata.full_name || data.user.email?.split('@')[0],
          role: metadata.role || 'student',
          department: metadata.department || null,
          semester: metadata.semester || null
        })
        .select()
        .single();

      if (profileError) throw profileError;
      activeProfile = createdProfile;
    }

    req.user = data.user;
    req.profile = activeProfile;
    next();
  } catch (error) {
    next(error);
  }
}
