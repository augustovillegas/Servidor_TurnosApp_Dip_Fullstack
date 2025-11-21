import assignmentRepository from "../repository/assignmentRepository.mjs";
import { resolveModuleMetadata } from "../utils/moduleMap.mjs";

export const crearAsignacion = async (body, user) => {
  if (!["profesor", "superadmin"].includes(user.role)) {
    throw new Error("Solo profesores o superadmin pueden crear asignaciones");
  }

  // El schema usa 'cohorte' (number) y 'modulo' (label). Forzamos a los del usuario.
  const moduleCode = Number(user.cohort);
  if (!Number.isFinite(moduleCode)) {
    throw new Error("El profesor no tiene un módulo asignado.");
  }

  const { title, description, dueDate } = body;
  const moduleInfo = resolveModuleMetadata({ cohort: moduleCode });

  const nueva = await assignmentRepository.crear({
    cohorte: moduleInfo.code,
    modulo: moduleInfo.label,
    title,
    description,
    dueDate: new Date(dueDate),
    createdBy: user.id,
  });

  return nueva;
};

export const obtenerTodasAsignaciones = async (user) => {
  const moduloActual = Number(user.cohort);
  let filtro = {};

  if (user.role === "superadmin") {
    filtro = {};
  } else if (user.role === "profesor" && user.id && Number.isFinite(moduloActual)) {
    // Profesor: solo SUS asignaciones de SU módulo
    filtro = { createdBy: user.id, cohorte: moduloActual };
  } else if (user.role === "alumno" && Number.isFinite(moduloActual)) {
    // Alumno: todas las asignaciones de su módulo
    filtro.cohorte = moduloActual;
  } else {
    throw { status: 403, message: "No autorizado" };
  }

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
