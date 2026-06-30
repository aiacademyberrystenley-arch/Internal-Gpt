import { v4 as uuid } from 'uuid';
import { requireSupabase } from './supabase.service.js';
import { extractText } from '../utils/extractText.js';
import { chunkText } from '../utils/chunkText.js';
import { uploadToVectorStore } from './openai.service.js';

async function indexDocument({ file, document }) {
  const supabase = requireSupabase();

  try {
    const text = await extractText(file);
    const chunks = chunkText(text);
    const vectorData = await uploadToVectorStore({ file, document });

    if (chunks.length) {
      const rows = chunks.map((chunk) => ({
        document_id: document.id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        metadata: {
          title: document.title,
          category: document.category,
          department: document.department,
          semester: document.semester,
          visibility: document.visibility
        }
      }));
      const { error: chunkError } = await supabase.from('document_chunks').insert(rows);
      if (chunkError) throw chunkError;
    }

    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({ status: 'indexed', chunk_count: chunks.length, ...vectorData })
      .eq('id', document.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return updated;
  } catch (error) {
    console.error(`Document indexing failed for ${document.id}:`, error);
    const errorMessage = error.message || 'Unknown error during indexing';
    await supabase
      .from('documents')
      .update({ 
        status: 'failed',
        error_reason: errorMessage
      })
      .eq('id', document.id);
    throw error;
  }
}

export async function createUpload({ file, metadata, profile }) {
  const supabase = requireSupabase();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'college-documents';
  const extension = file.originalname.split('.').pop();
  const storagePath = `${profile.id}/${Date.now()}-${uuid()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  // Audience: explicit list of roles allowed to see this document (multi-select).
  // The legacy single `visibility` value is derived so older code keeps working.
  const VALID_ROLES = ['public', 'student', 'teacher', 'staff', 'admin'];
  const rawRoles = Array.isArray(metadata.visible_to)
    ? metadata.visible_to
    : metadata.visible_to
      ? [metadata.visible_to]
      : [];
  let visibleTo = rawRoles.filter((role) => VALID_ROLES.includes(role));
  if (!visibleTo.length) visibleTo = metadata.visibility ? [metadata.visibility] : ['student'];
  const visibility = VALID_ROLES.find((role) => visibleTo.includes(role)) || 'student';

  const payload = {
    title: metadata.title || file.originalname,
    file_url: publicUrl.publicUrl,
    file_type: file.mimetype || extension,
    category: metadata.category,
    department: metadata.department,
    semester: metadata.semester ? Number(metadata.semester) : null,
    visibility,
    visible_to: visibleTo,
    academic_year: metadata.academic_year,
    tags: metadata.tags ? metadata.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    status: 'processing',
    uploaded_by: profile.id
  };

  let { data: document, error: documentError } = await supabase.from('documents').insert(payload).select().single();
  // Fallback if `visible_to` isn't migrated yet (undefined_column).
  if (documentError?.code === '42703') {
    delete payload.visible_to;
    ({ data: document, error: documentError } = await supabase.from('documents').insert(payload).select().single());
  }
  if (documentError) throw documentError;

  setImmediate(() => {
    indexDocument({ file, document }).catch(() => {});
  });

  return document;
}

export async function processUpload({ file, metadata, profile }) {
  const document = await createUpload({ file, metadata, profile });
  return document;
}
