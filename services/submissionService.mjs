import repositorioEntrega from "../repository/submissionRepository.mjs";

export const crearEntrega = async ({ assignment, githubLink, renderLink, studentId }) => {
  return await repositorioEntrega.crear({
    assignment,
    githubLink,
    renderLink,
    student: studentId,
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

  // Validar si el usuario es dueño o profesor/superadmin
  if (entrega.student.toString() !== user.id && user.role !== "profesor" && user.role !== "superadmin") {
    throw new Error("No autorizado a modificar esta entrega");
  }

  // Bloquear si ya fue evaluada
  if (["aprobado", "desaprobado"].includes(entrega.reviewStatus)) {
    throw new Error("No se puede modificar una entrega ya evaluada");
  }

  return await repositorioEntrega.actualizar(id, data);
};

export const eliminarEntrega = async (id) => {
  return await repositorioEntrega.eliminar(id);
};

