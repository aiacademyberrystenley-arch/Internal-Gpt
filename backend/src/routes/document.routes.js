import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireSupabase } from '../services/supabase.service.js';
import { createUpload } from '../services/documentProcessor.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

router.post('/upload', requireAuth, requireRole(['admin', 'teacher']), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('File is required');
      error.status = 400;
      throw error;
    }
    const document = await createUpload({ file: req.file, metadata: req.body, profile: req.profile });
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const isAdmin = req.profile.role === 'admin';

    // Admins see everything; everyone else sees documents whose audience
    // includes their role (or "public" / everyone).
    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (!isAdmin) query = query.overlaps('visible_to', ['public', req.profile.role]);
    let { data, error } = await query;

    // Fallback if `visible_to` isn't migrated yet (undefined_column).
    if (error?.code === '42703') {
      const legacy = ['teacher', 'staff'].includes(req.profile.role)
        ? ['public', 'student', 'teacher', 'staff']
        : ['public', 'student'];
      let fallback = supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (!isAdmin) fallback = fallback.in('visibility', legacy);
      ({ data, error } = await fallback);
    }
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const title = (req.body?.title || '').trim();
    if (!title) {
      const error = new Error('Title is required');
      error.status = 400;
      throw error;
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('documents')
      .update({ title })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    await supabase.from('document_chunks').delete().eq('document_id', req.params.id);
    const { error } = await supabase.from('documents').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
