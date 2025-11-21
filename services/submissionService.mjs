import mongoose from "mongoose";
import repositorioEntrega from "../repository/submissionRepository.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { Submission } from "../models/Submission.mjs";
import { ensureModuleLabel, moduleToLabel } from "../utils/moduleMap.mjs";
import { toFrontend, extractEstado } from "../utils/mappers/submissionMapper.mjs";
import { coerceNumber, normaliseString, normaliseReviewStatus } from "../utils/common/normalizers.mjs";

const FINAL_STATES = new Set(["Aprobado", "Desaprobado"]);
const ESTADO_DEFAULT = "A revisar";

function buildAdminPayload(data) {
  const payload = {};

  if (data.githubLink !== undefined) {
    payload.githubLink = normaliseString(data.githubLink) || null;
  }
  if (data.renderLink !== undefined) {
    payload.renderLink = normaliseString(data.renderLink) || null;
  }
  if (data.comentarios !== undefined) {
    payload.comentarios = normaliseString(data.comentarios);
  }
  if (data.sprint !== undefined) {
    payload.sprint = coerceNumber(data.sprint);
  }
  if (
    data.assignment !== undefined &&
    mongoose.Types.ObjectId.isValid(data.assignment)
  ) {
    payload.assignment = data.assignment;
  }
  if (
    data.student !== undefined &&
    mongoose.Types.ObjectId.isValid(data.student)
  ) {
    payload.student = data.student;
  }
  if (data.module !== undefined) {
    const moduloSeleccionado = ensureModuleLabel(data.module);
    if (moduloSeleccionado) {
      payload.module = moduloSeleccionado;
    }
  }
  if (data.alumnoNombre !== undefined) {
    payload.alumnoNombre = normaliseString(data.alumnoNombre);
  }

  const estado =
    normaliseReviewStatus(data.estado) ||
    normaliseReviewStatus(data.reviewStatus);
  if (estado) {
    payload.estado = estado;
    payload.reviewStatus = estado;
  }

  return payload;
}

/**
 * 💡 Crea una entrega asociada a un turno (slotId). Solo para alumnos.
 * @param {string} slotId ID del turno al que se asocia la entrega.
 * @param {object} user Usuario autenticado (debe ser el alumno que reservó el turno).
 * @param {object} body Datos de la entrega (githubLink/link, renderLink, comentarios).
 */
export const crearEntrega = async (slotId, user, body) => {
  if (!["alumno"].includes(user.role)) {
    throw {
      status: 403,
      message: "Solo los alumnos pueden crear entregas de revisión",
    };
  }

  const slot = await ReviewSlot.findById(slotId);
  if (!slot) throw { status: 404, message: "Turno no encontrado" };

  if (!slot.student || slot.student.toString() !== user.id) {
    throw { status: 403, message: "Debes reservar el turno antes de entregar" };
  }

  // Normalizar el link de GitHub (acepta 'githubLink' o 'link')
  const githubLinkInput =
    typeof body.githubLink === "string"
      ? body.githubLink
      : typeof body.link === "string"
      ? body.link
      : "";
  const githubLink = githubLinkInput.trim();

  if (!githubLink) {
    throw { status: 400, message: "El enlace de GitHub es obligatorio" };
  }

  const assignment = await Assignment.findById(slot.assignment);
  if (!assignment) {
    throw { status: 404, message: "Asignación asociada no encontrada" };
  }

  // Assignment schema usa 'cohorte' y 'modulo'. Derivamos etiqueta.
  const moduleLabel = assignment.modulo || moduleToLabel(assignment.cohorte);

  // Crear la nueva entrega usando campo 'modulo' existente en Submission
  const nuevaEntrega = await repositorioEntrega.crear({
    assignment: slot.assignment,
    student: user.id,
    githubLink,
    renderLink: normaliseString(body.renderLink) || null,
    comentarios: normaliseString(body.comentarios) || "",
    reviewStatus: ESTADO_DEFAULT,
    estado: ESTADO_DEFAULT,
    alumnoNombre: user.name,
    modulo: moduleLabel,
  });

  return toFrontend(nuevaEntrega);
};

/**
 * 💡 Lista las entregas aplicando filtros de Rol y Módulo.
 * @param {object} user Usuario autenticado (para permisos y módulo).
 * @param {object} query Filtros opcionales de query.
 */
export const listarEntregas = async (user, query) => {
  const moduloActualCode = Number(user.cohort);
  let filtro = {};

  if (user.role === "superadmin") {
    if (query.cohort) {
      const label = moduleToLabel(coerceNumber(query.cohort));
      if (label) filtro.modulo = label;
    }
  } else if (["profesor", "alumno"].includes(user.role) && Number.isFinite(moduloActualCode)) {
    const label = moduleToLabel(moduloActualCode);
    if (label) filtro.modulo = label;
    if (user.role === "alumno") {
      filtro.student = user.id;
    }
  } else {
    throw { status: 403, message: "No autorizado" };
  }

  return await repositorioEntrega.obtenerTodos(filtro);
  };

/**
 * 💡 Obtiene entregas de un usuario (filtrado por rol y módulo).
 * @param {string} userId ID del alumno cuyas entregas se buscan.
 * @param {object} user Usuario autenticado (quien realiza la petición).
 */
export const obtenerEntregasPorUsuario = async (userId, user) => {
    // 1. Permiso: Un alumno solo puede ver sus propias entregas
    if (user.role === "alumno" && user.id !== userId) {
        throw { status: 403, message: "No autorizado a ver las entregas de otros alumnos" };
    }
    
    // 2. Módulo: El profesor solo puede ver entregas de alumnos de SU módulo
    if (user.role === "profesor") {
        // Asumo que tienes acceso a `userRepository` o alguna forma de obtener el usuario
        const userRepository = await import('../repository/userRepository.mjs').then(m => m.default);
        const student = await userRepository.obtenerPorId(userId);
        const moduloProfesor = Number(user.cohort);
        const moduloAlumno = Number(student?.cohort);
        
        if (!Number.isFinite(moduloProfesor) || moduloProfesor !== moduloAlumno) {
            throw { status: 403, message: "El alumno no pertenece a su módulo" };
        }
    }
    
    // Superadmin y Alumno viendo sus propias entregas pasan.
    return await repositorioEntrega.obtenerPorEstudiante(userId);
};

/**
 * 💡 Obtiene una entrega por su ID.
 * @param {string} id ID de la entrega.
 * @param {object} user Usuario autenticado (para permisos).
 */
export const obtenerEntregaPorId = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Entrega no encontrada" };
  }

  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const esPropia = entrega.student && entrega.student.toString() === user.id;
  const esProfesorOAdmin = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesorOAdmin) {
    throw { status: 403, message: "No autorizado para ver esta entrega" };
  }

  return toFrontend(entrega);
};

/**
 * 💡 Actualiza una entrega.
 * @param {string} id ID de la entrega a actualizar.
 * @param {object} body Datos a actualizar.
 * @param {object} user Usuario autenticado (para permisos).
 */
export const actualizarEntrega = async (id, body, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Entrega no encontrada" };
  }

  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const esPropia = entrega.student && entrega.student.toString() === user.id;
  const esProfesorOAdmin = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesorOAdmin) {
    throw { status: 403, message: "No autorizado para modificar esta entrega" };
  }

  const actualizacion = {};

  // Lógica para Alumnos: solo pueden modificar sus enlaces/comentarios si no está en estado final.
  if (esPropia && !esProfesorOAdmin) {
    const estadoActualCanonico = extractEstado(entrega);
    if (FINAL_STATES.has(estadoActualCanonico)) {
      throw {
        status: 400,
        message: `La entrega ya está en estado final (${estadoActualCanonico}) y no puede ser modificada por el alumno.`,
      };
    }

    // Un alumno solo puede actualizar githubLink, renderLink y comentarios
    const githubLinkInput =
      typeof body.githubLink === "string"
        ? body.githubLink
        : typeof body.link === "string"
        ? body.link
        : undefined;

    if (githubLinkInput !== undefined) {
      const linkNormalizado = githubLinkInput.trim();
      if (!linkNormalizado) {
        throw {
          status: 400,
          message: "El enlace de GitHub es obligatorio",
        };
      }
      actualizacion.githubLink = linkNormalizado;
    }

    if (body.comentarios !== undefined) {
      actualizacion.comentarios = normaliseString(body.comentarios);
    }

    if (body.renderLink !== undefined) {
      actualizacion.renderLink = normaliseString(body.renderLink) || null;
    }

    // Si se modifica algo, se restablece a "A revisar"
    if (Object.keys(actualizacion).length > 0) {
      actualizacion.reviewStatus = ESTADO_DEFAULT;
      actualizacion.estado = ESTADO_DEFAULT;
    }
  } else if (esProfesorOAdmin) {
    // Lógica para Profesor/Admin: pueden modificar todos los campos mapeados
    const payload = buildAdminPayload(body);
    Object.assign(actualizacion, payload);

    if (payload.reviewStatus) {
      actualizacion.estado = payload.reviewStatus;
    }
  }

  if (Object.keys(actualizacion).length === 0) {
    return toFrontend(entrega); // No hay cambios, devuelve el original.
  }

  // Actualizar en la DB
  const actualizado = await repositorioEntrega.actualizar(id, actualizacion);

  // Obtener el objeto completo para mapear (incluyendo poblaciones)
  const final = await Submission.findById(actualizado._id)
    .populate("student", "name role")
    .populate("assignment", "cohorte modulo title");

  // Si el módulo se infirió de assignment y no se envió en el body, se actualiza el documento.
  if (final?.assignment?.cohorte) {
    const moduleLabel = moduleToLabel(final.assignment.cohorte);
    if (moduleLabel && final.modulo !== moduleLabel) {
      final.modulo = moduleLabel;
      await Submission.findByIdAndUpdate(id, { modulo: moduleLabel });
    }
  }

  return toFrontend(final);
};

/**
 * 💡 Elimina una entrega.
 * @param {string} id ID de la entrega a eliminar.
 * @param {object} user Usuario autenticado (para permisos).
 */
export const eliminarEntrega = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Entrega no encontrada" };
  }

  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const esPropia = entrega.student && entrega.student.toString() === user.id;
  const esProfesorOAdmin = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesorOAdmin) {
    throw { status: 403, message: "No autorizado para eliminar esta entrega" };
  }

  // Solo alumnos pueden eliminar si no ha sido Aprobado/Desaprobado
  if (esPropia && !esProfesorOAdmin) {
    const estadoActualCanonico = extractEstado(entrega);
    if (FINAL_STATES.has(estadoActualCanonico)) {
      throw {
        status: 400,
        message: `La entrega ya fue revisada (${estadoActualCanonico}) y no puede ser eliminada por el alumno.`,
      };
    }
  }

  const resultado = await repositorioEntrega.eliminar(id);
  return toFrontend(resultado);
};
