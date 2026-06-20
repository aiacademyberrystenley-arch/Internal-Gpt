import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const provider = process.env.AI_PROVIDER || (groqApiKey ? 'groq' : 'openai');

export const isOpenAIConfigured = Boolean(openaiApiKey && !openaiApiKey.includes('your_'));
export const isGroqConfigured = Boolean(groqApiKey && !groqApiKey.includes('your_'));
export const openai = isOpenAIConfigured ? new OpenAI({ apiKey: openaiApiKey }) : null;

function localAnswer({ question, chunks }) {
  const joined = chunks.map((chunk) => chunk.content).join('\n\n');
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

export async function generateAnswer({ question, chunks }) {
  if (provider === 'groq' && isGroqConfigured) {
    return generateGroqAnswer({ question, chunks });
  }

  if (!isOpenAIConfigured) {
    return localAnswer({ question, chunks });
  }

  const context = chunks
    .map((chunk, index) => `[Source ${index + 1}: ${chunk.title || 'Document'}]\n${chunk.content}`)
    .join('\n\n');

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: 'You are an internal college helpdesk assistant. Answer only from the supplied context. If the context is insufficient, say: I do not have enough information in the uploaded college data.'
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
      return localAnswer({ question, chunks });
    }
    throw error;
  }
}

async function generateGroqAnswer({ question, chunks }) {
  const context = chunks
    .map((chunk, index) => `[Source ${index + 1}: ${chunk.title || 'Document'}]\n${chunk.content}`)
    .join('\n\n');

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
            content: 'You are an internal college helpdesk assistant. Answer only from the supplied context. If the context is insufficient, say: I do not have enough information in the uploaded college data.'
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
      return localAnswer({ question, chunks });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadToVectorStore() {
  return { openai_file_id: null, vector_store_id: process.env.OPENAI_VECTOR_STORE_ID || null };
}
