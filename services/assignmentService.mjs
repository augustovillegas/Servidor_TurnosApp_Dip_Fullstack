import assignmentRepository from "../repository/assignmentRepository.mjs";
import mongoose from "mongoose";
import { labelToModule } from "../utils/moduleMap.mjs";
import { buildModuleFilter } from "../utils/permissionUtils.mjs";

export const crearAsignacion = async (body, user) => {
  if (!["profesor", "superadmin"].includes(user.rol)) {
    throw { status: 403, message: "Solo profesores o superadmin pueden crear asignaciones" };
  }

  if (!user.modulo || typeof user.modulo !== "string") {
    throw { status: 400, message: "El usuario no tiene un modulo asignado." };
  }

  const { title, description, dueDate } = body;
  const cohorte = Number.isFinite(Number(user.cohorte))
    ? Number(user.cohorte)
    : labelToModule(user.modulo) ?? null;

  const nueva = await assignmentRepository.crear({
    modulo: user.modulo,
    cohorte,
    title,
    description,
    dueDate: new Date(dueDate),
    createdBy: user.id,
  });

  return nueva;
};

export const obtenerTodasAsignaciones = async (user) => {
  const filtro = buildModuleFilter(user, {});
  return await assignmentRepository.obtenerTodos(filtro);
};

export const obtenerAsignacionPorId = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Asignacion no encontrada" };
  }
  const asignacion = await assignmentRepository.obtenerPorId(id);
  if (!asignacion) throw { status: 404, message: "Asignacion no encontrada" };

  if (user && user.rol === "profesor") {
    if (asignacion.modulo !== user.modulo) {
      throw { status: 403, message: "No autorizado para ver asignaciones de otros modulos" };
    }
  }

  return asignacion;
};

export const actualizarAsignacion = async (id, body, user) => {
  const asignacion = await assignmentRepository.obtenerPorId(id);
  if (!asignacion) throw { status: 404, message: "Asignacion no encontrada" };

  if (user.rol !== "superadmin" && asignacion.createdBy?.toString() !== user.id) {
    throw { status: 403, message: "No autorizado a modificar esta asignacion" };
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
  if (!asignacion) throw { status: 404, message: "Asignacion no encontrada" };

  if (user.rol !== "superadmin" && asignacion.createdBy?.toString() !== user.id) {
    throw { status: 403, message: "No autorizado a eliminar esta asignacion" };
  }

  return await assignmentRepository.eliminar(id);
};
