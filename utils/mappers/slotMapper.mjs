import { ensureModuleLabel, moduleToLabel } from "../moduleMap.mjs";
import {
  coerceNumber,
  normaliseObjectId,
  normaliseString,
  ESTADO_TO_REVIEW_STATUS,
  VALID_ESTADOS,
} from "../normalizers/normalizers.mjs";
import { REVIEW_STATUS_TO_ESTADO, timeFormatter } from '../../constants/constantes.mjs';

export { timeFormatter };

export function parseIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseFecha(fecha) {
  if (!fecha || typeof fecha !== "string") return undefined;
  const parts = fecha.split("/").map((part) => part.trim());
  if (parts.length !== 3) return undefined;
  const [dd, mm, yyyy] = parts;
  const day = Number(dd);
  const month = Number(mm) - 1;
  const year = Number(yyyy);
  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 0 ||
    month > 11
  ) {
    return undefined;
  }
  const date = new Date(Date.UTC(year, month, day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function splitHorario(value) {
  if (!value) return undefined;
  const [hh, mm] = value.split(":").map((part) => part.trim());
  const hours = Number(hh);
  const minutes = Number(mm);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined;
  }
  return { hours, minutes };
}

function parseHorario(horario) {
  if (!horario || typeof horario !== "string") return {};
  const [inicio, fin] = horario.split("-").map((part) => part.trim());
  return {
    start: splitHorario(inicio),
    end: splitHorario(fin),
  };
}

function buildDateWithTime(baseDate, timeParts) {
  if (!baseDate || !timeParts) return undefined;
  const date = new Date(baseDate);
  date.setUTCHours(timeParts.hours, timeParts.minutes, 0, 0);
  return date;
}

function normalizeDateFromLegacy({ date, startTime }) {
  if (!date) return undefined;
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return undefined;
  if (!startTime) return base;
  const [hh, mm] = startTime.split(":").map((part) => Number(part));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return base;
  base.setUTCHours(hh, mm, 0, 0);
  return base;
}

function normalizeEndFromLegacy({ date, endTime }, fallbackStart) {
  if (!date && !fallbackStart) return undefined;
  const base = fallbackStart ? new Date(fallbackStart) : new Date(date);
  if (Number.isNaN(base.getTime())) return undefined;
  if (!endTime) return base;
  const [hh, mm] = endTime.split(":").map((part) => Number(part));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return base;
  base.setUTCHours(hh, mm, 0, 0);
  return base;
}

function parseScheduleFromInput({ start, end, fecha, horario }) {
  let startDate = parseIsoDate(start);
  let endDate = parseIsoDate(end);

  const parsedFecha = parseFecha(fecha);
  const horarioParts = parseHorario(horario);

  if (!startDate && parsedFecha && horarioParts.start) {
    startDate = buildDateWithTime(parsedFecha, horarioParts.start);
  }

  if (!endDate && parsedFecha && horarioParts.end) {
    endDate = buildDateWithTime(parsedFecha, horarioParts.end);
  }

  if (startDate && !endDate && horarioParts.end) {
    endDate = buildDateWithTime(startDate, horarioParts.end);
  }

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    endDate = new Date(endDate.getTime() + 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

function formatFecha(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatHorario(start, end, legacyStart, legacyEnd) {
  if (start && end) {
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }
  if (legacyStart && legacyEnd) {
    return `${legacyStart} - ${legacyEnd}`;
  }
  if (start) {
    return `${timeFormatter.format(start)} - `;
  }
  return "";
}

function resolveModulo(doc) {
  const assignmentModule = doc.assignment?.module;
  if (assignmentModule !== undefined && assignmentModule !== null) {
    const label = moduleToLabel(assignmentModule);
    if (label) return label;
  }

  if (doc.module !== undefined && doc.module !== null) {
    if (typeof doc.module === "string") {
      const ensured = ensureModuleLabel(doc.module);
      if (ensured) return ensured;
    } else {
      const label = moduleToLabel(doc.module);
      if (label) return label;
    }
  }

  if (doc.cohort !== undefined && doc.cohort !== null) {
    const label = moduleToLabel(doc.cohort);
    if (label) return label;
  }

  return null;
}

function resolveProfesorId(doc) {
  const assignmentOwner = doc.assignment?.createdBy;
  return normaliseObjectId(assignmentOwner ?? doc.profesorId);
}

function calculateDuracion(start, end, doc) {
  if (start && end) {
    const diff = Math.max(0, end.getTime() - start.getTime());
    return Math.round(diff / (60 * 1000));
  }
  if (doc?.duracion !== undefined) {
    const numeric = Number(doc.duracion);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  if (doc?.duration !== undefined) {
    const numeric = Number(doc.duration);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return null;
}

function resolveEstado({ estado, student, reviewStatus }) {
  if (estado && VALID_ESTADOS.includes(estado)) {
    return estado;
  }
  if (student) {
    return "Solicitado";
  }
  return REVIEW_STATUS_TO_ESTADO[reviewStatus] || "Disponible";
}

export function toFrontend(slot) {
  if (!slot) return null;
  const doc = slot.toObject ? slot.toObject() : slot;
  const estado = resolveEstado(doc);
  const start = doc.start ? parseIsoDate(doc.start) : normalizeDateFromLegacy(doc);
  const end = doc.end
    ? parseIsoDate(doc.end)
    : normalizeEndFromLegacy(doc, start);
  const modulo = resolveModulo(doc);
  const solicitanteId = normaliseObjectId(doc.student?._id ?? doc.student);
  const profesorId = resolveProfesorId(doc);
  const duracion = calculateDuracion(start, end, doc);

  return {
    id: doc._id?.toString() || doc.id,
    review: doc.reviewNumber ?? 1,
    fecha: formatFecha(start ?? doc.date),
    horario: formatHorario(start, end, doc.startTime, doc.endTime),
    sala: doc.room || "",
    zoomLink: doc.zoomLink || "",
    estado,
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    comentarios: doc.comentarios || "",
    titulo: doc.assignment?.title || doc.titulo || "",
    descripcion: doc.assignment?.description || doc.descripcion || "",
    modulo: modulo || "",
    duracion,
    solicitanteId,
    profesorId,
  };
}

export function buildScheduleFromInput(input = {}) {
  return parseScheduleFromInput(input);
}

export {
  parseFecha,
  formatFecha,
  formatHorario,
  resolveModulo,
  resolveEstado,
};
