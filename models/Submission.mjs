import mongoose from "mongoose";

const REVIEW_STATUS_VALUES = [
  "Pendiente",
  "A revisar",
  "Aprobado",
  "Desaprobado",
  "Rechazado",
];

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
      default: "-",
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
      default: "-",
    },
    comentarios: {
      type: String,
      default: "-",
      trim: true,
    },
    reviewStatus: {
      type: String,
      enum: REVIEW_STATUS_VALUES,
      default: "A revisar",
      required: true,
    }, 
  },
  { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);
