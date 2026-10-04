import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      // researcher: submits papers, asks questions
      // doctor: reviews submissions, votes approve/reject
      // admin: manages users, oversees everything
      type: String,
      enum: ["researcher", "doctor", "admin"],
      default: "researcher",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
