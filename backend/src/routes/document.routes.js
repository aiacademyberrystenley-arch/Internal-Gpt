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
    const visibility = req.profile.role === 'admin'
      ? ['public', 'student', 'teacher', 'staff', 'admin']
      : ['teacher', 'staff'].includes(req.profile.role)
        ? ['public', 'student', 'teacher', 'staff']
        : ['public', 'student'];

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .in('visibility', visibility)
      .order('created_at', { ascending: false });
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
