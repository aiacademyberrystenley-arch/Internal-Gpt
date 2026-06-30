import { completeChat } from './openai.service.js';
import { anthropicMessages, isAnthropicConfigured, ANTHROPIC_MODEL } from './claude.service.js';

// Guest mode is a public, no-login experience. It must answer ONLY from the two
// official SRM websites — the same information any visitor sees on the sites.
export const GUEST_DOMAINS = ['srmist.edu.in', 'srmup.in'];

const NOT_FOUND =
  'I could not find this on the official SRM websites (srmist.edu.in / srmup.in). Please check the website directly.';

const OUT_OF_SCOPE =
  'I can only answer questions about SRM, using the official websites srmist.edu.in and srmup.in.';

const GUEST_SYSTEM_PROMPT = [
  'You are the public assistant for SRM. You may ONLY use information found on these two official websites:',
  '- https://www.srmist.edu.in/',
  '- https://www.srmup.in/',
  '',
  'Rules:',
  '1. Answer ONLY using the web search results from these two websites. Never use other sources, other colleges, or prior general knowledge.',
  '2. Be direct and to the point. Lead with the answer in 1-3 short sentences. Use short hyphen (-) bullets only when listing multiple items.',
  '3. Do not narrate your process. Never say things like "I\'ll search" — just give the answer.',
  '4. Plain text only. No markdown headings (#), no bold (**), no tables.',
  '5. Do not invent fees, dates, phone numbers, eligibility, or rankings. State only what the websites show.',
  `6. If the answer is not found on these websites, reply exactly: "${NOT_FOUND}"`,
  `7. Only answer questions about SRM (admissions, programs, campus, fees, scholarships, placements, facilities, contact, events). If the question is about anything else, reply exactly: "${OUT_OF_SCOPE}" — never answer general-knowledge questions (geography, sports, news, other topics) even if you know the answer.`,
  '8. This is public guest access — never reference internal, student-only, or login-protected systems.'
].join('\n');

// Pull the answer text and the cited SRM URLs out of an Anthropic Messages
// response that used the web_search tool.
function parseAnthropicResponse(data) {
  const blocks = data?.content || [];
  const sources = [];
  const seen = new Set();

  const addSource = (url, title) => {
    if (!url || seen.has(url) || sources.length >= 6) return;
    let host;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return;
    }
    if (!GUEST_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return;
    seen.add(url);
    sources.push({ label: `Source ${sources.length + 1}`, title: title || host, url });
  };

  // The final answer is the text emitted after the last web-search activity;
  // any text before that is Claude's "let me search…" preamble, so drop it.
  let lastSearchIdx = -1;
  blocks.forEach((block, i) => {
    if (block.type === 'web_search_tool_result' || block.type === 'server_tool_use') lastSearchIdx = i;
  });

  const finalText = blocks.filter((block, i) => block.type === 'text' && i > lastSearchIdx);
  const answerBlocks = finalText.length ? finalText : blocks.filter((block) => block.type === 'text');
  const answer = answerBlocks.map((block) => block.text || '').join('').trim();

  // Prefer the URLs actually cited in the answer; fall back to raw results.
  for (const block of answerBlocks) {
    for (const citation of block.citations || []) addSource(citation.url, citation.title);
  }
  if (!sources.length) {
    for (const block of blocks) {
      if (block.type === 'web_search_tool_result') {
        for (const result of block.content || []) addSource(result.url, result.title);
      }
    }
  }

  return { answer, sources };
}

async function answerWithAnthropic({ question }) {
  const data = await anthropicMessages({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: GUEST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
        allowed_domains: GUEST_DOMAINS
      }
    ]
  });
  const { answer, sources } = parseAnthropicResponse(data);
  return { answer: answer || NOT_FOUND, sources };
}

export async function answerGuestQuestion({ question }) {
  // Preferred path: Claude web search restricted to the two SRM domains.
  if (isAnthropicConfigured) {
    try {
      return await answerWithAnthropic({ question });
    } catch (error) {
      console.warn(`Guest web search unavailable (${error.status || error.message}); using model fallback.`);
    }
  }

  // Fallback: constrained completion without live web access.
  const answer = await completeChat({ system: GUEST_SYSTEM_PROMPT, user: question, maxTokens: 400 });
  return { answer: (answer || '').trim() || NOT_FOUND, sources: [] };
}
