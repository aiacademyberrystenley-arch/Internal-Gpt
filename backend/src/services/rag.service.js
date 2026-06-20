import { requireSupabase } from './supabase.service.js';
import { generateAnswer } from './openai.service.js';

const NO_INFO = 'I do not have enough information in the uploaded college data.';

// Common English + question words that carry no retrieval signal.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'man', 'new', 'now',
  'old', 'see', 'two', 'way', 'who', 'did', 'its', 'let', 'put', 'say', 'she',
  'too', 'use', 'what', 'when', 'where', 'which', 'whom', 'this', 'that', 'with',
  'from', 'have', 'will', 'your', 'they', 'them', 'then', 'than', 'into', 'does',
  'doing', 'about', 'there', 'their', 'would', 'could', 'should', 'please', 'tell',
  'give', 'want', 'need', 'know', 'much', 'many', 'some', 'over', 'under', 'been',
  'were', 'here', 'just', 'also', 'each', 'more', 'most', 'such', 'only', 'very'
]);

// Lightweight stemmer: collapses common plural/verb suffixes so
// "exams" matches "exam", "fees" matches "fee", "timings" matches "timing".
function stem(word) {
  if (word.length <= 4) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3);
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function terms(text) {
  const out = new Set();
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) || []) {
    if (word.length <= 2 || STOPWORDS.has(word)) continue;
    out.add(stem(word));
  }
  return out;
}

// Inverse-document-frequency weight: rarer terms across the corpus carry
// more signal than terms that appear in nearly every chunk.
function buildIdf(rows) {
  const docFreq = new Map();
  for (const row of rows) {
    for (const term of terms(row.content)) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }
  const total = rows.length || 1;
  const idf = new Map();
  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log((total + 1) / (freq + 1)) + 1);
  }
  return idf;
}

function scoreChunk(questionTerms, content, idf) {
  const contentTerms = terms(content);
  let matched = 0;
  let possible = 0;
  for (const term of questionTerms) {
    const weight = idf.get(term) || 1;
    possible += weight;
    if (contentTerms.has(term)) matched += weight;
  }
  return possible > 0 ? matched / possible : 0;
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

  const rows = data || [];
  const questionTerms = terms(question);
  const idf = buildIdf(rows);

  return rows
    .map((row) => ({
      id: row.id,
      content: row.content,
      chunk_index: row.chunk_index,
      score: scoreChunk(questionTerms, row.content, idf),
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
