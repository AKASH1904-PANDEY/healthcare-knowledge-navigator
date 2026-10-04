import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    source: {
      // e.g. "WHO Guidelines", "PubMed", "CDC Protocol"
      type: String,
      required: true,
    },
    sourceUrl: {
      type: String,
    },
    publishedDate: {
      type: Date,
    },
    rawText: {
      // full extracted text, kept for re-chunking later if needed
      type: String,
      required: true,
    },
    status: {
      // tracks ingestion pipeline progress
      type: String,
      enum: ["uploaded", "chunked", "embedded", "failed"],
      default: "uploaded",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
