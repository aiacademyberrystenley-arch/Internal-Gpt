import { requireSupabase } from './supabase.service.js';
import { generateAnswer } from './openai.service.js';

const NO_INFO = 'I do not have enough information in the uploaded college data.';

function terms(text) {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) || []);
}

function scoreChunk(questionTerms, content) {
  const contentTerms = terms(content);
  let overlap = 0;
  for (const term of questionTerms) {
    if (contentTerms.has(term)) overlap += 1;
  }
  return overlap / Math.max(questionTerms.size, 1);
}

function allowedVisibility(role) {
  if (role === 'admin') return ['public', 'student', 'teacher', 'staff', 'admin'];
  if (role === 'teacher' || role === 'staff') return ['public', 'student', 'teacher', 'staff'];
  return ['public', 'student'];
}

export async function retrieveChunks({ question, profile, filters = {}, limit = 6 }) {
  const supabase = requireSupabase();
  const visibility = allowedVisibility(profile.role);

  let query = supabase
    .from('document_chunks')
    .select('id, chunk_index, content, metadata, documents!inner(id, title, category, department, semester, visibility, status)')
    .eq('documents.status', 'indexed')
    .in('documents.visibility', visibility);

  if (filters.department) query = query.eq('documents.department', filters.department);
  if (filters.semester) query = query.eq('documents.semester', Number(filters.semester));
  if (filters.category) query = query.eq('documents.category', filters.category);

  const { data, error } = await query.limit(250);
  if (error) throw error;

  const questionTerms = terms(question);
  return (data || [])
    .map((row) => ({
      id: row.id,
      content: row.content,
      chunk_index: row.chunk_index,
      score: scoreChunk(questionTerms, row.content),
      title: row.documents.title,
      document_id: row.documents.id,
      metadata: row.metadata
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function answerQuestion({ question, profile, sessionId }) {
  const supabase = requireSupabase();
  const chunks = await retrieveChunks({ question, profile });
  const strongChunks = chunks.filter((chunk) => chunk.score >= 0.12);
  const answer = strongChunks.length ? await generateAnswer({ question, chunks: strongChunks }) : NO_INFO;

  const sources = strongChunks.map((chunk, index) => ({
    label: `Source ${index + 1}`,
    document_id: chunk.document_id,
    title: chunk.title,
    chunk_index: chunk.chunk_index,
    excerpt: chunk.content.slice(0, 360),
    score: Number(chunk.score.toFixed(2))
  }));

  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: profile.id, title: question.slice(0, 80) })
      .select()
      .single();
    if (error) throw error;
    activeSessionId = session.id;
  }

  await supabase.from('chat_messages').insert([
    { session_id: activeSessionId, role: 'user', content: question },
    { session_id: activeSessionId, role: 'assistant', content: answer, sources }
  ]);

  await supabase.from('audit_logs').insert({
    user_id: profile.id,
    action: 'chat.question',
    metadata: { session_id: activeSessionId, source_count: sources.length }
  });

  return { session_id: activeSessionId, answer, sources };
}
