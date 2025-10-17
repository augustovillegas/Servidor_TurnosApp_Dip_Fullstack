import mongoose from "mongoose";
import slotRepository from "../repository/slotRepository.mjs";
import {
  ensureModuleLabel,
  labelToModule,
  moduleToLabel,
} from "../utils/moduleMap.mjs";

const ESTADO_TO_REVIEW_STATUS = {
  Disponible: "revisar",
  Solicitado: "revisar",
  Aprobado: "aprobado",
  Rechazado: "desaprobado",
};

const REVIEW_STATUS_TO_ESTADO = {
  revisar: "Disponible",
  aprobado: "Aprobado",
  desaprobado: "Rechazado",
};

const VALID_ESTADOS = Object.keys(ESTADO_TO_REVIEW_STATUS);

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function normaliseObjectId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.toString) return value.toString();
  return null;
}

function resolveModulo(doc) {
  const assignmentModule = doc.assignment?.module;
  if (assignmentModule !== undefined && assignmentModule !== null) {
    const label = moduleToLabel(assignmentModule);
    if (label) {
      return label;
    }
  }

  if (doc.module !== undefined && doc.module !== null) {
    if (typeof doc.module === "string") {
      const ensured = ensureModuleLabel(doc.module);
      if (ensured) {
        return ensured;
      }
    } else {
      const label = moduleToLabel(doc.module);
      if (label) {
        return label;
      }
    }
  }

  if (doc.cohort !== undefined && doc.cohort !== null) {
    const label = moduleToLabel(doc.cohort);
    if (label) {
      return label;
    }
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

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
}

function parseIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseFecha(fecha) {
  if (!fecha || typeof fecha !== "string") return undefined;
  const [dd, mm, yyyy] = fecha.split("/").map((part) => part.trim());
  if (!dd || !mm || !yyyy) return undefined;
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

function parseHorario(horario) {
  if (!horario || typeof horario !== "string") return {};
  const [inicio, fin] = horario.split("-").map((part) => part.trim());
  return {
    start: splitHorario(inicio),
    end: splitHorario(fin),
  };
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

function buildDateWithTime(baseDate, timeParts) {
  if (!baseDate || !timeParts) return undefined;
  const date = new Date(baseDate);
  date.setUTCHours(timeParts.hours, timeParts.minutes, 0, 0);
  return date;
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

  if (
    startDate &&
    endDate &&
    endDate.getTime() < startDate.getTime()
  ) {
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

function deriveStartFromLegacy({ date, startTime }) {
  if (!date) return undefined;
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return undefined;
  if (!startTime) return base;
  const [hh, mm] = startTime.split(":").map((part) => Number(part));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return base;
  base.setUTCHours(hh, mm, 0, 0);
  return base;
}

function deriveEndFromLegacy({ date, endTime }, fallbackStart) {
  if (!date && !fallbackStart) return undefined;
  const base = fallbackStart ? new Date(fallbackStart) : new Date(date);
  if (Number.isNaN(base.getTime())) return undefined;
  if (!endTime) return base;
  const [hh, mm] = endTime.split(":").map((part) => Number(part));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return base;
  base.setUTCHours(hh, mm, 0, 0);
  return base;
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

function normaliseString(value) {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return typeof value === "string" ? value.trim() : value;
}

function toFrontend(slot) {
  if (!slot) return null;
  const doc = slot.toObject ? slot.toObject() : slot;
  const estado = resolveEstado(doc);
  const start = doc.start
    ? parseIsoDate(doc.start)
    : deriveStartFromLegacy(doc);
  const end = doc.end
    ? parseIsoDate(doc.end)
    : deriveEndFromLegacy(doc, start);
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

function buildPersistencePayload(input = {}) {
  const payload = {};

  const reviewValue =
    input.review !== undefined
      ? coerceNumber(input.review)
      : coerceNumber(input.reviewNumber);
  if (reviewValue !== undefined) {
    payload.reviewNumber = reviewValue;
  }

  if ("sala" in input || "room" in input) {
    payload.room = normaliseString(input.sala ?? input.room ?? "");
  }

  if ("zoomLink" in input) {
    payload.zoomLink = normaliseString(input.zoomLink);
  }

  if ("comentarios" in input) {
    payload.comentarios = normaliseString(input.comentarios ?? "");
  }

  const { startDate, endDate } = parseScheduleFromInput(input);
  if (startDate) {
    payload.start = startDate;
    payload.date = startDate;
    payload.startTime = timeFormatter.format(startDate);
  }
  if (endDate) {
    payload.end = endDate;
    payload.endTime = timeFormatter.format(endDate);
  }

  if (!payload.date && input.fecha) {
    const fecha = parseFecha(input.fecha);
    if (fecha) {
      payload.date = fecha;
    }
  }

  if ("estado" in input && VALID_ESTADOS.includes(input.estado)) {
    payload.estado = input.estado;
    payload.reviewStatus = ESTADO_TO_REVIEW_STATUS[input.estado];
  }

  if ("alumnoId" in input) {
    if (!input.alumnoId) {
      payload.student = null;
    } else if (mongoose.Types.ObjectId.isValid(input.alumnoId)) {
      payload.student = new mongoose.Types.ObjectId(input.alumnoId);
    }
  }

  if (!("alumnoId" in input) && "solicitanteId" in input) {
    if (!input.solicitanteId) {
      payload.student = null;
    } else if (mongoose.Types.ObjectId.isValid(input.solicitanteId)) {
      payload.student = new mongoose.Types.ObjectId(input.solicitanteId);
    }
  }

  const moduloValue = labelToModule(input.modulo);
  if (moduloValue !== undefined) {
    payload.cohort = moduloValue;
  }

  const cohortValue = coerceNumber(input.cohort);
  if (cohortValue !== undefined) {
    payload.cohort = cohortValue;
  }

  const assignmentId =
    input.assignmentId ?? input.assignment ?? input.assignmentId;
  if (assignmentId && mongoose.Types.ObjectId.isValid(assignmentId)) {
    payload.assignment = new mongoose.Types.ObjectId(assignmentId);
  }

  return payload;
}

function applyPayloadToDocument(slot, payload, incomingEstado) {
  if (payload.reviewNumber !== undefined) {
    slot.reviewNumber = payload.reviewNumber;
  }
  if (payload.room !== undefined) {
    slot.room = payload.room;
  }
  if (payload.zoomLink !== undefined) {
    slot.zoomLink = payload.zoomLink;
  }
  if (payload.comentarios !== undefined) {
    slot.comentarios = payload.comentarios;
  }
  if (payload.start !== undefined) {
    slot.start = payload.start;
  }
  if (payload.end !== undefined) {
    slot.end = payload.end;
  }
  if (payload.date !== undefined) {
    slot.date = payload.date;
  }
  if (payload.startTime !== undefined) {
    slot.startTime = payload.startTime;
  }
  if (payload.endTime !== undefined) {
    slot.endTime = payload.endTime;
  }
  if (payload.assignment !== undefined) {
    slot.assignment = payload.assignment;
  }
  if (payload.cohort !== undefined) {
    slot.cohort = payload.cohort;
  }
  if (payload.student !== undefined) {
    slot.student = payload.student;
  }

  if (incomingEstado && VALID_ESTADOS.includes(incomingEstado)) {
    slot.estado = incomingEstado;
    slot.reviewStatus =
      payload.reviewStatus ?? ESTADO_TO_REVIEW_STATUS[incomingEstado];
    if (incomingEstado === "Disponible") {
      slot.student = null;
    }
  } else if (payload.reviewStatus) {
    slot.reviewStatus = payload.reviewStatus;
  }

  const resolved = resolveEstado(slot);
  slot.estado = resolved;
  slot.reviewStatus = ESTADO_TO_REVIEW_STATUS[resolved] || "revisar";
  if (resolved === "Disponible" && slot.student) {
    slot.student = null;
  }
}

function sanitiseForCreate(input = {}) {
  const payload = buildPersistencePayload(input);
  const base = {
    cohort:
      payload.cohort ??
      coerceNumber(input.cohort) ??
      1,
    reviewNumber: payload.reviewNumber ?? 1,
    room: payload.room ?? "",
    zoomLink: payload.zoomLink ?? "",
    comentarios: payload.comentarios ?? "",
    start: payload.start,
    end: payload.end,
    date: payload.date,
    startTime: payload.startTime ?? input.startTime,
    endTime: payload.endTime ?? input.endTime,
    assignment: payload.assignment,
    student: payload.student,
  };

  const estado = resolveEstado(base);
  base.estado = payload.estado ?? estado;
  base.reviewStatus =
    payload.reviewStatus ??
    ESTADO_TO_REVIEW_STATUS[base.estado] ??
    "revisar";
  if (base.estado === "Disponible" && base.student === undefined) {
    base.student = null;
  }

  return base;
}

export async function listarTurnos(query = {}) {
  const filtro = {};
  const cohortValue = coerceNumber(query.cohort);
  if (cohortValue !== undefined) {
    filtro.cohort = cohortValue;
  }
  const reviewValue = coerceNumber(query.review);
  if (reviewValue !== undefined) {
    filtro.reviewNumber = reviewValue;
  }
  if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
    filtro.student = query.userId;
  }

  const raw = await slotRepository.obtenerTodos(filtro);
  let mapped = raw.map(toFrontend);

  if (query.userId && !mongoose.Types.ObjectId.isValid(query.userId)) {
    const userFilter = query.userId.toString().trim();
    mapped = mapped.filter((slot) => slot.solicitanteId === userFilter);
  }

  if (query.modulo) {
    const moduloNormalised = ensureModuleLabel(query.modulo);
    if (moduloNormalised) {
      mapped = mapped.filter(
        (slot) => slot.modulo && slot.modulo.toUpperCase() === moduloNormalised
      );
    }
  }

  if (query.estado && VALID_ESTADOS.includes(query.estado)) {
    mapped = mapped.filter((slot) => slot.estado === query.estado);
  }

  return mapped;
}

export async function obtenerTurno(id) {
  const slot = await slotRepository.obtenerPorId(id);
  return toFrontend(slot);
}

export async function crearTurno(data) {
  const payload = sanitiseForCreate(data);
  const slot = await slotRepository.crear(payload);
  return toFrontend(slot);
}

export async function actualizarTurno(id, data) {
  const slot = await slotRepository.obtenerPorId(id);
  if (!slot) return null;

  const payload = buildPersistencePayload(data);
  applyPayloadToDocument(slot, payload, data?.estado);
  await slot.save();
  return toFrontend(slot);
}

export async function eliminarTurno(id) {
  return slotRepository.eliminar(id);
}
