import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import Submission from "../models/Submission.js";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import User from "../models/User.js";
import { chunkText } from "../utils/chunker.js";
import { embedChunks } from "../utils/embeddings.js";
import { generateFlagsReport } from "../utils/aiFlagsReport.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });

// How many doctors get auto-assigned to each new submission, and how
// many approvals are needed for the submission to pass — see Phase 5
// planning ("assign 2-3 doctors... majority approval needed").
const DOCTORS_PER_SUBMISSION = 3;
const APPROVALS_NEEDED = 2;

// POST /api/submissions — researcher submits a paper (PDF)
router.post(
  "/",
  requireRole("researcher", "admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      const { title } = req.body;
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (!title) return res.status(400).json({ error: "title is required" });

      const parsed = await pdfParse(req.file.buffer);
      const textChunks = chunkText(parsed.text);

      if (textChunks.length === 0) {
        return res.status(400).json({ error: "No text found to process" });
      }

      // Auto-assign doctors: pick up to DOCTORS_PER_SUBMISSION doctors
      // at random from the pool. (Simple assignment strategy — fine for
      // a capstone; a real system might balance load or specialty.)
      const doctors = await User.aggregate([
        { $match: { role: "doctor" } },
        { $sample: { size: DOCTORS_PER_SUBMISSION } },
      ]);

      const submission = await Submission.create({
        title,
        submittedBy: req.user.userId,
        rawText: parsed.text,
        textChunks,
        assignedDoctors: doctors.map((d) => d._id),
        status: doctors.length > 0 ? "under_review" : "pending_review",
      });

      // Generate the AI advisory report asynchronously-in-line — for a
      // capstone this is fine to await directly; a production system
      // might queue this instead so the upload response returns faster.
      try {
        const report = await generateFlagsReport(textChunks);
        submission.aiFlagsReport = report;
        await submission.save();
      } catch (err) {
        // AI report failing should never block the submission itself —
        // doctors can still review without it.
        console.error("AI flags report failed:", err.message);
      }

      res.status(201).json({
        id: submission._id,
        title: submission.title,
        status: submission.status,
        assignedDoctors: submission.assignedDoctors,
        aiFlagsReport: submission.aiFlagsReport,
      });
    } catch (err) {
      console.error("Submission failed:", err.message);
      res.status(500).json({ error: "Failed to process submission" });
    }
  }
);

// GET /api/submissions — list submissions.
// Researchers see their own; doctors see ones assigned to them; admins see all.
router.get("/", async (req, res) => {
  const { role, userId } = req.user;

  let filter = {};
  if (role === "researcher") filter = { submittedBy: userId };
  else if (role === "doctor") filter = { assignedDoctors: userId };
  // admin: no filter, sees everything

  const submissions = await Submission.find(filter)
    .select("-rawText -textChunks")
    .sort({ createdAt: -1 });

  res.json(submissions);
});

// GET /api/submissions/:id — full detail, including AI report and reviews so far
router.get("/:id", async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate(
    "submittedBy assignedDoctors reviews.doctorId",
    "name email role"
  );
  if (!submission) return res.status(404).json({ error: "Submission not found" });
  res.json(submission);
});

// POST /api/submissions/:id/review — a doctor votes approve/reject,
// with a required comment and optional chunk-level flags.
router.post("/:id/review", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const { decision, comment, flags } = req.body;

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
    }
    if (!comment) {
      return res.status(400).json({ error: "comment is required" });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const isAssigned = submission.assignedDoctors.some(
      (id) => id.toString() === req.user.userId
    );
    if (!isAssigned && req.user.role !== "admin") {
      return res.status(403).json({ error: "You are not assigned to review this submission" });
    }

    // Replace this doctor's existing vote if they already reviewed, so
    // a doctor can change their mind rather than double-voting.
    submission.reviews = submission.reviews.filter(
      (r) => r.doctorId.toString() !== req.user.userId
    );
    submission.reviews.push({
      doctorId: req.user.userId,
      decision,
      comment,
      flags: Array.isArray(flags) ? flags : [],
    });

    // Decision rule: APPROVALS_NEEDED approve votes → approved.
    // A reject vote from a majority of assigned doctors → rejected.
    // Otherwise stays under_review until enough votes come in.
    const approveCount = submission.reviews.filter((r) => r.decision === "approve").length;
    const rejectCount = submission.reviews.filter((r) => r.decision === "reject").length;
    const totalAssigned = submission.assignedDoctors.length || 1;

    if (approveCount >= APPROVALS_NEEDED) {
      submission.status = "approved";
    } else if (rejectCount > totalAssigned / 2) {
      submission.status = "rejected";
    } else {
      submission.status = "under_review";
    }

    await submission.save();

    // On approval, promote into the main searchable corpus — chunk +
    // embed it the same way Phase 1 processes approved documents, so
    // it becomes retrievable through /api/ask immediately.
    if (submission.status === "approved" && !submission.promotedDocumentId) {
      const doc = await Document.create({
        title: submission.title,
        source: "Doctor-reviewed submission",
        rawText: submission.rawText,
        status: "uploaded",
      });

      const vectors = await embedChunks(submission.textChunks);
      const chunkDocs = submission.textChunks.map((text, i) => ({
        documentId: doc._id,
        text,
        chunkIndex: i,
        embedding: vectors[i],
      }));
      await Chunk.insertMany(chunkDocs);

      doc.status = "embedded";
      await doc.save();

      submission.promotedDocumentId = doc._id;
      await submission.save();
    }

    res.json({
      id: submission._id,
      status: submission.status,
      approveCount,
      rejectCount,
      promotedDocumentId: submission.promotedDocumentId,
    });
  } catch (err) {
    console.error("Review failed:", err.message);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

export default router;
