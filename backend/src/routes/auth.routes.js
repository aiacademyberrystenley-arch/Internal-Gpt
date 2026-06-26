import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSupabase } from '../services/supabase.service.js';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, profile: req.profile });
});

router.post('/profile', requireAuth, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    // Preserve the authenticated user's existing role — clients can't change it
    // here (prevents privilege escalation). New users fall back to the role
    // their profile was created with, then the request body, then 'student'.
    const role = req.profile?.role || req.body.role || 'student';
    const payload = {
      id: req.user.id,
      email: req.user.email,
      full_name: req.body.full_name,
      role,
      registration_number: req.body.registration_number || null,
      degree: req.body.degree || null,
      branch: req.body.branch || null,
      department: req.body.department,
      semester: req.body.semester ?? req.profile?.semester ?? null
    };
    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
