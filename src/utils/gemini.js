// Wraps calls to Google's Gemini API for the "generation" step of RAG.
// Takes retrieved chunks + a question, returns a synthesized answer that
// cites which chunks it used. Uses fetch directly (no SDK) so it's easy
// to see exactly what's being sent.

// Primary model, with a fallback if it's overloaded (503). Both are
// current, non-deprecated models as of late 2026.
const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

function urlFor(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Builds the strict, source-grounded prompt described in Phase 3 planning:
// - answer ONLY from the excerpts
// - say so explicitly if the excerpts don't have enough info
// - cite which excerpt(s) were used
function buildPrompt(question, chunks) {
  const excerpts = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (source: ${c.document?.title || "unknown"})\n${c.text}`
    )
    .join("\n\n");

  return `You are a medical knowledge assistant. Answer the question using ONLY the excerpts below. Do not use any outside knowledge.

Rules:
- Every claim in your answer must be traceable to a specific excerpt number, e.g. [1].
- If the excerpts do not contain enough information to answer the question, say so explicitly instead of guessing.
- Do not speculate or fill gaps with general medical knowledge not present in the excerpts.
- Write in plain prose using short paragraphs. Do not use Markdown formatting: no asterisks, no bold, no bullet symbols, no headings.

Excerpts:
${excerpts}

Question: ${question}

Answer (with inline citation numbers like [1], [2]):`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pulls Google's suggested wait time out of a 429 error body, e.g.
// { "retryDelay": "23s" } nested in details. Falls back to a sane
// default if the body doesn't parse the way we expect — the exact
// shape of Google's error responses isn't something to depend on too
// strictly.
function extractRetryDelayMs(errText, fallbackMs = 20000) {
  try {
    const parsed = JSON.parse(errText);
    const retryInfo = parsed?.error?.details?.find(
      (d) => d["@type"]?.includes("RetryInfo")
    );
    const match = retryInfo?.retryDelay?.match(/(\d+(\.\d+)?)s/);
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000; // +1s buffer
  } catch {
    // body wasn't JSON, or didn't have the expected shape — use fallback
  }
  return fallbackMs;
}

// One attempt against a specific model. Returns the text, or throws
// with the status code attached so the caller can decide whether to retry.
async function callModel(model, prompt) {
  const response = await fetch(`${urlFor(model)}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        // Generous cap: newer Gemini models can spend part of this budget
        // on internal reasoning, and a low cap truncates the visible answer.
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Gemini API error (${response.status}): ${errText}`);
    err.status = response.status;
    err.body = errText;
    throw err;
  }

  const data = await response.json();
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    console.warn("Gemini answer was truncated (MAX_TOKENS)");
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no text content");
  }
  return text;
}

// Calls Gemini with any raw prompt, with retry-on-overload, rate-limit
// handling, and a fallback model.
//
// - 503 (temporary overload): retry the primary model twice with short
//   backoff (500ms, 1500ms).
// - 429 (rate limit / quota exceeded): the free tier is capped at a
//   small number of requests per minute PER MODEL. Waiting out Google's
//   suggested retry delay just burns time for no benefit if the quota
//   resets per-minute and multiple calls are queued close together —
//   so instead of waiting, go straight to the fallback model, which
//   has its own separate quota bucket and a good chance of succeeding
//   immediately. Only if the fallback is ALSO rate-limited do we wait
//   out the suggested delay and try the primary once more.
// - Anything else (bad key, malformed request): fails immediately,
//   since retrying won't fix those.
export async function callGemini(prompt) {
  const delays = [500, 1500]; // ms between retries on 503

  let lastError;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await callModel(PRIMARY_MODEL, prompt);
    } catch (err) {
      lastError = err;
      if (err.status === 429) break; // rate-limited — skip straight to fallback below
      if (err.status !== 503) throw err; // don't retry non-overload errors
      if (attempt < delays.length) await sleep(delays[attempt]);
    }
  }

  // Try the fallback model — separate quota bucket, likely to succeed
  // even if the primary model's per-minute limit is exhausted.
  try {
    return await callModel(FALLBACK_MODEL, prompt);
  } catch (fallbackErr) {
    // Both models failed. If either failure was a rate limit, wait out
    // the suggested delay and give the primary one last try, rather
    // than failing the request outright.
    const rateLimited = lastError.status === 429 || fallbackErr.status === 429;
    if (rateLimited) {
      const waitMs = extractRetryDelayMs(
        fallbackErr.status === 429 ? fallbackErr.body : lastError.body
      );
      console.warn(`Both models rate-limited — waiting ${waitMs}ms before one final retry`);
      await sleep(waitMs);
      return callModel(PRIMARY_MODEL, prompt);
    }
    throw lastError.status === 503 ? lastError : fallbackErr;
  }
}

// Calls Gemini with the constrained RAG prompt. temperature is kept low
// (near-deterministic) since this is a factual retrieval task, not a
// creative one — see Phase 3 hallucination-reduction notes.
export async function generateAnswer(question, chunks) {
  const prompt = buildPrompt(question, chunks);
  return callGemini(prompt);
}
