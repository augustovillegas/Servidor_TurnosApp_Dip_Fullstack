import slotRepository from "../repository/slotRepository.mjs";
import mongoose from "mongoose";
import { ensureModuleLabel, labelToModule } from "../utils/moduleMap.mjs";
import {
  buildScheduleFromInput,
  parseIsoDate,
  toFrontend,
  timeFormatter,
} from "../utils/mappers/slotMapper.mjs";
import {
  normaliseString,
  coerceNumber,
  ESTADO_TO_REVIEW_STATUS,
  VALID_ESTADOS,
  REVIEW_STATUS_CANONICAL,
} from "../utils/normalizers/normalizers.mjs";
import { buildModuleFilter } from "../utils/permissionUtils.mjs";

function resolveModulo(usuario, data) {
  const rawModulo = usuario?.modulo ?? data?.modulo;
  const modulo = ensureModuleLabel(rawModulo);
  if (!modulo) {
    throw { status: 400, message: "El modulo es requerido" };
  }
  const cohorte =
    Number.isFinite(Number(usuario?.cohorte)) && usuario?.cohorte !== null
      ? Number(usuario.cohorte)
      : Number.isFinite(Number(data?.cohorte))
      ? Number(data.cohorte)
      : labelToModule(modulo) ?? null;
  return { modulo, cohorte };
}

function normaliseEstadoTurno(value, { defaultValue = "Disponible" } = {}) {
  if (!value) return defaultValue;
  const limpio = value.toString().trim();
  const capitalizado = limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
  return VALID_ESTADOS.includes(capitalizado) ? capitalizado : defaultValue;
}

function normaliseReviewNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.max(1, Math.trunc(num));
}

function normaliseFechaPayload(data) {
  const fecha = parseIsoDate(data.fecha ?? data.date);
  return fecha ?? new Date();
}

function parseFechaQuery(value) {
  if (!value) return undefined;
  // Intentar ISO directo
  const iso = parseIsoDate(value);
  if (iso) return iso;
  // Intentar DD/MM/YYYY
  if (typeof value === "string" && value.includes("/")) {
    const parts = value.split("/").map((p) => p.trim());
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const day = Number(dd);
      const month = Number(mm) - 1;
      const year = Number(yyyy);
      if (
        Number.isFinite(day) &&
        Number.isFinite(month) &&
        Number.isFinite(year) &&
        day >= 1 &&
        day <= 31 &&
        month >= 0 &&
        month <= 11
      ) {
        const d = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
  }
  return undefined;
}

function applyFechaSalaFiltersFromQuery(filtro, query = {}) {
  // sala / room
  if (query.sala !== undefined || query.room !== undefined) {
    const sala = Number(query.sala ?? query.room);
    if (Number.isFinite(sala)) filtro.sala = sala;
  }
  // fecha / date (por día, rango [00:00, 24:00) UTC)
  const rawFecha = query.fecha ?? query.date;
  const day = parseFechaQuery(rawFecha);
  if (day) {
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1, 0, 0, 0, 0));
    filtro.fecha = { $gte: start, $lt: end };
  }
}

function applyAssignment(payload, data) {
  if (data.assignment) {
    if (!mongoose.Types.ObjectId.isValid(data.assignment)) {
      throw { status: 400, message: "Assignment invalido" };
    }
    payload.assignment = new mongoose.Types.ObjectId(data.assignment);
  }
}

function buildSlotPayload(data, usuario) {
  const { modulo, cohorte } = resolveModulo(usuario, data);
  const { startDate, endDate } = buildScheduleFromInput({
    start: data.start,
    end: data.end,
    fecha: data.fecha ?? data.date,
    horario: data.horario,
  });

  const fecha = normaliseFechaPayload({ fecha: data.fecha, date: data.date }) ?? startDate;
  const reviewNumber = normaliseReviewNumber(data.reviewNumber);

  const baseEstado = normaliseEstadoTurno(data.estado);
  const baseReviewStatus = ESTADO_TO_REVIEW_STATUS[baseEstado] ?? "A revisar";

  const payload = {
    cohorte,
    modulo,
    reviewNumber,
    fecha,
    start: startDate ?? fecha,
    end: endDate ?? null,
    startTime: data.startTime ?? (startDate ? timeFormatter.format(startDate) : "-"),
    endTime: data.endTime ?? (endDate ? timeFormatter.format(endDate) : "-"),
    sala: coerceNumber(data.sala, { defaultValue: 1 }),
    zoomLink: normaliseString(data.zoomLink) || "-",
    comentarios: normaliseString(data.comentarios) || "",
    estado: baseEstado,
    reviewStatus: baseReviewStatus,
    student: null,
  };

  applyAssignment(payload, data);
  return payload;
}

export async function crear(data, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.rol)) {
    throw { status: 403, message: "No autorizado" };
  }

  const payload = buildSlotPayload(data, usuario);
  const creado = await slotRepository.crear(payload);
  return toFrontend(creado);
}

export async function solicitarTurno(idTurno, usuario) {
  if (usuario.rol !== "alumno") {
    throw { status: 403, message: "Solo alumnos pueden solicitar turnos" };
  }
  if (usuario.status !== "Aprobado") {
    throw { status: 403, message: "Tu cuenta debe ser aprobada" };
  }

  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (turno.student) {
    throw { status: 403, message: "Turno ya reservado" };
  }

  if (turno.modulo !== usuario.modulo) {
    throw { status: 403, message: "Modulo no coincide" };
  }

  turno.student = usuario.id;
  turno.estado = "Solicitado";
  turno.reviewStatus = ESTADO_TO_REVIEW_STATUS[turno.estado] || "A revisar";
  await turno.save();
  return toFrontend(turno);
}

export async function cancelarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (!turno.student || turno.student.toString() !== usuario.id.toString()) {
    throw { status: 403, message: "No autorizado para cancelar este turno" };
  }

  turno.student = null;
  turno.estado = "Disponible";
  turno.reviewStatus = ESTADO_TO_REVIEW_STATUS[turno.estado] || "A revisar";
  await turno.save();
  return toFrontend(turno);
}

export async function actualizarEstadoRevision(idTurno, estado, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.rol)) {
    throw { status: 403, message: "No autorizado" };
  }

  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  const estadoNormalizado = estado ? estado.toString().trim().toLowerCase() : "";
  const reviewStatus = REVIEW_STATUS_CANONICAL[estadoNormalizado];

  if (!reviewStatus) {
    throw { status: 400, message: "Estado invalido" };
  }

  turno.reviewStatus = reviewStatus;
  turno.estado = Object.keys(ESTADO_TO_REVIEW_STATUS).find(
    (key) => ESTADO_TO_REVIEW_STATUS[key] === reviewStatus
  ) || "Disponible";

  await turno.save();
  return toFrontend(turno);
}

export async function obtenerPorUsuario(usuarioId) {
  return await slotRepository.obtenerTodos({ student: usuarioId });
}

export async function obtenerTurnosPorFiltro(query = {}, usuario) {
  const filtro = buildModuleFilter(usuario, { queryFilters: query });

  const reviewValue = coerceNumber(query.review);
  if (reviewValue !== undefined) {
    filtro.reviewNumber = reviewValue;
  }

  if (usuario.rol === "alumno") {
    const userId = new mongoose.Types.ObjectId(usuario.id);
    const finalFilter = { ...filtro };
    finalFilter.$or = [{ estado: "Disponible" }, { student: userId }];
    const raw = await slotRepository.obtenerTodos(finalFilter);
    const filtrados = raw.filter((slot) => {
      const stu = slot.student;
      if (!stu) return true;
      const stuId = typeof stu === "object" && stu._id ? String(stu._id) : String(stu);
      return stuId === String(usuario.id);
    });
    const normalizados = filtrados.map((s) => {
      if (s.student && typeof s.student === "object" && s.student._id) {
        const clone = s.toObject ? s.toObject() : { ...s };
        clone.student = s.student._id;
        return clone;
      }
      return s;
    });
    return normalizados.map(toFrontend);
  }
  // Mapear query.date/room a fecha/sala en filtros
  applyFechaSalaFiltersFromQuery(filtro, query);
  const raw = await slotRepository.obtenerTodos(filtro);
  return raw.map(toFrontend);
}

export async function obtenerSolicitudesPorAlumno(alumnoId) {
  return await slotRepository.obtenerTodos({ student: alumnoId });
}

function buildUpdatePayload(input = {}) {
  const payload = {};

  const reviewValue = coerceNumber(input.reviewNumber ?? input.review);
  if (reviewValue !== undefined) {
    payload.reviewNumber = normaliseReviewNumber(reviewValue);
  }

  if ("sala" in input) {
    payload.sala = coerceNumber(input.sala);
  }

  if ("zoomLink" in input) {
    payload.zoomLink = normaliseString(input.zoomLink);
  }

  if ("comentarios" in input) {
    payload.comentarios = normaliseString(input.comentarios ?? "");
  }

  const { startDate, endDate } = buildScheduleFromInput({
    start: input.start,
    end: input.end,
    fecha: input.fecha,
    horario: input.horario,
  });

  const fecha = parseIsoDate(input.fecha);
  if (fecha) {
    payload.fecha = fecha;
  }
  if (startDate) {
    payload.start = startDate;
    payload.startTime = timeFormatter.format(startDate);
  }
  if (endDate) {
    payload.end = endDate;
    payload.endTime = timeFormatter.format(endDate);
  }

  if (input.estado) {
    const estadoNormalizado = normaliseEstadoTurno(input.estado, { defaultValue: null });
    if (estadoNormalizado) {
      payload.estado = estadoNormalizado;
      payload.reviewStatus = ESTADO_TO_REVIEW_STATUS[estadoNormalizado] || "A revisar";
    }
  }

  if ("alumnoId" in input || "solicitanteId" in input) {
    const incoming = input.alumnoId ?? input.solicitanteId;
    if (!incoming) {
      payload.student = null;
    } else if (mongoose.Types.ObjectId.isValid(incoming)) {
      payload.student = new mongoose.Types.ObjectId(incoming);
    }
  }

  if (input.modulo) {
    const modulo = ensureModuleLabel(input.modulo);
    if (modulo) {
      payload.modulo = modulo;
      payload.cohorte = labelToModule(modulo) ?? payload.cohorte;
    }
  }

  if (input.cohorte !== undefined) {
    const cohorte = coerceNumber(input.cohorte);
    if (cohorte !== undefined) {
      payload.cohorte = cohorte;
    }
  }

  if (input.assignment) {
    applyAssignment(payload, input);
  }

  return payload;
}

function applyPayloadToDocument(slot, payload) {
  Object.assign(slot, payload);

  if (payload.estado) {
    slot.reviewStatus = payload.reviewStatus ?? ESTADO_TO_REVIEW_STATUS[payload.estado] ?? slot.reviewStatus;
    if (payload.estado === "Disponible") {
      slot.student = null;
    }
  }

  const estadoFinal = slot.estado || normaliseEstadoTurno(slot.estado);
  slot.estado = estadoFinal;
  slot.reviewStatus = ESTADO_TO_REVIEW_STATUS[estadoFinal] || slot.reviewStatus || "A revisar";
  if (estadoFinal === "Disponible" && slot.student) {
    slot.student = null;
  }
}

function sanitiseForCreate(input = {}) {
  const payload = buildSlotPayload(input, {});
  return payload;
}

export async function listarTurnos(query = {}) {
  const filtro = {};
  const cohorte = coerceNumber(query.cohorte);
  if (cohorte !== undefined) {
    filtro.cohorte = cohorte;
  }
  const reviewValue = coerceNumber(query.review);
  if (reviewValue !== undefined) {
    filtro.reviewNumber = reviewValue;
  }
  if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
    filtro.student = query.userId;
  }
  if (query.estado && VALID_ESTADOS.includes(query.estado)) {
    filtro.estado = query.estado;
  }
  if (query.modulo) {
    const modulo = ensureModuleLabel(query.modulo);
    if (modulo) filtro.modulo = modulo;
  }
  // Mapear query.date/room a fecha/sala en filtros
  applyFechaSalaFiltersFromQuery(filtro, query);

  const raw = await slotRepository.obtenerTodos(filtro);
  return raw.map(toFrontend);
}

export async function obtenerTurno(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Turno no encontrado" };
  }
  const slot = await slotRepository.obtenerPorId(id);
  if (!slot) throw { status: 404, message: "Turno no encontrado" };
  return toFrontend(slot);
}

export async function crearTurno(data) {
  const payload = sanitiseForCreate(data);
  const slot = await slotRepository.crear(payload);
  return toFrontend(slot);
}

export async function actualizarTurno(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Turno no encontrado" };
  }
  const slot = await slotRepository.obtenerPorId(id);
  if (!slot) throw { status: 404, message: "Turno no encontrado" };

  const payload = buildUpdatePayload(data);
  applyPayloadToDocument(slot, payload);
  await slot.save();
  return toFrontend(slot);
}

export async function eliminarTurno(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Turno no encontrado" };
  }
  const eliminado = await slotRepository.eliminar(id);
  if (!eliminado) throw { status: 404, message: "Turno no encontrado" };
  return toFrontend(eliminado);
}
