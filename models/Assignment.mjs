import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  module: {
    type: Number,
    required: true,
    index: true,
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
}, { timestamps: true });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
