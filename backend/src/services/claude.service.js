// Anthropic (Claude) integration. Powers two things:
//   1. Guest mode — web search restricted to the official SRM sites.
//   2. Rich generation for signed-in users — tables, notes, and SVG charts/diagrams.

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
export const isAnthropicConfigured = Boolean(anthropicApiKey && !anthropicApiKey.includes('your_'));
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

// Low-level call to the Messages API. Throws on non-2xx (with .status set).
export async function anthropicMessages(body, { timeoutMs } = {}) {
  if (!isAnthropicConfigured) {
    const error = new Error('Anthropic API key not configured');
    error.status = 503;
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || Number(process.env.ANTHROPIC_TIMEOUT_MS || 30000));
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`Anthropic API error ${response.status}: ${detail.slice(0, 300)}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Join all text blocks of a Messages response into one string.
export function textFromMessage(data) {
  return (data?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('')
    .trim();
}

const RICH_SYSTEM_PROMPT = [
  'You are an internal college helpdesk assistant for SRM Institute of Science and Technology.',
  'Answer using the supplied college context and any file the user attached. Ground every factual claim in that context — never invent fees, dates, numbers, names, or statistics.',
  '',
  'You can produce rich output. Choose the format the user asks for:',
  '- TABLE: use a GitHub-flavoured markdown table.',
  '- NOTE / structured answer: use markdown — short headings, "-" bullet lists, and **bold** for key terms.',
  '- GRAPH / CHART / DIAGRAM / IMAGE / FLOWCHART / MIND MAP / TIMELINE / ORG CHART: return ONE self-contained inline SVG inside a ```svg fenced code block. Requirements for the SVG:',
  '    • include width="100%" and a viewBox (e.g. viewBox="0 0 640 400");',
  '    • label axes, bars, slices, or nodes with readable dark text (#0f172a) so it is legible on a white background;',
  '    • use #2563eb as the primary colour, with #93c5fd / #1e3a8a as accents;',
  '    • build charts ONLY from numbers present in the context. If the needed numbers are not in the context, say so instead of inventing them.',
  '    • do not explain the SVG markup; a one-line caption above it is enough.',
  '',
  'Note: you cannot create photographs — for any "image" request, produce a clear SVG diagram or illustration instead.',
  'If the context lacks the facts needed for a factual answer (and the request is not a template/diagram), reply: "I do not have enough information in the uploaded college data."'
].join('\n');

function buildContext({ chunks = [], attachmentText = '' }) {
  const parts = [];
  if (attachmentText && attachmentText.trim()) {
    parts.push(`[User-attached file]\n${attachmentText.trim().slice(0, 6000)}`);
  }
  chunks.forEach((chunk, index) => {
    parts.push(`[Source ${index + 1}: ${chunk.title || 'Document'}]\n${chunk.content}`);
  });
  return parts.join('\n\n') || '(no matching college documents were found)';
}

// Generate a rich answer (markdown tables/notes or an SVG chart/diagram) grounded
// in the retrieved college chunks and any attached file.
export async function generateRichAnswer({ question, chunks = [], attachmentText = '' }) {
  const context = buildContext({ chunks, attachmentText });
  const data = await anthropicMessages({
    model: ANTHROPIC_MODEL,
    max_tokens: 2500,
    system: RICH_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Question: ${question}\n\nCollege data context:\n${context}` }
    ]
  });
  return textFromMessage(data);
}
