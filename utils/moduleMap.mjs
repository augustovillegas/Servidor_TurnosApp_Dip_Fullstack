import { MODULE_DETAILS, NORMALISED_LABELS, SLUG_TO_CODE } from '../constants/constantes.mjs';

function coerceModuleCode(value) {
  if (value === undefined || value === null) return undefined;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return undefined;
  return MODULE_DETAILS[numeric] ? numeric : undefined;
}

function normaliseSlug(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function moduleToLabel(value) {
  const numeric = coerceModuleCode(value);
  return numeric ? MODULE_DETAILS[numeric].label : null;
}

export function moduleToSlug(value) {
  const numeric = coerceModuleCode(value);
  return numeric ? MODULE_DETAILS[numeric].slug : null;
}

export function labelToModule(label) {
  if (!label) return undefined;
  const normalised = label.toString().trim().toUpperCase();
  return NORMALISED_LABELS[normalised];
}

export function slugToModule(slug) {
  if (!slug) return undefined;
  const normalised = slug.toString().trim().toUpperCase();
  return SLUG_TO_CODE[normalised];
}

export function ensureModuleLabel(value) {
  const label = typeof value === "string" ? value : moduleToLabel(value);
  if (!label) return null;
  return label.toUpperCase();
}

export function resolveModuleMetadata(input = {}, { fallbackCode = 1 } = {}) {
  let code =
    coerceModuleCode(input.module) ??
    labelToModule(input.modulo) ??
    slugToModule(input.moduloSlug) ??
    coerceModuleCode(input.cohort);

  if (code === undefined) {
    code = fallbackCode;
  }

  const detail = MODULE_DETAILS[code] ?? MODULE_DETAILS[fallbackCode];

  return {
    code,
    label: detail?.label ?? input.modulo ?? "HTML-CSS",
    slug: detail?.slug ?? normaliseSlug(input.moduloSlug),
  };
}
