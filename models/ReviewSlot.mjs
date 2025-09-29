import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    cohort: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: null,
      trim: true,
    },
    endTime: {
      type: String,
      default: null,
      trim: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByProfessor: {
      type: Boolean,
      default: false,
    },
    reviewStatus: {
      type: String,
      enum: ["revisar", "aprobado", "desaprobado"],
      default: "revisar",
    },
  },
  { timestamps: true }
);

export const ReviewSlot = mongoose.model("ReviewSlot", slotSchema);
