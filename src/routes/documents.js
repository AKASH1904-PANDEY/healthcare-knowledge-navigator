import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import Document from "../models/Document.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Every route below requires a valid logged-in user. Applied once here
// at the router level rather than per-route, so no route can accidentally
// be left unprotected as more routes get added later.
router.use(requireAuth);

// multer with memory storage — we don't need to save the raw PDF file
// to disk, we just need to extract its text and store that in Mongo.
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents/upload
// Accepts a PDF file + title/source fields, extracts text, saves to DB.
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { title, source, sourceUrl } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!title || !source) {
      return res.status(400).json({ error: "title and source are required" });
    }

    // pdf-parse reads the PDF buffer and gives us plain text back
    const parsed = await pdfParse(req.file.buffer);

    const doc = await Document.create({
      title,
      source,
      sourceUrl,
      rawText: parsed.text,
      status: "uploaded",
    });

    res.status(201).json({
      id: doc._id,
      title: doc.title,
      textLength: parsed.text.length,
      status: doc.status,
    });
  } catch (err) {
    console.error("Upload failed:", err.message);
    res.status(500).json({ error: "Failed to process document" });
  }
});

// GET /api/documents
// Lists all ingested documents (without the full rawText, to keep it light)
router.get("/", async (req, res) => {
  const docs = await Document.find().select("-rawText").sort({ createdAt: -1 });
  res.json(docs);
});

// GET /api/documents/:id
// Fetch a single document including its full text
router.get("/:id", async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.json(doc);
});

export default router;
