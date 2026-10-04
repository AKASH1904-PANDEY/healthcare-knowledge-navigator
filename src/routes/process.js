import express from "express";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import { chunkText } from "../utils/chunker.js";
import { embedChunks, embedText } from "../utils/embeddings.js";
import { cosineSimilarity } from "../utils/similarity.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// POST /api/process/:documentId
// Takes a document already saved in Phase 0, splits its rawText into
// chunks, generates an embedding for each chunk, and saves them.
router.post("/:documentId", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // 1. Split the raw text into chunks
    const textChunks = chunkText(doc.rawText);

    if (textChunks.length === 0) {
      return res.status(400).json({ error: "No text found to chunk" });
    }

    // 2. Generate an embedding for each chunk
    // (First call downloads the model — can take 10-20s the very first
    // time only; cached after that.)
    const vectors = await embedChunks(textChunks);

    // 3. Remove any old chunks for this document (in case of re-processing)
    await Chunk.deleteMany({ documentId: doc._id });

    // 4. Save the new chunks
    const chunkDocs = textChunks.map((text, i) => ({
      documentId: doc._id,
      text,
      chunkIndex: i,
      embedding: vectors[i],
    }));
    await Chunk.insertMany(chunkDocs);

    // 5. Update document status
    doc.status = "embedded";
    await doc.save();

    res.json({
      documentId: doc._id,
      chunksCreated: chunkDocs.length,
      status: doc.status,
    });
  } catch (err) {
    console.error("Processing failed:", err.message);
    res.status(500).json({ error: "Failed to process document" });
  }
});

// GET /api/process/search?q=your+question
// Embeds the query, compares it against every stored chunk's embedding,
// and returns the top matches ranked by similarity.
// (Brute-force — fine at capstone scale. This is the piece you'd swap
// for a real vector DB's search call if the corpus grew much larger.)
router.get("/search/query", async (req, res) => {
  try {
    const { q, topK = 5 } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query param 'q'" });

    const queryVector = await embedText(q);

    const allChunks = await Chunk.find().populate("documentId", "title source");

    const scored = allChunks.map((chunk) => ({
      chunkId: chunk._id,
      text: chunk.text,
      document: chunk.documentId
        ? { id: chunk.documentId._id, title: chunk.documentId.title, source: chunk.documentId.source }
        : null,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    res.json(scored.slice(0, Number(topK)));
  } catch (err) {
    console.error("Search failed:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
