import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const provider = process.env.AI_PROVIDER || (groqApiKey ? 'groq' : 'openai');

export const isOpenAIConfigured = Boolean(openaiApiKey && !openaiApiKey.includes('your_'));
export const isGroqConfigured = Boolean(groqApiKey && !groqApiKey.includes('your_'));
export const openai = isOpenAIConfigured ? new OpenAI({ apiKey: openaiApiKey }) : null;

const SYSTEM_PROMPT =
  'You are an internal college helpdesk assistant. Answer using the supplied context, which may include official college documents and a file the user attached to this message. Prefer the user-attached material when it is relevant to their question. If the context is insufficient, say: I do not have enough information in the uploaded college data.';

const ATTACHMENT_LIMIT = 6000;

// Combine the user's attached file (if any) with retrieved college-document chunks.
function buildContext({ chunks, attachmentText = '' }) {
  const parts = [];
  if (attachmentText && attachmentText.trim()) {
    parts.push(`[User-attached file]\n${attachmentText.trim().slice(0, ATTACHMENT_LIMIT)}`);
  }
  chunks.forEach((chunk, index) => {
    parts.push(`[Source ${index + 1}: ${chunk.title || 'Document'}]\n${chunk.content}`);
  });
  return parts.join('\n\n');
}

function localAnswer({ question, chunks, attachmentText = '' }) {
  const joined = [attachmentText, ...chunks.map((chunk) => chunk.content)].filter(Boolean).join('\n\n');
  const lines = joined.split('\n').map((line) => line.trim()).filter(Boolean);
  const questionTerms = new Set(question.toLowerCase().match(/[a-z0-9]+/g) || []);

  const scoredLines = lines
    .map((line) => {
      const lineTerms = new Set(line.toLowerCase().match(/[a-z0-9]+/g) || []);
      let score = 0;
      for (const term of questionTerms) {
        if (lineTerms.has(term)) score += 1;
      }
      return { line, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredLines.length) {
    return `Based on the uploaded college data: ${scoredLines.slice(0, 3).map((item) => item.line).join(' ')}`;
  }

  return `Based on the uploaded college data: ${joined.slice(0, 700)}${joined.length > 700 ? '...' : ''}`;
}

export async function generateAnswer({ question, chunks, attachmentText = '' }) {
  if (provider === 'groq' && isGroqConfigured) {
    return generateGroqAnswer({ question, chunks, attachmentText });
  }

  if (!isOpenAIConfigured) {
    return localAnswer({ question, chunks, attachmentText });
  }

  const context = buildContext({ chunks, attachmentText });

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nCollege data context:\n${context}`
        }
      ]
    });

    return response.output_text || 'I do not have enough information in the uploaded college data.';
  } catch (error) {
    if ([429, 500, 503].includes(error.status)) {
      console.warn(`OpenAI unavailable (${error.status}); using local extractive fallback.`);
      return localAnswer({ question, chunks, attachmentText });
    }
    throw error;
  }
}

async function generateGroqAnswer({ question, chunks, attachmentText = '' }) {
  const context = buildContext({ chunks, attachmentText });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 12000));

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.1,
        max_completion_tokens: 350,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nCollege data context:\n${context}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Groq API error ${response.status}: ${errorText}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'I do not have enough information in the uploaded college data.';
  } catch (error) {
    if (error.name === 'AbortError' || [429, 500, 503].includes(error.status)) {
      console.warn(`Groq unavailable (${error.status || 'timeout'}); using local extractive fallback.`);
      return localAnswer({ question, chunks, attachmentText });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Generic single-turn completion with a custom system prompt and no retrieval
// context. Routes through the same provider chain as generateAnswer (Groq →
// OpenAI). Returns the model text, or null when no provider is configured.
export async function completeChat({ system, user, maxTokens = 400, temperature = 0.1 }) {
  if (provider === 'groq' && isGroqConfigured) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 12000));
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          temperature,
          max_completion_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ]
        })
      });
      if (!response.ok) throw new Error(`Groq API error ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (isOpenAIConfigured && openai) {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });
    return response.output_text || null;
  }

  return null;
}

export async function uploadToVectorStore() {
  return { openai_file_id: null, vector_store_id: process.env.OPENAI_VECTOR_STORE_ID || null };
}
