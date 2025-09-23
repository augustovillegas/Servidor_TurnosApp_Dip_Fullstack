import repositorioEntrega from "../repository/submissionRepository.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";

export const crearEntrega = async (slotId, user, body) => {
  const slot = await ReviewSlot.findById(slotId);
  if (!slot) {
    throw new Error("Turno no encontrado");
  }

  return await repositorioEntrega.crear({
    assignment: slot.assignment,
    student: user.id,
    githubLink: body.link,
    comentarios: body.comentarios,
  });
};

export const obtenerEntregasPorUsuario = async (userId) => {
  return await repositorioEntrega.obtenerPorEstudiante(userId);
};

export const obtenerEntregaPorId = async (id) => {
  return await repositorioEntrega.obtenerPorId(id);
};

export const actualizarEntrega = async (id, data, user) => {
  const entrega = await repositorioEntrega.obtenerPorId(id);
  if (!entrega) throw new Error("Entrega no encontrada");

  const esPropia = entrega.student.toString() === user.id;
  const esProfesor = ["profesor", "superadmin"].includes(user.role);

  if (!esPropia && !esProfesor) {
    throw new Error("No autorizado a modificar esta entrega");
  }

  if (["aprobado", "desaprobado"].includes(entrega.reviewStatus)) {
    throw new Error("No se puede modificar una entrega ya evaluada");
  }

  return await repositorioEntrega.actualizar(id, data);
};

export const eliminarEntrega = async (id) => {
  return await repositorioEntrega.eliminar(id);
};


