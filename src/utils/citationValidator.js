// Checks the LLM's answer for citation markers like [1], [2] and confirms
// every number it used actually corresponds to a chunk we sent it.
// If the model cites a number that doesn't exist (e.g. [6] when only 5
// chunks were sent), that's a red flag — the answer may be unreliable.
export function validateCitations(answerText, chunkCount) {
  const citedNumbers = [...answerText.matchAll(/\[(\d+)\]/g)].map((m) =>
    Number(m[1])
  );

  const uniqueCited = [...new Set(citedNumbers)];
  const invalidCitations = uniqueCited.filter(
    (n) => n < 1 || n > chunkCount
  );

  return {
    citedChunkNumbers: uniqueCited,
    hasInvalidCitations: invalidCitations.length > 0,
    invalidCitations,
    hasCitations: uniqueCited.length > 0,
  };
}
