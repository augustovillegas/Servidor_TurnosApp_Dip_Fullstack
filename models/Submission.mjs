import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: false,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    alumnoNombre: {
      type: String,
      trim: true,
      default: "",
    },
    sprint: {
      type: Number,
      default: 1,
      min: 1,
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
    reviewStatus: {
      type: String,
      enum: ["revisar", "aprobado", "desaprobado"],
      default: "revisar",
    },
    estado: {
      type: String,
      enum: ["A revisar", "Aprobado", "Rechazado"],
      default: "A revisar",
    },
  },
  { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);



