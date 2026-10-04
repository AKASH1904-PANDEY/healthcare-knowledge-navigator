// Combines two retrieval signals into one ranked list of chunks:
//
// 1. Vector search (embeddings) — good at matching MEANING. "what helps
//    with high blood sugar" can match a chunk about "glucose management"
//    even with no shared words.
// 2. Keyword search (MongoDB text index) — good at matching EXACT TERMS.
//    Drug names, dosages, and specific codes can score low on pure
//    embedding similarity even when the exact word is right there in
//    the text, since embeddings weigh overall meaning more than exact
//    wording.
//
// A chunk that scores well on EITHER signal gets a fair chance to
// surface, rather than relying on embeddings alone. See Phase 6 notes.

import Chunk from "../models/Chunk.js";
import { embedText } from "./embeddings.js";
import { cosineSimilarity } from "./similarity.js";

// Runs both searches and merges them into one array of
// { chunkId, text, document, vectorScore, keywordScore, score }
// sorted by the combined score, highest first.
export async function hybridSearch(query, { topK = 5 } = {}) {
  const queryVector = await embedText(query);

  // --- Vector search: score every chunk against the query embedding ---
  const allChunks = await Chunk.find().populate("documentId", "title source");
  const vectorScores = new Map();
  for (const chunk of allChunks) {
    vectorScores.set(
      chunk._id.toString(),
      cosineSimilarity(queryVector, chunk.embedding)
    );
  }

  // --- Keyword search: MongoDB's $text search + relevance score ---
  // A failed/empty text search (e.g. query is only stopwords) shouldn't
  // break retrieval — just fall back to vector-only in that case.
  let keywordResults = [];
  try {
    keywordResults = await Chunk.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(20);
  } catch {
    keywordResults = [];
  }

  const keywordScores = new Map();
  let maxKeywordScore = 0;
  for (const chunk of keywordResults) {
    const raw = chunk.get("score", null, { getters: false }) ?? 0;
    keywordScores.set(chunk._id.toString(), raw);
    if (raw > maxKeywordScore) maxKeywordScore = raw;
  }

  // Normalize keyword scores to a 0-1 range so they're comparable to
  // cosine similarity (which is already roughly 0-1 for this model).
  // Without this, MongoDB's unbounded text scores would dominate.
  function normalizedKeywordScore(chunkId) {
    if (maxKeywordScore === 0) return 0;
    return (keywordScores.get(chunkId) ?? 0) / maxKeywordScore;
  }

  // --- Merge: combined score is a weighted sum, vector-leaning since
  // it's the stronger general-purpose signal, with keyword boosting
  // exact-term matches that vector search alone might rank too low. ---
  const VECTOR_WEIGHT = 0.7;
  const KEYWORD_WEIGHT = 0.3;

  const merged = allChunks.map((chunk) => {
    const id = chunk._id.toString();
    const vectorScore = vectorScores.get(id) ?? 0;
    const keywordScore = normalizedKeywordScore(id);
    return {
      chunkId: chunk._id,
      text: chunk.text,
      document: chunk.documentId
        ? { id: chunk.documentId._id, title: chunk.documentId.title }
        : null,
      vectorScore,
      keywordScore,
      score: vectorScore * VECTOR_WEIGHT + keywordScore * KEYWORD_WEIGHT,
    };
  });

  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, topK);
}
