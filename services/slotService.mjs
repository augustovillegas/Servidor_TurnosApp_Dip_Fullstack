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
} from "../utils/normalizers/normalizers.mjs";
import { REVIEW_STATUS_CANONICAL } from '../constants/constantes.mjs';
import { buildModuleFilter } from "../utils/permissionUtils.mjs";

export async function crear(data, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.role)) {
    throw { status: 403, message: "No autorizado" };
  }

  // El 'cohorte' del turno SIEMPRE debe ser el Módulo del profesor logueado.
  const moduleValue = Number(
    usuario?.moduleNumber ?? usuario?.moduleCode ?? usuario?.cohorte
  );
  const moduleLabel = data?.modulo || usuario?.modulo || null;

  if (!moduleLabel) {
    throw { status: 400, message: "El campo 'modulo' es requerido" };
  }

  const payload = {
    ...data,
    cohorte: moduleValue, // ¡Forzamos el Módulo del turno!
    modulo: moduleLabel, // Capturar módulo del profesor
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

  const creado = await slotRepository.crear(payload);
  return toFrontend(creado);
}

export async function solicitarTurno(idTurno, usuario) {
  // Solo alumnos pueden solicitar turnos
  if (usuario.role !== "alumno") {
    throw { status: 403, message: "Solo alumnos pueden solicitar turnos" };
  }
  // Debe estar aprobado
  if (usuario.status !== "Aprobado") {
    throw { status: 403, message: "Tu cuenta debe ser aprobada" };
  }

  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (turno.student) {
    throw { status: 403, message: "Turno ya reservado" };
  }

  // Aislamiento de cohorte (usar Number para comparación robusta)
  if (
    Number(turno.cohorte) !==
    Number(usuario.moduleNumber ?? usuario.moduleCode ?? usuario.cohorte)
  ) {
    throw { status: 403, message: "Modulo no coincide" };
  }

  turno.student = usuario.id;
  // Actualizar estado del slot cuando se solicita
  turno.estado = "Solicitado";
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
  turno.reviewStatus = "A revisar";
  await turno.save();
  return toFrontend(turno);
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
  return toFrontend(turno);
}

export async function obtenerPorUsuario(usuarioId) {
  return await slotRepository.obtenerTodos({ student: usuarioId });
}

export async function obtenerTurnosPorFiltro(query = {}, usuario) {
  // Usar utilidad centralizada para generar filtro base con permisos
  const filtro = buildModuleFilter(usuario, { queryFilters: query });

  // --- Filtro adicional por reviewNumber ---
  const reviewValue = coerceNumber(query.review);
  if (reviewValue !== undefined) {
    filtro.reviewNumber = reviewValue;
  }

  // --- FILTRO ESPECÍFICO PARA ALUMNOS ---
  if (usuario.role === "alumno") {
    // Alumno: Solo ve turnos de su cohorte que estén disponibles o propios
    const userId = new mongoose.Types.ObjectId(usuario.id);
    const finalFilter = {};
    if (filtro.cohorte !== undefined) {
      finalFilter.cohorte = filtro.cohorte;
    }
    if (filtro.reviewNumber !== undefined) {
      finalFilter.reviewNumber = filtro.reviewNumber;
    }
    // Usar estado Disponible como criterio de disponibilidad en lugar de student:null
    finalFilter.$or = [
      { estado: "Disponible" },
      { student: userId }
    ];
    const raw = await slotRepository.obtenerTodos(finalFilter);
    // Post-filtrado defensivo: asegurar que no entren turnos reservados por otros alumnos
    const filtrados = raw.filter(slot => {
      const stu = slot.student;
      if (!stu) return true; // disponible
      const stuId = typeof stu === 'object' && stu._id ? String(stu._id) : String(stu);
      // Excluir slots solicitados por otros alumnos
      if (stuId !== String(usuario.id)) return false;
      return true; // propio
    });
    // Normalizar student a su _id para cumplir expectativas de comparación
    const normalizados = filtrados.map(s => {
      if (s.student && typeof s.student === 'object' && s.student._id) {
        const clone = { ...s.toObject() };
        clone.student = s.student._id;
        return clone;
      }
      return s;
    });
    // Mapear a DTO uniforme
    return normalizados.map(toFrontend);
  }
  
  // Profesor y Superadmin: Ven todos los turnos del módulo ya filtrado.
  const raw = await slotRepository.obtenerTodos(filtro);
  return raw.map(toFrontend);
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
    payload.cohorte = moduloValue;
  }

  const cohortValue = coerceNumber(input.cohorte ?? input.cohort);
  if (cohortValue !== undefined) {
    payload.cohorte = cohortValue;
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
  if (payload.cohorte !== undefined) slot.cohorte = payload.cohorte;
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
    cohorte: payload.cohorte ?? coerceNumber(input.cohorte ?? input.cohort) ?? 1,
    modulo: input.modulo ?? payload.modulo,
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
  const cohortValue = coerceNumber(query.cohorte ?? query.cohort);
  if (cohortValue !== undefined) {
    filtro.cohorte = cohortValue;
  }
  const reviewValue = coerceNumber(query.review);
  if (reviewValue !== undefined) {
    filtro.reviewNumber = reviewValue;
  }
  if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
    filtro.student = query.userId;
  }
  
  // [CORRECCIÓN 3] Aplicar filtro de estado directamente en la query de Mongoose
  if (query.estado && VALID_ESTADOS.includes(query.estado)) {
    filtro.estado = query.estado;
  }

  const raw = await slotRepository.obtenerTodos(filtro);
  let mapped = raw.map(toFrontend);

  // Solo mantener filtro de userId invalido (edge case)
  if (query.userId && !mongoose.Types.ObjectId.isValid(query.userId)) {
    const userFilter = query.userId.toString().trim();
    mapped = mapped.filter((slot) => slot.solicitanteId === userFilter);
  }

  // [CORRECCIÓN 3] ELIMINADO: Filtrado redundante post-fetch de modulo y estado
  // El filtro de cohort ya se aplicó en la DB, y el modulo se deriva del cohort

  return mapped;
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

  const payload = buildPersistencePayload(data);
  applyPayloadToDocument(slot, payload, data?.estado);
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
