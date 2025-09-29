import repositorioEntrega from "../repository/submissionRepository.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Assignment } from "../models/Assignment.mjs";

export const crearEntrega = async (slotId, user, body) => {
  const slot = await ReviewSlot.findById(slotId);
  if (!slot) throw new Error("Turno no encontrado");

  if (!slot.student || slot.student.toString() !== user.id) {
    throw new Error("Debes reservar el turno antes de entregar");
  }

  const githubLink = body.githubLink || body.link;
  if (!githubLink) throw new Error("El enlace de GitHub es obligatorio");

  return await repositorioEntrega.crear({
    assignment: slot.assignment,
    student: user.id,
    githubLink: githubLink,
    comentarios: body.comentarios?.trim() || "",
    renderLink: body.renderLink || null,
  });
};

export const obtenerEntregasPorUsuario = async (userId, viewer) => {
  if (viewer.role === "alumno" && viewer.id !== userId) {
    throw new Error("No autorizado a consultar entregas de otro alumno");
  }

  return await repositorioEntrega.obtenerPorEstudiante(userId);
};

export const obtenerEntregaPorId = async (id, viewer) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw new Error("Entrega no encontrada");

  const esPropia = entrega.student.toString() === viewer.id;

  if (esPropia || viewer.role === "superadmin") {
    return entrega;
  }

  if (viewer.role === "profesor") {
    const assignment = await Assignment.findById(entrega.assignment).lean();
    if (assignment?.createdBy?.toString() === viewer.id) {
      return entrega;
    }
  }

  throw new Error("No autorizado a ver esta entrega");
};

export const actualizarEntrega = async (id, data, user) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw new Error("Entrega no encontrada");

  const esPropia = entrega.student.toString() === user.id;
  const esProfesor = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesor) {
    throw new Error("No autorizado a modificar esta entrega");
  }

  if (["aprobado", "desaprobado"].includes(entrega.reviewStatus) && user.role === "alumno") {
    throw new Error("No se puede modificar una entrega ya evaluada");
  }

  const actualizacion = {};

  if (data.githubLink || data.link) {
    actualizacion.githubLink = data.githubLink || data.link;
  }

  if (data.comentarios !== undefined) {
    actualizacion.comentarios = data.comentarios.trim();
  }

  if (data.renderLink !== undefined) {
    actualizacion.renderLink = data.renderLink || null;
  }

  if (data.reviewStatus && user.role !== "alumno") {
    const validos = ["revisar", "aprobado", "desaprobado"];
    if (!validos.includes(data.reviewStatus)) {
      throw new Error("Estado de revisión no válido");
    }
    actualizacion.reviewStatus = data.reviewStatus;
  }

  return await repositorioEntrega.actualizar(id, actualizacion);
};

export const eliminarEntrega = async (id, user) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw new Error("Entrega no encontrada");

  const esPropia = entrega.student.toString() === user.id;
  const esProfesor = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesor) {
    throw new Error("No autorizado a eliminar esta entrega");
  }

  return await repositorioEntrega.eliminar(id);
};

