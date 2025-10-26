import mongoose from "mongoose";
import { Submission } from "../models/Submission.mjs";
import { ensureModuleLabel, moduleToLabel } from "../utils/moduleMap.mjs";

const ESTADO_DEFAULT = "A revisar";
const ESTADO_NORMALISED = new Set(["A revisar", "Aprobado", "Desaprobado"]);
const ESTADO_ALIAS = {
  revisar: "A revisar",
  pendiente: "A revisar",
  "a revisar": "A revisar",
  aprobado: "Aprobado",
  aprobada: "Aprobado",
  desaprobado: "Desaprobado",
  desaprobada: "Desaprobado",
  rechazado: "Desaprobado",
  rechazada: "Desaprobado",
};

function normaliseEstado(value) {
  if (value === undefined || value === null) return null;
  const raw = value.toString().trim();
  if (!raw) return null;
  if (ESTADO_NORMALISED.has(raw)) {
    return raw;
  }
  const lower = raw.toLowerCase();
  return ESTADO_ALIAS[lower] || null;
}

function estadoDesdeDocumento(doc) {
  return (
    normaliseEstado(doc.estado) ??
    normaliseEstado(doc.reviewStatus) ??
    ESTADO_DEFAULT
  );
}

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
}

function normaliseString(value) {
  if (value === undefined || value === null) return "";
  return value.toString().trim();
}

function extractEstado(doc) {
  return estadoDesdeDocumento(doc);
}

function toFrontend(submission) {
  if (!submission) return null;
  const doc = submission.toObject
    ? submission.toObject({ virtuals: false })
    : submission;
  const estado = extractEstado(doc);
  const modulo = doc.module || moduleToLabel(doc.assignment?.module);
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
    modulo: modulo || "",
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

  if ("modulo" in input) {
    const moduloLabel = ensureModuleLabel(input.modulo);
    if (moduloLabel) {
      payload.module = moduloLabel;
    }
  }

  const sprintValue = coerceNumber(input.sprint);
  if (sprintValue !== undefined) {
    payload.sprint = sprintValue;
  }

  const estado = normaliseEstado(input.estado ?? input.reviewStatus);
  if (estado) {
    payload.estado = estado;
    payload.reviewStatus = estado;
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
  const moduloFiltro = ensureModuleLabel(query.modulo);

  if (query.alumno && mongoose.Types.ObjectId.isValid(query.alumno)) {
    filtro.student = query.alumno;
  } else if (query.alumnoNombre) {
    filtro.alumnoNombre = query.alumnoNombre;
  }
  if (query.alumnoId && mongoose.Types.ObjectId.isValid(query.alumnoId)) {
    filtro.student = query.alumnoId;
  }

  const estadoFiltro = normaliseEstado(query.estado);
  if (estadoFiltro) {
    if (estadoFiltro === "A revisar") {
      filtro.estado = { $in: ["A revisar", "Pendiente"] };
    } else if (estadoFiltro === "Desaprobado") {
      filtro.estado = { $in: ["Desaprobado", "Rechazado"] };
    } else {
      filtro.estado = estadoFiltro;
    }
  }
  if (moduloFiltro) {
    filtro.module = moduloFiltro;
  }

  let submissions = await Submission.find(filtro)
    .populate("student", "name role")
    .populate("assignment", "module title")
    .sort({ createdAt: -1 });

  if (moduloFiltro) {
    submissions = submissions.filter((submission) => {
      const label =
        submission.module || moduleToLabel(submission.assignment?.module);
      return label && label === moduloFiltro;
    });
  }

  if (estadoFiltro) {
    submissions = submissions.filter(
      (submission) => extractEstado(submission) === estadoFiltro
    );
  }

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
    estado: payload.estado ?? ESTADO_DEFAULT,
    reviewStatus: payload.reviewStatus ?? ESTADO_DEFAULT,
    module: payload.module ?? null,
  });

  const completo = await Submission.findById(submission._id)
    .populate("student", "name role")
    .populate("assignment", "module title");

  if (!payload.module && completo?.assignment?.module) {
    const moduleLabel = moduleToLabel(completo.assignment.module);
    if (moduleLabel) {
      completo.module = moduleLabel;
      await Submission.findByIdAndUpdate(submission._id, {
        module: moduleLabel,
      });
    }
  }

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
  if (payload.module !== undefined) {
    submission.module = payload.module;
  }
  if (payload.alumnoNombre !== undefined) {
    submission.alumnoNombre = payload.alumnoNombre;
  }
  if (payload.estado) {
    submission.estado = payload.estado;
    submission.reviewStatus = payload.reviewStatus ?? payload.estado;
  }

  await submission.save();

  const actualizado = await Submission.findById(id)
    .populate("student", "name role")
    .populate("assignment", "module title");

  if (!payload.module && payload.assignment && actualizado?.assignment?.module) {
    const moduleLabel = moduleToLabel(actualizado.assignment.module);
    if (moduleLabel) {
      actualizado.module = moduleLabel;
      await Submission.findByIdAndUpdate(id, { module: moduleLabel });
    }
  }

  return toFrontend(actualizado);
}

export async function eliminarEntrega(id) {
  return Submission.findByIdAndDelete(id);
}
