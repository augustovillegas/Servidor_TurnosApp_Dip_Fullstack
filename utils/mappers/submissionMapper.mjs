import { moduleToLabel } from "../moduleMap.mjs";
import { normaliseReviewStatus, normaliseString } from "../normalizers/normalizers.mjs";
import { ESTADO_DEFAULT } from "../../constants/constantes.mjs";

function resolveEstado(doc) {
  const estadoDoc = normaliseReviewStatus(doc.estado, { defaultValue: null });
  if (estadoDoc) return estadoDoc;
  const reviewDoc = normaliseReviewStatus(doc.reviewStatus, { defaultValue: null });
  return reviewDoc || ESTADO_DEFAULT;
}

export function toFrontend(submission) {
  if (!submission) return null;
  const doc = submission.toObject?.({ virtuals: false }) ?? submission;
  const estado = resolveEstado(doc);
  const modulo =
    doc.modulo ||
    doc.assignment?.modulo ||
    moduleToLabel(doc.assignment?.cohorte) ||
    null;

  const cohorte =
    doc.cohorte ??
    doc.assignment?.cohorte ??
    null;

  return {
    id: doc._id?.toString() || doc.id,
    sprint: doc.sprint ?? null,
    githubLink: doc.githubLink,
    renderLink: doc.renderLink || "",
    comentarios: doc.comentarios || "",
    reviewStatus: estado,
    estado,
    alumno: doc.alumnoNombre || doc.student?.nombre || "",
    alumnoId: doc.student?._id?.toString() || doc.student?.toString() || null,
    student: doc.student?._id?.toString() || doc.student?.toString() || null,
    modulo: modulo || "",
    cohorte,
    fechaEntrega: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}

export function extractEstado(submission) {
  return resolveEstado(submission);
}
