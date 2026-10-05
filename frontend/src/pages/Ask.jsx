import { useState } from "react";
import { api } from "../api/client";
import { HeroArt } from "../components/Illustrations";

// Splits the answer text on citation markers like [1], [2] and renders
// each marker as a small superscript link jumping to its footnote below
// — treating citations the way a journal article would, rather than as
// chat-style inline chips.
// Safety net: even with a plain-prose prompt, models occasionally emit
// Markdown. Strip bold markers and turn "* " bullets into real bullets so
// raw asterisks never reach the screen.
function cleanMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^\s*[*-]\s+/gm, "• ");
}

function AnswerText({ text }) {
  const parts = cleanMarkdown(text).split(/(\[\d+\])/g);
  return (
    <p className="whitespace-pre-line text-lg leading-relaxed text-ink">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={i}>{part}</span>;
        const num = match[1];
        return (
          <a
            key={i}
            href={`#source-${num}`}
            className="ml-0.5 align-super text-xs font-medium text-teal no-underline hover:text-teal-deep"
          >
            [{num}]
          </a>
        );
      })}
    </p>
  );
}

const CONFIDENCE_STYLE = {
  high: { label: "High confidence", color: "text-teal-deep", dot: "bg-teal", bg: "bg-teal/10", bars: 3 },
  medium: { label: "Medium confidence", color: "text-amber", dot: "bg-amber", bg: "bg-amber/10", bars: 2 },
  low: { label: "Low confidence", color: "text-slate", dot: "bg-slate", bg: "bg-slate/10", bars: 1 },
};

const SUGGESTIONS = [
  "First-line treatment for type 2 diabetes",
  "Recommended blood pressure targets in adults",
  "Antibiotic options for community-acquired pneumonia",
];

function AnswerSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card" aria-busy="true" aria-label="Searching the corpus">
      <div className="skeleton mb-5 h-5 w-40 rounded-full" />
      <div className="space-y-3">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-[92%] rounded" />
        <div className="skeleton h-4 w-[96%] rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function Ask() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(q) {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.ask(q);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    run(question);
  }

  const confidence = result ? CONFIDENCE_STYLE[result.confidence] : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <section className="mb-10 grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-tint px-3 py-1 text-xs font-medium text-teal-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Doctor-reviewed sources only
          </span>
          <h1 className="mb-3 font-serif text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
            Ask a clinical question
          </h1>
          <p className="max-w-md text-slate">
            Answers are generated only from approved guidelines and research in
            the corpus, with citations to the source.
          </p>
        </div>
        <HeroArt className="mx-auto hidden w-full max-w-[340px] md:block" />
      </section>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-white p-2 shadow-card focus-within:border-teal/50 focus-within:ring-4 focus-within:ring-teal/10 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 pl-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5c6b73" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label="Clinical question"
            placeholder="e.g. What is the recommended treatment for…"
            className="w-full bg-transparent py-3 text-ink outline-none placeholder:text-slate/70"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-teal px-7 py-3 font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-60"
        >
          {loading ? "Searching…" : "Ask"}
        </button>
      </form>

      {!result && !loading && (
        <div className="mb-12 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate">Try:</span>
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { setQuestion(q); run(q); }}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-teal hover:text-teal-deep"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && <AnswerSkeleton />}

      {error && (
        <p className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-amber" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="rise rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${confidence.bg} ${confidence.color}`}>
              <span className="flex items-end gap-0.5" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`w-1 rounded-sm ${n <= confidence.bars ? confidence.dot : "bg-current opacity-20"}`} style={{ height: 4 + n * 3 }} />
                ))}
              </span>
              {confidence.label}
            </span>
            {result.topScore != null && (
              <span className="text-xs text-slate">
                retrieval score {result.topScore.toFixed(2)}
              </span>
            )}
          </div>

          <AnswerText text={result.answer} />

          {result.sources?.length > 0 && (
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-wider text-slate">
                Sources
              </h2>
              <ol className="space-y-3">
                {result.sources.map((source) => (
                  <li
                    key={source.number}
                    id={`source-${source.number}`}
                    className="rounded-xl bg-paper p-4 text-sm text-slate target:ring-2 target:ring-teal/40"
                  >
                    <span className="mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded bg-teal-tint px-1 text-xs font-semibold text-teal-deep">{source.number}</span>{" "}
                    <span className="font-medium text-ink">{source.documentTitle}</span>
                    <p className="mt-1 text-xs leading-relaxed text-slate">
                      {source.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.citationCheck?.hasInvalidCitations && (
            <p className="mt-6 text-xs text-amber">
              Note: this answer referenced a source number that wasn't
              actually provided — treat it with extra caution.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
