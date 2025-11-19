import mongoose from "mongoose";

const MODULE_NAME_VALUES = [ "HTML-CSS", "JAVASCRIPT", "BACKEND - NODE JS",  "FRONTEND - REACT", ];

const ROLE_TYPE_VALUES = [ "alumno", "profesor", "superadmin" ];

const STATUS_USER = [ "Pendiente", "Aprobado", "Rechazado" ];

const userSchema = new mongoose.Schema(
  {
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
      enum: MODULE_NAME_VALUES,
      trim: true,
      required: true,
    },
    moduloSlug: {
      type: String,
      enum: MODULE_NAME_VALUES,
      trim: true,
    },
    role: {
      type: String,
      enum: ROLE_TYPE_VALUES,
      required: true,
    },
    cohorte: {
      type: Number,
      required: true,
    },
    isRecursante: {
      type: Boolean,
      default: false,
    },
    isApproved: { type: Boolean, default: false },
    status: {
      type: String,
      enum: STATUS_USER,
      default: "Pendiente",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
