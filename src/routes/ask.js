import express from "express";
import { hybridSearch } from "../utils/hybridSearch.js";
import { generateAnswer } from "../utils/gemini.js";
import { validateCitations } from "../utils/citationValidator.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// Below this similarity score, retrieval is considered too weak to
// generate an answer from — see Phase 3 hallucination-reduction notes.
// This checks the VECTOR score specifically (not the blended hybrid
// score), since it's the more meaningful signal for "is this topic in
// the corpus at all" — a pure keyword coincidence with no semantic
// relevance shouldn't be enough to pass the gate on its own.
// Cosine similarity ranges -1 to 1; 0.35 is a conservative starting
// threshold for a small local embedding model like all-MiniLM-L6-v2.
const MIN_CONFIDENCE_THRESHOLD = 0.35;
const TOP_K = 5;

// GET /api/ask?q=your+question
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query param 'q'" });

    // 1. Retrieval — hybrid search (vector + keyword), see Phase 6 notes
    const topChunks = await hybridSearch(q, { topK: TOP_K });
    const topVectorScore = topChunks[0]?.vectorScore ?? null;

    // 2. Confidence gate — refuse to generate from weak retrieval
    // instead of letting the LLM improvise from irrelevant chunks.
    if (topChunks.length === 0 || topVectorScore < MIN_CONFIDENCE_THRESHOLD) {
      return res.json({
        answer: "No sufficiently relevant information found in the knowledge base for this question.",
        confidence: "low",
        sources: [],
        topScore: topVectorScore,
      });
    }

    // 3. Generation — Gemini synthesizes an answer from the top chunks only
    const answerText = await generateAnswer(q, topChunks);

    // 4. Citation validation — sanity-check the model didn't cite a
    // chunk number that doesn't exist
    const citationCheck = validateCitations(answerText, topChunks.length);

    // 5. Simple confidence label combining retrieval strength + citation validity
    let confidence = "medium";
    if (topVectorScore > 0.6 && citationCheck.hasCitations && !citationCheck.hasInvalidCitations) {
      confidence = "high";
    } else if (topVectorScore < 0.45 || citationCheck.hasInvalidCitations) {
      confidence = "low";
    }

    res.json({
      answer: answerText,
      confidence,
      topScore: topVectorScore,
      citationCheck,
      sources: topChunks.map((c, i) => ({
        number: i + 1,
        documentTitle: c.document?.title || "unknown",
        text: c.text,
        score: c.vectorScore,
        keywordMatch: c.keywordScore > 0,
      })),
    });
  } catch (err) {
    console.error("Ask failed:", err.message);
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

export default router;
