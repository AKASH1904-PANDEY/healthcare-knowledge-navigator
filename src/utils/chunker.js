// Splits a document's raw text into chunks small enough to embed well
// and specific enough to retrieve accurately.
//
// Strategy: split on paragraph breaks first (respects natural document
// structure), then merge small paragraphs together up to maxChars, and
// split any single paragraph that's still too long.
//
// This is a simple, transparent version — good enough for a capstone,
// and easy to explain in your report/defense.

const MAX_CHARS = 800; // roughly 150-200 words per chunk
const MIN_CHARS = 200; // avoid tiny, low-context chunks

export function chunkText(rawText) {
  // 1. Normalize whitespace, split into paragraphs on blank lines
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const chunks = [];
  let buffer = "";

  for (const para of paragraphs) {
    // If a single paragraph is already too long, split it by sentence
    if (para.length > MAX_CHARS) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((buffer + " " + sentence).trim().length > MAX_CHARS) {
          if (buffer.trim().length >= MIN_CHARS || chunks.length === 0) {
            chunks.push(buffer.trim());
            buffer = sentence;
          } else {
            buffer += " " + sentence;
          }
        } else {
          buffer = (buffer + " " + sentence).trim();
        }
      }
      continue;
    }

    // Normal case: try to add this paragraph to the current buffer
    if ((buffer + " " + para).trim().length > MAX_CHARS) {
      chunks.push(buffer.trim());
      buffer = para;
    } else {
      buffer = (buffer + " " + para).trim();
    }
  }

  if (buffer.trim().length > 0) {
    chunks.push(buffer.trim());
  }

  return chunks;
}
