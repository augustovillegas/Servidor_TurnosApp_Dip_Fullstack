import { VALID_ROLES, VALID_ESTADOS, ESTADO_TO_REVIEW_STATUS, REVIEW_STATUS_CANONICAL } from "../../constants/constantes.mjs";

function capitalise(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normaliseRole(value) {
  if (!value) return undefined;
  const v = value.toString().trim().toLowerCase();
  return VALID_ROLES.includes(v) ? v : undefined;
}

export function normaliseString(value, { defaultValue = null } = {}) {
  if (value === undefined || value === null) return defaultValue;
  const trimmed = value.toString().trim();
  return trimmed.length ? trimmed : defaultValue;
}

export function normaliseObjectId(value) {
  if (!value) return undefined;
  try {
    return value.toString();
  } catch {
    return undefined;
  }
}

export function coerceNumber(value, { defaultValue = undefined } = {}) {
  if (value === undefined || value === null) return defaultValue;
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export function normaliseReviewStatus(value, { defaultValue = null } = {}) {
  if (!value) return defaultValue;
  const raw = value.toString().trim().toLowerCase();
  return REVIEW_STATUS_CANONICAL[raw] || defaultValue;
}

export function resolveEstado(doc) {
  if (!doc) return null;
  const estado = normaliseReviewStatus(doc.estado, { defaultValue: null });
  if (estado) return estado;
  const review = normaliseReviewStatus(doc.reviewStatus, { defaultValue: null });
  return review || null;
}

export { VALID_ROLES, VALID_ESTADOS, ESTADO_TO_REVIEW_STATUS, REVIEW_STATUS_CANONICAL, normaliseRole, capitalise };
