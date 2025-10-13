import mongoose from "mongoose";
import { Submission } from "../models/Submission.mjs";

const ESTADO_TO_REVIEW_STATUS = {
  "A revisar": "revisar",
  Pendiente: "revisar",
  Aprobado: "aprobado",
  Rechazado: "desaprobado",
};

const REVIEW_STATUS_TO_ESTADO = {
  revisar: "A revisar",
  aprobado: "Aprobado",
  desaprobado: "Rechazado",
};

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
}

function normaliseString(value) {
  if (value === undefined || value === null) return "";
  return value.toString().trim();
}

function extractEstado(doc) {
  if (doc.estado && ESTADO_TO_REVIEW_STATUS[doc.estado]) {
    return doc.estado;
  }
  return REVIEW_STATUS_TO_ESTADO[doc.reviewStatus] || "A revisar";
}

function toFrontend(submission) {
  if (!submission) return null;
  const doc = submission.toObject
    ? submission.toObject({ virtuals: false })
    : submission;
  const estado = extractEstado(doc);
  return {
    id: doc._id?.toString() || doc.id,
    sprint: doc.sprint ?? doc.assignment?.module ?? null,
    githubLink: doc.githubLink,
    renderLink: doc.renderLink || "",
    comentarios: doc.comentarios || "",
    reviewStatus: estado,
    estado,
    alumno: doc.alumnoNombre || doc.student?.name || "",
    alumnoId: doc.student?._id?.toString() || doc.student?.toString() || null,
    fechaEntrega: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : null,
  };
}

function buildPayload(input = {}) {
  const payload = {};

  if ("githubLink" in input) {
    payload.githubLink = normaliseString(input.githubLink);
  }

  if ("renderLink" in input) {
    const render = normaliseString(input.renderLink);
    payload.renderLink = render.length ? render : null;
  }

  if ("comentarios" in input) {
    payload.comentarios = normaliseString(input.comentarios);
  }

  const sprintValue = coerceNumber(input.sprint);
  if (sprintValue !== undefined) {
    payload.sprint = sprintValue;
  }

  const estado = input.estado || input.reviewStatus;
  if (estado && ESTADO_TO_REVIEW_STATUS[estado]) {
    payload.estado = estado;
    payload.reviewStatus = ESTADO_TO_REVIEW_STATUS[estado];
  }

  if ("alumnoId" in input) {
    if (!input.alumnoId) {
      payload.student = null;
    } else if (mongoose.Types.ObjectId.isValid(input.alumnoId)) {
      payload.student = new mongoose.Types.ObjectId(input.alumnoId);
    }
  }

  if ("alumno" in input) {
    payload.alumnoNombre = normaliseString(input.alumno);
  }

  const assignmentId =
    input.assignmentId ?? input.assignment ?? input.assignmentId;
  if (assignmentId && mongoose.Types.ObjectId.isValid(assignmentId)) {
    payload.assignment = new mongoose.Types.ObjectId(assignmentId);
  }

  return payload;
}

export async function listarEntregas(query = {}) {
  const filtro = {};
  if (query.alumno && mongoose.Types.ObjectId.isValid(query.alumno)) {
    filtro.student = query.alumno;
  } else if (query.alumnoNombre) {
    filtro.alumnoNombre = query.alumnoNombre;
  }

  if (query.estado && ESTADO_TO_REVIEW_STATUS[query.estado]) {
    filtro.estado = query.estado;
  }

  const submissions = await Submission.find(filtro)
    .populate("student", "name role")
    .populate("assignment", "module title")
    .sort({ createdAt: -1 });

  return submissions.map(toFrontend);
}

export async function obtenerEntrega(id) {
  const submission = await Submission.findById(id)
    .populate("student", "name role")
    .populate("assignment", "module title");
  return toFrontend(submission);
}

export async function crearEntrega(data) {
  const payload = buildPayload(data);
  const githubLink = payload.githubLink;
  if (!githubLink) {
    throw { status: 400, message: "El enlace de GitHub es obligatorio" };
  }

  const submission = await Submission.create({
    assignment: payload.assignment,
    student: payload.student,
    alumnoNombre: payload.alumnoNombre ?? "",
    sprint: payload.sprint ?? 1,
    githubLink,
    renderLink: payload.renderLink ?? null,
    comentarios: payload.comentarios ?? "",
    estado: payload.estado ?? "A revisar",
    reviewStatus: payload.reviewStatus ?? "revisar",
  });

  const completo = await Submission.findById(submission._id)
    .populate("student", "name role")
    .populate("assignment", "module title");

  return toFrontend(completo);
}

export async function actualizarEntrega(id, data) {
  const submission = await Submission.findById(id);
  if (!submission) return null;

  const payload = buildPayload(data);

  if (payload.githubLink !== undefined) {
    submission.githubLink = payload.githubLink;
  }
  if (payload.renderLink !== undefined) {
    submission.renderLink = payload.renderLink;
  }
  if (payload.comentarios !== undefined) {
    submission.comentarios = payload.comentarios;
  }
  if (payload.sprint !== undefined) {
    submission.sprint = payload.sprint;
  }
  if (payload.assignment !== undefined) {
    submission.assignment = payload.assignment;
  }
  if (payload.student !== undefined) {
    submission.student = payload.student;
  }
  if (payload.alumnoNombre !== undefined) {
    submission.alumnoNombre = payload.alumnoNombre;
  }
  if (payload.estado) {
    submission.estado = payload.estado;
    submission.reviewStatus =
      payload.reviewStatus ?? ESTADO_TO_REVIEW_STATUS[payload.estado];
  }

  await submission.save();

  const actualizado = await Submission.findById(id)
    .populate("student", "name role")
    .populate("assignment", "module title");

  return toFrontend(actualizado);
}

export async function eliminarEntrega(id) {
  return Submission.findByIdAndDelete(id);
}
