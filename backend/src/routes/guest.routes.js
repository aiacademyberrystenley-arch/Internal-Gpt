import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { answerGuestQuestion } from '../services/guest.service.js';
import { supabaseAdmin } from '../services/supabase.service.js';

const router = Router();

// Public endpoint — no auth. Cap by IP so anonymous traffic can't drain the
// paid LLM/web-search budget.
const guestLimiter = rateLimit({
  windowMs: Number(process.env.GUEST_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.GUEST_RATE_MAX || 10),
  key: (req) => `guest:${req.ip}`
});

router.post('/chat', guestLimiter, async (req, res, next) => {
  try {
    const question = (req.body?.question || '').trim();
    if (!question) {
      const error = new Error('Question is required');
      error.status = 400;
      throw error;
    }
    const result = await answerGuestQuestion({ question });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Captures the name + email a visitor enters on the guest login step. Logged
// server-side for follow-up (visible via `pm2 logs` in production). Best-effort
// and never blocks entry. Separate IP limiter so it doesn't eat the chat budget.
const leadLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  key: (req) => `guest-lead:${req.ip}`
});

router.post('/lead', leadLimiter, async (req, res) => {
  const full_name = (req.body?.name || '').toString().trim().slice(0, 120);
  const email = (req.body?.email || '').toString().trim().slice(0, 200);
  const phone = (req.body?.phone || '').toString().trim().slice(0, 40);

  if (email || phone) {
    console.log(`[guest-lead] ${full_name || 'Guest'} <${email}> ${phone} @ ${new Date().toISOString()}`);
    // Persist for follow-up. Best-effort: a DB hiccup must never block entry.
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('guest_leads').insert({ full_name, email, phone });
      if (error) console.warn(`[guest-lead] DB save failed: ${error.message}`);
    }
  }
  res.json({ ok: true });
});

export default router;
