import slotRepository from "../repository/slotRepository.mjs";
import mongoose from "mongoose";
import { ensureModuleLabel, labelToModule } from "../utils/moduleMap.mjs";
import {
  toFrontend,
  timeFormatter,
  parseFecha,
  resolveEstado,
  buildScheduleFromInput,
} from "../utils/mappers/slotMapper.mjs";
import {
  coerceNumber,
  normaliseString,
  ESTADO_TO_REVIEW_STATUS,
  VALID_ESTADOS,
} from "../utils/common/normalizers.mjs";

const REVIEW_STATUS_CANONICAL = {
  aprobado: "Aprobado",
  aprobada: "Aprobado",
  pendiente: "A revisar",
  revisar: "A revisar",
  "a revisar": "A revisar",
  cancelado: "Desaprobado",
  cancelada: "Desaprobado",
  desaprobado: "Desaprobado",
  desaprobada: "Desaprobado",
  rechazado: "Desaprobado",
  rechazada: "Desaprobado",
};

export async function crear(data, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.role)) {
    throw { status: 403, message: "No autorizado" };
  }

  // AHORA: El 'cohort' del turno SIEMPRE debe ser el Módulo del profesor logueado.
  const moduleValue = Number(usuario?.cohort);

  const payload = {
    ...data,
    cohort: moduleValue, // ¡Forzamos el Módulo del turno!
    reviewStatus: "A revisar",
    reviewNumber: 1,
  };

  if (data?.reviewNumber !== undefined) {
    const reviewNumber = Number(data.reviewNumber);
    payload.reviewNumber = Number.isNaN(reviewNumber)
      ? 1
      : Math.max(1, reviewNumber);
  } else if (!payload.reviewNumber) {
    payload.reviewNumber = 1;
  }

  if (data?.assignment) {
    if (!mongoose.Types.ObjectId.isValid(data.assignment)) {
      throw { status: 400, message: "Assignment invalido" };
    }
    payload.assignment = new mongoose.Types.ObjectId(data.assignment);
  } else {
    delete payload.assignment;
  }

  return await slotRepository.crear(payload);
}

export async function solicitarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (turno.student) {
    throw { status: 403, message: "Turno ya reservado" };
  }

  if (String(turno.cohort) !== String(usuario.cohort)) {
    throw { status: 403, message: "Cohorte no coincide" };
  }

  turno.student = usuario.id;
  await turno.save();
  return turno;
}

export async function cancelarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (!turno.student || turno.student.toString() !== usuario.id.toString()) {
    throw { status: 403, message: "No autorizado para cancelar este turno" };
  }

  turno.student = null;
  turno.reviewStatus = "A revisar";
  await turno.save();
  return turno;
}

export async function actualizarEstadoRevision(idTurno, estado, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.role)) {
    throw { status: 403, message: "No autorizado" };
  }

  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  const estadoNormalizado = estado
    ? estado.toString().trim().toLowerCase()
    : "";
  const reviewStatus = REVIEW_STATUS_CANONICAL[estadoNormalizado];

  if (!reviewStatus) {
    throw { status: 400, message: "Estado invalido" };
  }

  turno.reviewStatus = reviewStatus;
  await turno.save();
  return turno;
}

export async function obtenerPorUsuario(usuarioId) {
  return await slotRepository.obtenerTodos({ student: usuarioId });
}

export async function obtenerTurnosPorFiltro(query = {}, usuario) {
  const filtro = {};
  const { role, cohort: userModulo, id: userId } = usuario; // Renombramos cohort a userModulo para claridad
  const moduloActual = Number(userModulo);

  // --- FILTRO DE MÓDULO (Acceso Rígido) ---
  if (role === "superadmin") {
    // El Superadmin puede ver todos los módulos o filtrar opcionalmente.
    // Usamos el filtro de query si existe, si no, ve todo.
    let queryCohortValue = coerceNumber(query.cohort);
    if (query.modulo) {
      // También manejar si se filtra por la etiqueta del módulo
      const moduloValue = labelToModule(query.modulo);
      if (moduloValue !== undefined) {
        queryCohortValue = moduloValue;
      }
    }
    if (queryCohortValue !== undefined) {
      filtro.cohort = queryCohortValue;
    }
  } else if (
    ["profesor", "alumno"].includes(role) &&
    Number.isFinite(moduloActual)
  ) {
    // Profesor y Alumno: Obligatoriamente filtran por SU Módulo
    // Usar alias 'cohorte' real del schema y redundar 'cohort' por compatibilidad
    filtro.$or = [ { cohorte: moduloActual }, { cohort: moduloActual } ];
  } else {
    // Rol no permitido o sin Módulo asignado
    return [];
  }

  // --- FILTRO DE PERMISOS (Basado en Rol) ---
  if (role === "alumno") {
    // Alumno: Solo ve turnos que están disponibles o que ya solicitó, DENTRO de SU Módulo.
    filtro.$or = [
      { student: null },
      { student: new mongoose.Types.ObjectId(userId) },
    ];
  }
  // Profesor y Superadmin: Ven todos los turnos del Módulo ya filtrado.

  // --- Otros filtros de Query (Si aplica) ---
  const reviewValue = coerceNumber(query.review);
  if (reviewValue !== undefined) {
    filtro.reviewNumber = reviewValue;
  }

  // Si usamos $or para cohorte, quitamos $or y resolvemos manualmente
  let raw;
  if (filtro.$or) {
    const candidates = await slotRepository.obtenerTodos({});
    raw = candidates.filter((doc) => filtro.$or.some(cond => {
      const valor = (doc.cohorte ?? doc.cohort);
      const esperado = cond.cohorte ?? cond.cohort;
      return String(valor) === String(esperado);
    })).filter(doc => {
      // aplicar resto de claves (reviewNumber)
      if (filtro.reviewNumber !== undefined && doc.reviewNumber !== filtro.reviewNumber) return false;
      if (filtro.$or && filtro.$or.length) return true;
      return true;
    });
  } else {
    raw = await slotRepository.obtenerTodos(filtro);
  }
  return raw;
}

export async function obtenerSolicitudesPorAlumno(alumnoId) {
  return await slotRepository.obtenerTodos({ student: alumnoId });
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

  const { startDate, endDate } = buildScheduleFromInput(input);
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
  if (payload.reviewNumber !== undefined)
    slot.reviewNumber = payload.reviewNumber;
  if (payload.room !== undefined) slot.room = payload.room;
  if (payload.zoomLink !== undefined) slot.zoomLink = payload.zoomLink;
  if (payload.comentarios !== undefined) slot.comentarios = payload.comentarios;
  if (payload.start !== undefined) slot.start = payload.start;
  if (payload.end !== undefined) slot.end = payload.end;
  if (payload.date !== undefined) slot.date = payload.date;
  if (payload.startTime !== undefined) slot.startTime = payload.startTime;
  if (payload.endTime !== undefined) slot.endTime = payload.endTime;
  if (payload.assignment !== undefined) slot.assignment = payload.assignment;
  if (payload.cohort !== undefined) slot.cohort = payload.cohort;
  if (payload.student !== undefined) slot.student = payload.student;

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
  slot.reviewStatus = ESTADO_TO_REVIEW_STATUS[resolved] || "A revisar";
  if (resolved === "Disponible" && slot.student) {
    slot.student = null;
  }
}

function sanitiseForCreate(input = {}) {
  const payload = buildPersistencePayload(input);
  const base = {
    cohort: payload.cohort ?? coerceNumber(input.cohort) ?? 1,
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
    payload.reviewStatus ?? ESTADO_TO_REVIEW_STATUS[base.estado] ?? "A revisar";
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
