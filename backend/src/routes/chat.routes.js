import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { requireSupabase } from '../services/supabase.service.js';
import { answerQuestion } from '../services/rag.service.js';
import { extractText } from '../utils/extractText.js';

const router = Router();

// In-memory upload for per-message attachments (read for context, not stored).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// Protect the paid LLM call: cap questions per authenticated user.
const chatLimiter = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.CHAT_RATE_MAX || 15)
});

// `upload.single` skips non-multipart requests, so plain JSON chats still work.
router.post('/', requireAuth, chatLimiter, upload.single('file'), async (req, res, next) => {
  try {
    const { question, session_id } = req.body;
    if (!question?.trim()) {
      const error = new Error('Question is required');
      error.status = 400;
      throw error;
    }

    let attachmentText = '';
    if (req.file) {
      try {
        attachmentText = (await extractText(req.file)) || '';
      } catch (extractError) {
        const error = new Error(extractError.message || 'Could not read the attached file.');
        error.status = 400;
        throw error;
      }
    }

    const result = await answerQuestion({ question, profile: req.profile, sessionId: session_id, attachmentText });
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
