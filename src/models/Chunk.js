import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      // links this chunk back to its parent Document
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    chunkIndex: {
      // position of this chunk within the source document (0, 1, 2...)
      type: Number,
      required: true,
    },
    embedding: {
      // 384-length vector from the all-MiniLM-L6-v2 model.
      // Stored directly in MongoDB — fine at capstone scale (hundreds of
      // chunks). If the corpus grows much larger, this is the field
      // you'd migrate to a dedicated vector DB (pgvector/Pinecone)
      // instead of brute-force comparing in JS.
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

// Text index for keyword search — the "keyword" half of hybrid search.
// Vector search (Phase 1) is good at meaning; this is good at exact terms
// (drug names, dosages, specific codes) that embeddings can sometimes miss.
chunkSchema.index({ text: "text" });

export default mongoose.model("Chunk", chunkSchema);
