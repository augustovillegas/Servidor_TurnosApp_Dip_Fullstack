import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["alumno", "profesor", "superadmin"],
    default: "alumno",
  },
  cohort: {
    type: Number,
    required: true,
  },
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
