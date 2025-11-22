// ============================================================================
// CONSTANTES CENTRALIZADAS DEL PROYECTO
// ============================================================================

// ----------------------------------------------------------------------------
// MÓDULOS Y CONFIGURACIÓN DE CURSOS
// ----------------------------------------------------------------------------
export const MODULE_DETAILS = {
  1: { label: "HTML-CSS", slug: "htmlcss" },
  2: { label: "JAVASCRIPT", slug: "javascript" },
  3: { label: "BACKEND - NODE JS", slug: "node" },
  4: { label: "FRONTEND - REACT", slug: "react" },
};

export const NORMALISED_LABELS = Object.entries(MODULE_DETAILS).reduce((acc, [key, value]) => {
  acc[value.label.toUpperCase()] = Number(key);
  return acc;
}, {});

export const SLUG_TO_CODE = Object.entries(MODULE_DETAILS).reduce((acc, [key, value]) => {
  acc[value.slug.toUpperCase()] = Number(key);
  return acc;
}, {});

// ----------------------------------------------------------------------------
// ROLES Y PERMISOS
// ----------------------------------------------------------------------------
export const VALID_ROLES = ["alumno", "profesor", "superadmin"];

// ----------------------------------------------------------------------------
// ESTADOS DE TURNOS Y ENTREGAS
// ----------------------------------------------------------------------------
export const VALID_ESTADOS = ["Disponible", "Solicitado", "Aprobado", "Rechazado"];

export const ESTADO_TO_REVIEW_STATUS = {
  Disponible: "A revisar",
  Solicitado: "A revisar",
  Aprobado: "Aprobado",
  Rechazado: "Desaprobado",
};

export const REVIEW_STATUS_CANONICAL = {
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

export const REVIEW_STATUS_TO_ESTADO = {
  "A revisar": "Disponible",
  revisar: "Disponible",
  Aprobado: "Aprobado",
  aprobado: "Aprobado",
  Desaprobado: "Rechazado",
  desaprobado: "Rechazado",
};

export const ESTADO_DEFAULT = "A revisar";

export const FINAL_STATES = new Set(["Aprobado", "Desaprobado"]);

// ----------------------------------------------------------------------------
// VALIDACIÓN DE AUTENTICACIÓN
// ----------------------------------------------------------------------------
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernameRegex = /^[A-Za-z0-9._-]+$/;

// ----------------------------------------------------------------------------
// FORMATEO DE TIEMPO
// ----------------------------------------------------------------------------
export const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
