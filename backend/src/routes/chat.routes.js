import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { requireSupabase } from '../services/supabase.service.js';
import { answerQuestion } from '../services/rag.service.js';

const router = Router();

// Protect the paid LLM call: cap questions per authenticated user.
const chatLimiter = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.CHAT_RATE_MAX || 15)
});

router.post('/', requireAuth, chatLimiter, async (req, res, next) => {
  try {
    const { question, session_id } = req.body;
    if (!question?.trim()) {
      const error = new Error('Question is required');
      error.status = 400;
      throw error;
    }
    const result = await answerQuestion({ question, profile: req.profile, sessionId: session_id });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', req.profile.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
