// Thin wrapper around fetch for talking to the Express backend.
// Requests go to /api/... which Vite's dev proxy forwards to
// http://localhost:8080 (see vite.config.js) — so no CORS setup needed
// and no hardcoded backend URL scattered through the app.

const TOKEN_KEY = "healthcare_nav_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Core request helper. Throws an Error with the backend's message on
// any non-2xx response, so callers can just try/catch.
async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`/api${path}`, { ...options, headers });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // no JSON body — fine for some responses
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return data;
}

export const api = {
  signup: (body) => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),

  ask: (question) => request(`/ask?q=${encodeURIComponent(question)}`),

  listDocuments: () => request("/documents"),

  submitPaper: (formData) => request("/submissions", { method: "POST", body: formData }),
  listSubmissions: () => request("/submissions"),
  getSubmission: (id) => request(`/submissions/${id}`),
  reviewSubmission: (id, body) =>
    request(`/submissions/${id}/review`, { method: "POST", body: JSON.stringify(body) }),
};
