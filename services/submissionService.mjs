import repositorioEntrega from "../repository/submissionRepository.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Assignment } from "../models/Assignment.mjs";

export const crearEntrega = async (slotId, user, body) => {
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

  const comentarios =
    typeof body.comentarios === "string" ? body.comentarios.trim() : "";
  const renderLinkRaw =
    typeof body.renderLink === "string" ? body.renderLink.trim() : "";

  return await repositorioEntrega.crear({
    assignment: slot.assignment,
    student: user.id,
    githubLink,
    comentarios,
    renderLink: renderLinkRaw || null,
  });
};

export const obtenerEntregasPorUsuario = async (userId, viewer) => {
  if (viewer.role === "alumno" && viewer.id !== userId) {
    throw {
      status: 403,
      message: "No autorizado a consultar entregas de otro alumno",
    };
  }

  return await repositorioEntrega.obtenerPorEstudiante(userId);
};

export const obtenerEntregaPorId = async (id, viewer) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const esPropia =
    entrega.student && entrega.student.toString() === viewer.id;

  if (esPropia || viewer.role === "superadmin") {
    return entrega;
  }

  if (viewer.role === "profesor") {
    const assignment = await Assignment.findById(entrega.assignment).lean();
    if (assignment?.createdBy?.toString() === viewer.id) {
      return entrega;
    }
  }

  throw { status: 403, message: "No autorizado a ver esta entrega" };
};

export const actualizarEntrega = async (id, data, user) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const esPropia =
    entrega.student && entrega.student.toString() === user.id;
  const esProfesor = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesor) {
    throw {
      status: 403,
      message: "No autorizado a modificar esta entrega",
    };
  }

  if (["aprobado", "desaprobado"].includes(entrega.reviewStatus) && user.role === "alumno") {
    throw {
      status: 409,
      message: "No se puede modificar una entrega ya evaluada",
    };
  }

  const actualizacion = {};

  if (data.githubLink || data.link) {
    const linkEntrada =
      typeof data.githubLink === "string"
        ? data.githubLink
        : typeof data.link === "string"
        ? data.link
        : "";
    const linkNormalizado = linkEntrada.trim();
    if (!linkNormalizado) {
      throw {
        status: 400,
        message: "El enlace de GitHub es obligatorio",
      };
    }
    actualizacion.githubLink = linkNormalizado;
  }

  if (data.comentarios !== undefined) {
    actualizacion.comentarios =
      typeof data.comentarios === "string"
        ? data.comentarios.trim()
        : "";
  }

  if (data.renderLink !== undefined) {
    if (typeof data.renderLink === "string") {
      actualizacion.renderLink = data.renderLink.trim() || null;
    } else {
      actualizacion.renderLink = null;
    }
  }

  if (data.reviewStatus && user.role !== "alumno") {
    const validos = ["revisar", "aprobado", "desaprobado"];
    const estadoNormalizado = data.reviewStatus
      ? data.reviewStatus.toString().trim().toLowerCase()
      : "";
    if (!validos.includes(estadoNormalizado)) {
      throw { status: 400, message: "Estado de revision no valido" };
    }
    actualizacion.reviewStatus = estadoNormalizado;
  }

  return await repositorioEntrega.actualizar(id, actualizacion);
};

export const eliminarEntrega = async (id, user) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw { status: 404, message: "Entrega no encontrada" };

  const esPropia =
    entrega.student && entrega.student.toString() === user.id;
  const esProfesor = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesor) {
    throw {
      status: 403,
      message: "No autorizado a eliminar esta entrega",
    };
  }

  return await repositorioEntrega.eliminar(id);
};
