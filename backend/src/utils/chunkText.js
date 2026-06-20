export function chunkText(text, { maxChars = 2800, overlap = 280 } = {}) {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length <= maxChars) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) chunks.push(current);
    current = paragraph;
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars - overlap);
    }
  }

  if (current) chunks.push(current);
  return chunks.map((content, index) => ({ content, chunk_index: index }));
}
