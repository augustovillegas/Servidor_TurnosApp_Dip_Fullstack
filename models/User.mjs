import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  nombre: {
    type: String,
    trim: true,
  },
  apellido: {
    type: String,
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
  modulo: {
    type: String,
    trim: true,
  },
  moduloSlug: {
    type: String,
    trim: true,
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
  cohortLabel: {
    type: String,
    trim: true,
  },
  isRecursante: {
    type: Boolean,
    default: false,
  },
  isApproved: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["Pendiente", "Aprobado", "Rechazado"],
    default: "Pendiente",
  },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
