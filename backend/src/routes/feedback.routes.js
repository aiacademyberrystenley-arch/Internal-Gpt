import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireSupabase } from '../services/supabase.service.js';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('answer_feedback')
      .insert({
        message_id: req.body.message_id || null,
        user_id: req.profile.id,
        rating: req.body.rating,
        comment: req.body.comment || null
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, requireRole(['admin', 'teacher', 'staff']), async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('answer_feedback')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
