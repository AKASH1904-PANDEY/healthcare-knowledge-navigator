import mongoose from "mongoose";

// A single doctor's vote on a submission, with optional chunk-level flags.
const reviewFlagSchema = new mongoose.Schema(
  {
    chunkIndex: {
      // which chunk of the submission's text this flag is about
      // (matches the index used when the submission was chunked)
      type: Number,
      required: true,
    },
    issueType: {
      type: String,
      enum: ["factual_error", "unsupported_claim", "unclear", "contradicts_existing_guideline"],
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    decision: {
      type: String,
      enum: ["approve", "reject"],
      required: true,
    },
    comment: {
      // required overall comment, separate from any chunk-level flags
      type: String,
      required: true,
    },
    flags: [reviewFlagSchema],
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    // Chunked the same way as approved documents (Phase 1's chunker),
    // so chunk indices here line up with what doctors see and flag,
    // and so an approved submission can be embedded and merged into
    // the main corpus without re-processing.
    textChunks: [String],

    // AI-generated pass — advisory only. Never a verdict, never shown
    // as "verified" — see Phase 5 design notes on why the AI's role is
    // limited to surfacing evidence, not judging correctness.
    aiFlagsReport: {
      summary: String,
      contradictions: [
        {
          chunkIndex: Number,
          conflictingSourceTitle: String,
          note: String,
        },
      ],
      generatedAt: Date,
    },

    assignedDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reviews: [reviewSchema],

    status: {
      type: String,
      enum: ["pending_review", "under_review", "approved", "rejected"],
      default: "pending_review",
    },

    // Set once the submission is approved and merged into the main
    // Document + Chunk collections (Phase 1's corpus).
    promotedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
