// Generates embeddings using a small local model (all-MiniLM-L6-v2) via
// @xenova/transformers. No API key, no cost — the model file downloads
// once (~90MB) and is cached locally after that.
//
// Output: a 384-dimension vector per text chunk. Good enough for
// semantic search on a capstone-scale corpus (tens to low hundreds of
// documents). If you later want higher quality, swap this file's
// internals for an OpenAI or Cohere embeddings API call — the function
// signature (text in, array of numbers out) stays the same, so nothing
// else in the app needs to change.

import { pipeline } from "@xenova/transformers";

// The pipeline takes a few seconds to load the first time it's called.
// We cache it in this module-level variable so it only loads once per
// server process, not once per request.
let embedderPromise = null;

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embedderPromise;
}

// Generates one embedding vector for a single string.
export async function embedText(text) {
  const embedder = await getEmbedder();

  // "mean pooling" + normalize gives one fixed-size vector per input,
  // rather than one vector per token — this is the standard setup for
  // sentence/paragraph embeddings.
  const output = await embedder(text, { pooling: "mean", normalize: true });

  // output.data is a Float32Array — convert to a plain array so it's
  // easy to store in MongoDB.
  return Array.from(output.data);
}

// Generates embeddings for many chunks in sequence.
// (Kept simple/sequential for now — fine for capstone-scale document
// counts. Could be parallelized later if ingestion speed becomes an
// issue with a larger corpus.)
export async function embedChunks(texts) {
  const vectors = [];
  for (const text of texts) {
    const vector = await embedText(text);
    vectors.push(vector);
  }
  return vectors;
}
