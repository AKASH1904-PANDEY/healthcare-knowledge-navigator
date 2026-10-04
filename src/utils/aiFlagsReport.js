// Generates the AI's advisory pass on a new submission, as designed in
// Phase 5 planning: a plain-language summary for reviewers, plus any
// chunks whose content seems to CONTRADICT something already in the
// approved corpus. This NEVER outputs approve/reject — that decision
// stays entirely with the assigned doctors. See Submission model notes.

import Chunk from "../models/Chunk.js";
import { embedText } from "./embeddings.js";
import { cosineSimilarity } from "./similarity.js";
import { callGemini } from "./gemini.js";

// Below this similarity, a chunk isn't semantically close enough to any
// existing guideline for a "contradiction" check to be meaningful —
// unrelated topics aren't contradictions, they're just unrelated.
const RELEVANCE_THRESHOLD = 0.45;

// For one submission chunk, find the most similar existing (approved)
// chunk, and ask Gemini a narrow, constrained question: does this new
// text conflict with that existing guideline, or not? The prompt
// deliberately asks for a judgment about CONSISTENCY, not correctness —
// the model is never asked "is this true," only "does this disagree
// with what's already approved."
async function checkChunkAgainstCorpus(chunkText, chunkIndex) {
  const vector = await embedText(chunkText);
  const existingChunks = await Chunk.find().populate("documentId", "title");

  if (existingChunks.length === 0) return null;

  const scored = existingChunks
    .map((c) => ({
      text: c.text,
      title: c.documentId?.title || "unknown",
      score: cosineSimilarity(vector, c.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  const bestMatch = scored[0];
  if (!bestMatch || bestMatch.score < RELEVANCE_THRESHOLD) return null;

  const prompt = `You are checking a new research excerpt against an existing approved guideline for CONSISTENCY only. Do not judge which one is correct.

Existing approved guideline excerpt:
"${bestMatch.text}"

New submitted excerpt:
"${chunkText}"

Does the new excerpt appear to CONTRADICT the existing guideline (e.g. different dosage, opposite recommendation, conflicting claim)? Answer with exactly one word first — YES or NO — then a one-sentence explanation.`;

  // Direct Gemini call with this comparison prompt — not routed through
  // generateAnswer, since that builds a different (RAG excerpt-citation)
  // prompt shape that doesn't fit this yes/no consistency check.
  const response = await callGemini(prompt).catch(() => null);

  if (!response) return null;

  const isContradiction = /^YES/i.test(response.trim());
  if (!isContradiction) return null;

  return {
    chunkIndex,
    conflictingSourceTitle: bestMatch.title,
    note: response.trim(),
  };
}

// Runs the check across every chunk of the submission and produces the
// report stored on the Submission document.
export async function generateFlagsReport(textChunks) {
  const contradictions = [];

  for (let i = 0; i < textChunks.length; i++) {
    const result = await checkChunkAgainstCorpus(textChunks[i], i);
    if (result) contradictions.push(result);
  }

  const summary =
    contradictions.length === 0
      ? "No potential contradictions with the existing approved corpus were detected. This is not a verification of accuracy — reviewers should still read the submission in full."
      : `${contradictions.length} chunk(s) appear to conflict with existing approved guidelines. Reviewers should examine these closely — this is an advisory flag, not a correctness judgment.`;

  return {
    summary,
    contradictions,
    generatedAt: new Date(),
  };
}
