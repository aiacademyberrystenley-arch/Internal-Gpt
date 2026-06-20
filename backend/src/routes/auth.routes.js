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
    const payload = {
      id: req.user.id,
      email: req.user.email,
      full_name: req.body.full_name,
      role: req.body.role || 'student',
      department: req.body.department,
      semester: req.body.semester || null
    };
    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
