import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireSupabase } from '../services/supabase.service.js';

const router = Router();

router.get('/stats', requireAuth, requireRole(['admin']), async (_req, res, next) => {
  try {
    const supabase = requireSupabase();
    const [documents, indexed, questions, feedback] = await Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'indexed'),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('answer_feedback').select('id', { count: 'exact', head: true })
    ]);

    res.json({
      documents: documents.count || 0,
      indexed_documents: indexed.count || 0,
      questions: questions.count || 0,
      feedback: feedback.count || 0
    });
  } catch (error) {
    next(error);
  }
});

export default router;
