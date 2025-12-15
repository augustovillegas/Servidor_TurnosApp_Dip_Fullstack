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
    moduleCode: {
      type: Number,
      min: 1      
    },
    role: {
      type: String,
      enum: ROLE_TYPE_VALUES,
      required: true,      
    },
    cohorte: {
      type: Number,
      required: true     
    },
    status: {
      type: String,
      enum: STATUS_USER,
      default: "Pendiente",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);
export const User = mongoose.model("User", userSchema);
