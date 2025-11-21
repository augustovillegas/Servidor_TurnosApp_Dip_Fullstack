import mongoose from "mongoose";

const MODULE_NAME_VALUES = [
  "HTML-CSS",
  "JAVASCRIPT",
  "BACKEND - NODE JS",
  "FRONTEND - REACT",
];

const ROLE_TYPE_VALUES = ["alumno", "profesor", "superadmin"];

const STATUS_USER = ["Pendiente", "Aprobado", "Rechazado"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nombre: {
      type: String,
      trim: true,
      default: null,
    },
    apellido: {
      type: String,
      trim: true,
      default: null,
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
      alias: "module",
    },
    moduloSlug: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    moduleCode: {
      type: Number,
      min: 1,
      default: null,
    },
    role: {
      type: String,
      enum: ROLE_TYPE_VALUES,
      required: true,
    },
    cohorte: {
      type: Number,
      required: true,
      alias: "cohort",
    },
    cohortLabel: {
      type: String,
      trim: true,
      default: "",
    },
    isRecursante: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: STATUS_USER,
      default: "Pendiente",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const User = mongoose.model("User", userSchema);
