import { requireSupabase } from './supabase.service.js';
import { generateAnswer } from './openai.service.js';
import { generateRichAnswer, isAnthropicConfigured } from './claude.service.js';

const NO_INFO = 'I do not have enough information in the uploaded college data.';

// Shown to a student when the only matching information belongs to a different
// department (department-specific document the student isn't part of).
const DEPT_REDIRECT =
  'Dear user, I do have this information — but it is department-specific, so kindly contact the concerned HOD / Dean.\n\nThank you for your understanding.\n\nPlease keep asking your queries; we are pleased to answer you in a more customised manner.';

// Documents tagged to one of these are open to everyone (not department-specific).
const GENERAL_DEPTS = new Set(['', 'all', 'allgeneral', 'general']);

// Common abbreviation → full (normalized) department, so a student whose profile
// says "CSE" still matches a "Computer Science & Engineering" document.
const DEPT_ALIASES = {
  cse: 'computerscienceandengineering',
  cs: 'computerscienceandengineering',
  it: 'informationtechnology',
  ece: 'electronicsandcommunicationengineering',
  eee: 'electricalandelectronicsengineering',
  mech: 'mechanicalengineering',
  civil: 'civilengineering',
  sh: 'scienceandhumanities',
  bba: 'management',
  mba: 'management'
};

function normalizeDept(value) {
  return (value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

function isDeptSpecific(dept) {
  return !GENERAL_DEPTS.has(normalizeDept(dept));
}

// Does a document's department apply to this user? General docs always do.
function deptMatches(docDept, userDept) {
  const d = normalizeDept(docDept);
  if (GENERAL_DEPTS.has(d)) return true;
  let u = normalizeDept(userDept);
  if (!u) return false;
  u = DEPT_ALIASES[u] || u;
  return d === u || d.includes(u) || u.includes(d);
}

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

// Legacy hierarchical visibility — used only as a fallback if the `visible_to`
// column hasn't been migrated yet (so deploy order can't break retrieval).
function legacyVisibility(role) {
  if (role === 'teacher' || role === 'staff') return ['public', 'student', 'teacher', 'staff'];
  return ['public', 'student'];
}

export async function retrieveChunks({ question, profile, filters = {}, limit = 6 }) {
  const supabase = requireSupabase();
  const isAdmin = profile.role === 'admin';

  const baseQuery = () => {
    let q = supabase
      .from('document_chunks')
      .select('id, chunk_index, content, metadata, documents!inner(id, title, category, department, semester, status)')
      .eq('documents.status', 'indexed');
    if (filters.department) q = q.eq('documents.department', filters.department);
    if (filters.semester) q = q.eq('documents.semester', Number(filters.semester));
    if (filters.category) q = q.eq('documents.category', filters.category);
    return q;
  };

  // Admins retrieve from all documents; everyone else only from documents whose
  // audience includes their role (or "public").
  let query = baseQuery();
  if (!isAdmin) query = query.overlaps('documents.visible_to', ['public', profile.role]);
  let { data, error } = await query.limit(250);

  // Fallback if `visible_to` isn't migrated yet (undefined_column).
  if (error?.code === '42703') {
    let fallback = baseQuery();
    if (!isAdmin) fallback = fallback.in('documents.visibility', legacyVisibility(profile.role));
    ({ data, error } = await fallback.limit(250));
  }
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
      department: row.documents.department,
      metadata: row.metadata
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function answerQuestion({ question, profile, sessionId, attachmentText = '' }) {
  const supabase = requireSupabase();
  const chunks = await retrieveChunks({ question, profile });
  const strongChunks = chunks.filter((chunk) => chunk.score >= 0.12);
  const hasAttachment = Boolean(attachmentText && attachmentText.trim());

  // Department gating — students may only be answered from documents for their
  // own department or from general / all-department documents. Teachers, staff
  // and admins are not gated.
  const userDept = profile.department || profile.branch || '';
  const allowedChunks = profile.role === 'student'
    ? strongChunks.filter((chunk) => deptMatches(chunk.department, userDept))
    : strongChunks;
  // There IS a strong match, but it's department-specific to another department
  // and the student has nothing they're allowed to use — redirect politely.
  const blockedByDept =
    profile.role === 'student' &&
    !hasAttachment &&
    allowedChunks.length === 0 &&
    strongChunks.some((chunk) => isDeptSpecific(chunk.department));

  let answer;
  if (blockedByDept) {
    answer = DEPT_REDIRECT;
  } else if (isAnthropicConfigured) {
    // Claude handles every signed-in request — plain answers, tables, notes,
    // charts, diagrams, mind maps — grounded in the retrieved campus documents.
    try {
      answer = await generateRichAnswer({ question, chunks: allowedChunks, attachmentText });
    } catch (error) {
      console.warn(`Claude unavailable (${error.status || error.message}); falling back to default model.`);
      answer = allowedChunks.length || hasAttachment
        ? await generateAnswer({ question, chunks: allowedChunks, attachmentText })
        : NO_INFO;
    }
  } else if (allowedChunks.length || hasAttachment) {
    // Fallback when Claude isn't configured: answer from matching docs or the attachment.
    answer = await generateAnswer({ question, chunks: allowedChunks, attachmentText });
  } else {
    answer = NO_INFO;
  }

  // Never cite the blocked department-specific documents in the redirect case.
  const sources = (blockedByDept ? [] : allowedChunks).map((chunk, index) => ({
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
