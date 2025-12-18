import mongoose from "mongoose";
import repositorioEntrega from "../repository/submissionRepository.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { Submission } from "../models/Submission.mjs";
import { ensureModuleLabel, moduleToLabel, labelToModule } from "../utils/moduleMap.mjs";
import { toFrontend, extractEstado } from "../utils/mappers/submissionMapper.mjs";
import {
  coerceNumber,
  normaliseString,
  normaliseReviewStatus,
} from "../utils/normalizers/normalizers.mjs";
import { FINAL_STATES, ESTADO_DEFAULT } from "../constants/constantes.mjs";
import { buildModuleFilter } from "../utils/permissionUtils.mjs";

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
  if (data.assignment !== undefined && mongoose.Types.ObjectId.isValid(data.assignment)) {
    payload.assignment = data.assignment;
  }
  if (data.student !== undefined && mongoose.Types.ObjectId.isValid(data.student)) {
    payload.student = data.student;
  }
  if (data.modulo !== undefined) {
    const moduloSeleccionado = ensureModuleLabel(data.modulo);
    if (moduloSeleccionado) {
      payload.modulo = moduloSeleccionado;
      const cohorte = labelToModule(moduloSeleccionado);
      if (Number.isFinite(cohorte)) {
        payload.cohorte = cohorte;
      }
    }
  }
  if (data.alumnoNombre !== undefined) {
    payload.alumnoNombre = normaliseString(data.alumnoNombre);
  }

  let estado = null;
  if (data.reviewStatus !== undefined) {
    estado = normaliseReviewStatus(data.reviewStatus, { defaultValue: null });
  }
  if (!estado && data.estado !== undefined) {
    estado = normaliseReviewStatus(data.estado, { defaultValue: null });
  }
  if (estado) {
    payload.estado = estado;
    payload.reviewStatus = estado;
  }

  return payload;
}

export const crearEntrega = async (slotId, user, body) => {
  if (!["alumno"].includes(user.rol)) {
    throw {
      status: 403,
      message: "Solo los alumnos pueden crear entregas de revision",
    };
  }

  const slot = await ReviewSlot.findById(slotId);
  if (!slot) throw { status: 404, message: "Turno no encontrado" };

  if (!slot.student || slot.student.toString() !== user.id) {
    throw { status: 403, message: "Debes reservar el turno antes de entregar" };
  }

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
    throw { status: 404, message: "Asignacion asociada no encontrada" };
  }

  const moduleLabel = assignment.modulo || moduleToLabel(assignment.cohorte);

  const nuevaEntrega = await repositorioEntrega.crear({
    assignment: slot.assignment,
    student: user.id,
    githubLink,
    renderLink: normaliseString(body.renderLink) || null,
    comentarios: normaliseString(body.comentarios) || "",
    reviewStatus: ESTADO_DEFAULT,
    estado: ESTADO_DEFAULT,
    alumnoNombre: user.nombre,
    modulo: moduleLabel,
    cohorte: assignment.cohorte ?? null,
  });

  return toFrontend(nuevaEntrega);
};

export const listarEntregas = async (user, query) => {
  if (user.rol === "alumno" || user.rol === "superadmin") {
    const filtro = buildModuleFilter(user, {
      queryFilters: query,
      studentField: user.rol === "alumno" ? "student" : null,
    });
    const results = await repositorioEntrega.obtenerTodos(filtro);
    return results.map(toFrontend);
  }

  if (user.rol === "profesor") {
    const moduloActual = user.modulo;
    if (!moduloActual || typeof moduloActual !== "string") return [];

    const { User } = await import("../models/User.mjs");
    const alumnosModulo = await User.find({
      $and: [{ rol: "alumno" }, { modulo: moduloActual }],
    }).select("_id");

    if (!alumnosModulo.length) return [];
    const ids = alumnosModulo.map((a) => a._id);

    const results = await repositorioEntrega.obtenerTodos({ student: { $in: ids } });
    return results.map(toFrontend);
  }

  return [];
};

export const obtenerEntregasPorUsuario = async (userId, user) => {
  if (user.rol === "alumno" && user.id !== userId) {
    throw { status: 403, message: "No autorizado a ver las entregas de otros alumnos" };
  }

  if (user.rol === "profesor") {
    const userRepository = await import("../repository/userRepository.mjs").then((m) => m.default);
    const student = await userRepository.obtenerPorId(userId);

    if (!student || student.modulo !== user.modulo) {
      throw { status: 403, message: "El alumno no pertenece a su modulo" };
    }
  }

  const submissions = await repositorioEntrega.obtenerPorEstudiante(userId);
  return submissions.map(toFrontend);
};

export const obtenerEntregaPorId = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Entrega no encontrada" };
  }

  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const studentId = entrega.student?._id?.toString() ?? entrega.student?.toString();
  const esPropia = studentId === user.id;
  const esProfesorOAdmin = ["profesor", "superadmin"].includes(user.rol);

  if (!esPropia && !esProfesorOAdmin) {
    throw { status: 403, message: "No autorizado para ver esta entrega" };
  }

  return toFrontend(entrega);
};

export const actualizarEntrega = async (id, body, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Entrega no encontrada" };
  }

  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const studentId = entrega.student?._id?.toString() ?? entrega.student?.toString();
  const esPropia = studentId === user.id;
  const esProfesorOAdmin = ["profesor", "superadmin"].includes(user.rol);

  const actualizacion = {};

  if (!esPropia && !esProfesorOAdmin) {
    throw { status: 403, message: "No autorizado para modificar esta entrega" };
  }

  if (esPropia && !esProfesorOAdmin) {
    const estadoActualCanonico = extractEstado(entrega);
    if (FINAL_STATES.has(estadoActualCanonico)) {
      throw {
        status: 409,
        message: `No se puede modificar una entrega ya evaluada (${estadoActualCanonico}).`,
      };
    }

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

    if (Object.keys(actualizacion).length > 0) {
      actualizacion.reviewStatus = ESTADO_DEFAULT;
      actualizacion.estado = ESTADO_DEFAULT;
    }
  } else if (esProfesorOAdmin) {
    const payload = buildAdminPayload(body);
    Object.assign(actualizacion, payload);

    if (payload.reviewStatus) {
      actualizacion.estado = payload.reviewStatus;
    }
  }

  if (Object.keys(actualizacion).length === 0) {
    return toFrontend(entrega);
  }

  const actualizado = await repositorioEntrega.actualizar(id, actualizacion);

  const final = await Submission.findById(actualizado._id)
    .populate("student", "nombre rol modulo cohorte")
    .populate("assignment", "cohorte modulo title");

  return toFrontend(final);
};

export const eliminarEntrega = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Entrega no encontrada" };
  }

  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const studentId = entrega.student?._id?.toString() ?? entrega.student?.toString();
  const esPropia = studentId === user.id;
  const esProfesorOAdmin = ["profesor", "superadmin"].includes(user.rol);

  if (!esPropia && !esProfesorOAdmin) {
    throw { status: 403, message: "No autorizado para eliminar esta entrega" };
  }

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
