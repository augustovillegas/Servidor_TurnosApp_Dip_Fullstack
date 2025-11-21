import mongoose from "mongoose";


const MODULE_NAME_VALUES = [
  "HTML-CSS",
  "JAVASCRIPT",
  "BACKEND - NODE JS",
  "FRONTEND - REACT",
];

const assignmentSchema = new mongoose.Schema(
  {
    modulo: {
      type: String,
      enum: MODULE_NAME_VALUES,      
      trim: true,
      required: true,
    },  
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cohorte: {
      type: Number,
      required: true,      
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
