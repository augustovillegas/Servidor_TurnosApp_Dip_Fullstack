import assignmentRepository from "../repository/assignmentRepository.mjs";
import mongoose from "mongoose";
import { resolveModuleMetadata } from "../utils/moduleMap.mjs";
import { buildModuleFilter } from "../utils/permissionUtils.mjs";

export const crearAsignacion = async (body, user) => {
  if (!["profesor", "superadmin"].includes(user.role)) {
    throw { status: 403, message: "Solo profesores o superadmin pueden crear asignaciones" };
  }

  // Usar moduleNumber / moduleCode; fallback a cohorte
  const moduleCode = Number(user.moduleNumber ?? user.moduleCode ?? user.cohorte);
  if (!Number.isFinite(moduleCode)) {
    throw { status: 400, message: "El usuario no tiene un módulo asignado." };
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
  // Usar utilidad centralizada para generar filtro con permisos
  const filtro = buildModuleFilter(user, {});
  return await assignmentRepository.obtenerTodos(filtro);
};

export const obtenerAsignacionPorId = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Asignación no encontrada" };
  }
  const asignacion = await assignmentRepository.obtenerPorId(id);
  if (!asignacion) throw { status: 404, message: "Asignación no encontrada" };
  
  // Verificar permisos por módulo para profesores
  if (user && user.role === "profesor") {
    const profesorModule = Number(user.moduleNumber ?? user.moduleCode ?? user.cohorte);
    const assignmentModule = Number(asignacion.cohorte); // cohorte es Number, modulo es String
    
    if (profesorModule !== assignmentModule) {
      throw { status: 403, message: "No autorizado para ver asignaciones de otros módulos" };
    }
  }
  
  return asignacion;
};

export const actualizarAsignacion = async (id, body, user) => {
  const asignacion = await assignmentRepository.obtenerPorId(id);
  if (!asignacion) throw { status: 404, message: "Asignación no encontrada" };

  if (user.role !== "superadmin" && asignacion.createdBy?.toString() !== user.id) {
    throw { status: 403, message: "No autorizado a modificar esta asignación" };
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
  if (!asignacion) throw { status: 404, message: "Asignación no encontrada" };

  if (user.role !== "superadmin" && asignacion.createdBy?.toString() !== user.id) {
    throw { status: 403, message: "No autorizado a eliminar esta asignación" };
  }

  return await assignmentRepository.eliminar(id);
};
