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
      alias: "module",    
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

// Virtual consistente: moduleNumber (preferido) refleja cohorte
userSchema.virtual("moduleNumber").get(function () {
  // Prioriza moduleCode si está, luego cohorte
  return this.moduleCode || this.cohorte;
});

// Virtual derivado: moduleLabel desde moduleNumber
userSchema.virtual("moduleLabel").get(function () {
  const code = this.moduleCode || this.cohorte;
  if (!code) return null;
  const map = {
    1: "HTML-CSS",
    2: "JAVASCRIPT",
    3: "BACKEND - NODE JS",
    4: "FRONTEND - REACT",
  };
  return map[code] || this.modulo || null;
});

// Setter opcional: asignar moduleNumber actualiza cohorte y moduleCode sin romper tests.
userSchema.virtual("moduleNumber").set(function (value) {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    this.cohorte = numeric;
    this.moduleCode = numeric;
  }
});

export const User = mongoose.model("User", userSchema);
