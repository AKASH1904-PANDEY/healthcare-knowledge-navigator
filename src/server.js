import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import documentRoutes from "./routes/documents.js";
import processRoutes from "./routes/process.js";
import authRoutes from "./routes/auth.js";
import askRoutes from "./routes/ask.js";
import submissionRoutes from "./routes/submissions.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes (signup, login, /me) — unprotected, since you need to be
// able to reach these BEFORE you have a token
app.use("/api/auth", authRoutes);

// Mount document ingestion routes at /api/documents
app.use("/api/documents", documentRoutes);
app.use("/api/process", processRoutes);
app.use("/api/ask", askRoutes);
app.use("/api/submissions", submissionRoutes);

// Simple health check — useful once you deploy, to confirm the server is alive
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
