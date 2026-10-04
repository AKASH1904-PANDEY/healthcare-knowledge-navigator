// Golden-set evaluation: runs a fixed list of question/expected-answer
// pairs against /api/ask and checks whether the system behaves
// correctly — either retrieving relevant content, or correctly
// refusing on out-of-corpus questions. This gives you an actual
// accuracy number instead of "I tried a few questions and they
// worked" for your report/defense.
//
// Usage:
//   node scripts/evalGoldenSet.js <your-auth-token>

const BASE_URL = "http://127.0.0.1:8080";

// Each entry is either:
// - { question, expectKeywords } — expects a real answer that mentions
//   at least one of these keywords somewhere in the answer or sources
// - { question, expectOutOfCorpus: true } — expects the system to
//   refuse ("not sufficient information") rather than guess
//
// Built from topics confirmed present in the corpus during earlier
// manual testing — not guesses about content we haven't verified.
const GOLDEN_SET = [
  {
    question: "What is diabetes?",
    expectKeywords: ["insulin", "pancreas", "blood"],
  },
  {
    question: "What are the two basic types of diabetes?",
    expectKeywords: ["type 1", "type 2"],
  },
  {
    question: "What lifestyle interventions help prevent type 2 diabetes?",
    expectKeywords: ["diet", "physical activity", "exercise", "lifestyle", "weight"],
  },
  {
    question: "What physical activity is recommended for people with type 2 diabetes?",
    expectKeywords: ["aerobic", "exercise", "activity", "minutes"],
  },
  {
    question: "How does tobacco use affect the risk of type 2 diabetes?",
    expectKeywords: ["tobacco", "smoking", "nicotine", "insulin resistance"],
  },
  {
    question: "What is TADDS used for?",
    expectKeywords: ["retinopathy", "diabetic", "assessment"],
  },
  {
    question: "What is the global prevalence of diabetes?",
    expectKeywords: ["million", "prevalence", "deaths", "worldwide"],
  },
  // Out-of-corpus controls — these topics should NOT be in an 11-doc
  // diabetes-focused corpus, so the system should refuse rather than
  // answer from general knowledge.
  {
    question: "What is the standard treatment for malaria?",
    expectOutOfCorpus: true,
  },
  {
    question: "What are the symptoms of appendicitis?",
    expectOutOfCorpus: true,
  },
];

const REFUSAL_PHRASE = "no sufficiently relevant information";

async function askQuestion(token, question) {
  const response = await fetch(
    `${BASE_URL}/api/ask?q=${encodeURIComponent(question)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function checkResult(entry, result) {
  const answerLower = (result.answer || "").toLowerCase();
  const sourcesText = (result.sources || [])
    .map((s) => `${s.documentTitle} ${s.text}`)
    .join(" ")
    .toLowerCase();
  const isRefusal = answerLower.includes(REFUSAL_PHRASE);

  if (entry.expectOutOfCorpus) {
    return {
      pass: isRefusal,
      detail: isRefusal ? "correctly refused" : "should have refused but answered",
    };
  }

  if (isRefusal) {
    return { pass: false, detail: "refused but should have found an answer" };
  }

  const matched = entry.expectKeywords.filter(
    (kw) => answerLower.includes(kw.toLowerCase()) || sourcesText.includes(kw.toLowerCase())
  );

  return {
    pass: matched.length > 0,
    detail:
      matched.length > 0
        ? `matched keyword(s): ${matched.join(", ")}`
        : `none of [${entry.expectKeywords.join(", ")}] found in answer or sources`,
  };
}

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("Usage: node scripts/evalGoldenSet.js <your-auth-token>");
    process.exit(1);
  }

  console.log(`Running ${GOLDEN_SET.length} golden-set questions...\n`);

  let passed = 0;
  const rows = [];

  for (const entry of GOLDEN_SET) {
    try {
      const result = await askQuestion(token, entry.question);
      const { pass, detail } = checkResult(entry, result);
      if (pass) passed++;

      console.log(`${pass ? "PASS" : "FAIL"}  "${entry.question}"`);
      console.log(`      confidence: ${result.confidence ?? "n/a"} | ${detail}`); if (!pass) { console.log(`      answer: ${result.answer}`); } console.log("");

      rows.push({ question: entry.question, pass, confidence: result.confidence, detail });
    } catch (err) {
      console.log(`ERROR "${entry.question}" — ${err.message}\n`);
      rows.push({ question: entry.question, pass: false, detail: err.message });
    }
  }

  const accuracy = ((passed / GOLDEN_SET.length) * 100).toFixed(1);
  console.log("----------------------------------------");
  console.log(`Result: ${passed}/${GOLDEN_SET.length} passed (${accuracy}% accuracy)`);
}

main();
