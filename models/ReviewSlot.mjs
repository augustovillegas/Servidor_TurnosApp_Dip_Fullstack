import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: false,
    },
    cohorte: {
      type: Number,
      min: 1         
    },
    modulo: {
      type: String,
      enum: ["HTML-CSS", "JAVASCRIPT", "BACKEND - NODE JS", "FRONTEND - REACT"],
      required: true
    },
    reviewNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    fecha: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,     
      trim: true,
    },
    endTime: {
      type: String,      
      trim: true,
    },
    start: {
      type: Date,
      default: null,
    },
    end: {
      type: Date,
      default: null,
    },
    sala: {
      type: Number,      
      min: 1,
    },
    zoomLink: {
      type: String,
      trim: true,
      default: "",
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
      enum: [
        "A revisar",
        "Aprobado",
        "Desaprobado"
      ],
      default: "A revisar",
    },
    estado: {
      type: String,
      enum: ["Disponible", "Solicitado", "Aprobado", "Rechazado"],
      default: "Disponible",
    },
    comentarios: {
      type: String,
      trim: true,      
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const ReviewSlot = mongoose.model("ReviewSlot", slotSchema);
