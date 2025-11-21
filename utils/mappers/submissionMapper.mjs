import { moduleToLabel } from "../moduleMap.mjs";
import {
  normaliseReviewStatus,
  normaliseString,
} from "../common/normalizers.mjs";

const ESTADO_DEFAULT = "A revisar";

function resolveEstado(doc) {
  const estadoDoc = normaliseReviewStatus(doc.estado, { defaultValue: null });
  if (estadoDoc) return estadoDoc;
  const reviewDoc = normaliseReviewStatus(doc.reviewStatus, {
    defaultValue: null,
  });
  return reviewDoc || ESTADO_DEFAULT;
}

export function toFrontend(submission) {
  if (!submission) return null;
  const doc =
    submission.toObject?.({ virtuals: false }) ??
    submission;
  const estado = resolveEstado(doc);
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

export function extractEstado(submission) {
  return resolveEstado(submission);
}
