const MODULE_LABELS = {
  1: "HTML-CSS",
  2: "JAVASCRIPT",
  3: "NODE",
  4: "REACT",
};

const NORMALISED_LABELS = Object.entries(MODULE_LABELS).reduce(
  (acc, [key, value]) => {
    acc[value] = Number(key);
    return acc;
  },
  {}
);

export function moduleToLabel(value) {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return MODULE_LABELS[numeric] || null;
}

export function labelToModule(label) {
  if (!label) return undefined;
  const normalised = label.toString().trim().toUpperCase();
  return NORMALISED_LABELS[normalised];
}

export function ensureModuleLabel(value) {
  const label = typeof value === "string" ? value : moduleToLabel(value);
  if (!label) return null;
  return label.toUpperCase();
}
