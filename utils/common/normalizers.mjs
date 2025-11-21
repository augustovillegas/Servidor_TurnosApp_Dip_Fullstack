const VALID_ROLES = ["alumno", "profesor", "superadmin"];
const VALID_ESTADOS = ["Disponible", "Solicitado", "Aprobado", "Rechazado"];

const ESTADO_TO_REVIEW_STATUS = {
  Disponible: "A revisar",
  Solicitado: "A revisar",
  Aprobado: "Aprobado",
  Rechazado: "Desaprobado",
};

const REVIEW_STATUS_CANONICAL = {
  "a revisar": "A revisar",
  revisar: "A revisar",
  pendiente: "A revisar",
  "en revision": "A revisar",
  aprobado: "Aprobado",
  aprobada: "Aprobado",
  desaprobado: "Desaprobado",
  desaprobada: "Desaprobado",
  rechazado: "Desaprobado",
  rechazada: "Desaprobado",
};

function capitalise(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normaliseRole(value) {
  if (!value) return undefined;
  const role = value.toString().trim().toLowerCase();
  return VALID_ROLES.includes(role) ? role : undefined;
}

function normaliseEstado(value) {
  if (!value) return undefined;
  const estado = capitalise(value.toString().trim().toLowerCase());
  return VALID_ESTADOS.includes(estado) ? estado : undefined;
}

function normaliseReviewStatus(value, { strict = false, defaultValue = "A revisar" } = {}) {
  if (value === undefined || value === null) {
    if (strict) {
      throw { status: 400, message: "Estado de revision no valido" };
    }
    return defaultValue;
  }

  const raw = value.toString().trim();
  if (!raw) {
    if (strict) {
      throw { status: 400, message: "Estado de revision no valido" };
    }
    return defaultValue;
  }

  if (REVIEW_STATUS_CANONICAL[raw]) {
    return REVIEW_STATUS_CANONICAL[raw];
  }

  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (Object.values(REVIEW_STATUS_CANONICAL).includes(normalized)) {
    return normalized;
  }

  if (strict) {
    throw { status: 400, message: "Estado de revision no valido" };
  }
  return defaultValue;
}

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
}

function normaliseString(value) {
  if (value === undefined || value === null) return "";
  return value.toString().trim();
}

function normaliseObjectId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.toString) return value.toString();
  return null;
}

export {
  VALID_ROLES,
  VALID_ESTADOS,
  ESTADO_TO_REVIEW_STATUS,
  REVIEW_STATUS_CANONICAL,
  capitalise,
  normaliseRole,
  normaliseEstado,
  normaliseReviewStatus,
  coerceNumber,
  normaliseString,
  normaliseObjectId,
};
