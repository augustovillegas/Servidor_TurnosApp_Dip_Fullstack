import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    githubLink: {
      type: String,
      required: true,
      trim: true,
    },
    renderLink: {
      type: String,
      default: null,
    },
    comentarios: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);


