import assignmentRepository from "../repository/assignmentRepository.mjs";
import { resolveModuleMetadata } from "../utils/moduleMap.mjs";

export const crearAsignacion = async (body, user) => {
    
  if (!["profesor", "superadmin"].includes(user.role)) {
    throw new Error("Solo profesores o superadmin pueden crear asignaciones");
  }

  const { title, description, dueDate, module } = body; 
  const moduleInfo = resolveModuleMetadata({
    module,
    cohort: body.cohort ?? user?.cohort,
  });

  const nueva = await assignmentRepository.crear({
    module: moduleInfo.code,
    modulo: moduleInfo.label,
    title,
    description,
    dueDate: new Date(dueDate),
    cohort: moduleInfo.code,
    createdBy: user.id,
  });

  return nueva;
};

export const obtenerTodasAsignaciones = async (user) => {
  const filtro = user.role === "profesor" && user.id ? { createdBy: user.id }: {};
  return await assignmentRepository.obtenerTodos(filtro);
};

export const obtenerAsignacionPorId = async (id) => {
  return await assignmentRepository.obtenerPorId(id);
};

export const actualizarAsignacion = async (id, body, user) => {
  const asignacion = await assignmentRepository.obtenerPorId(id);
  if (!asignacion) throw new Error("Asignación no encontrada");

  if (user.role !== "superadmin" && asignacion.createdBy?.toString() !== user.id) {
    throw new Error("No autorizado a modificar esta asignación");
  }
  
  const { title, description, dueDate } = body;
  const data = {
    ...(title && { title }),
    ...(description && { description }),
    ...(dueDate && { dueDate: new Date(dueDate) }),
  };
  return await assignmentRepository.actualizar(id, data);
};

export const eliminarAsignacion = async (id, user) => {
  const asignacion = await assignmentRepository.obtenerPorId(id);
  if (!asignacion) throw new Error("Asignación no encontrada");
  
  if (user.role !== "superadmin" && asignacion.createdBy?.toString() !== user.id) {
    throw new Error("No autorizado a eliminar esta asignación");
  }

  return await assignmentRepository.eliminar(id);
};
