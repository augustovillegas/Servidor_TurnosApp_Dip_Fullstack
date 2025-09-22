import assignmentRepository from "../repository/assignmentRepository.mjs";

export const crearAsignacion = async (data) => {
  return await assignmentRepository.crear(data);
};

export const obtenerTodasAsignaciones = async () => {
  return await assignmentRepository.obtenerTodos();
};

export const obtenerAsignacionPorId = async (id) => {
  return await assignmentRepository.obtenerPorId(id);
};

export const actualizarAsignacion = async (id, data) => {
  return await assignmentRepository.actualizar(id, data);
};

export const eliminarAsignacion = async (id) => {
  return await assignmentRepository.eliminar(id);
};


