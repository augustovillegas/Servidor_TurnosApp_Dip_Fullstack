import userRepository from "../repository/userRepository.mjs";
import mongoose from "mongoose";
import { register } from "./authService.mjs";
import {
  ensureModuleLabel,
  labelToModule,
  resolveModuleMetadata,
} from "../utils/moduleMap.mjs";
import {
  mapToFrontend,
  mapUsers,
  getUserModuleLabel,
  mapEstado,
} from "../utils/mappers/userMapper.mjs";
import {
  normaliseRole,
  normaliseEstado,
} from "../utils/common/normalizers.mjs";
import { buildUserListFilter } from "../utils/permissionUtils.mjs";

function applyModuleInfo(target, moduleInfo) {
  if (!moduleInfo) return;
  if (moduleInfo.label) target.modulo = moduleInfo.label;
  if (Number.isFinite(moduleInfo.code)) {
    target.moduleCode = moduleInfo.code;
  }
}

export const getUserByEmail = async (email) => {
  return await userRepository.obtenerPorEmail(email);
};

/**
 * 🔑 Función centralizada para obtener usuario por ID.
 * Única fuente de verdad para getUserById en toda la aplicación.
 */
export const getUserById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 401, message: "Sesión inválida" };
  }
  const user = await userRepository.obtenerPorId(id);
  if (!user) throw { status: 401, message: "Sesión inválida" };
  return user;
};

export const createUser = async (data) => {
  return await userRepository.crear(data);
};

export const updateUser = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const actualizado = await userRepository.actualizar(id, data);
  if (!actualizado) throw { status: 404, message: "Usuario no encontrado" };
  return actualizado;
};

export const deleteUser = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const eliminado = await userRepository.eliminar(id);
  if (!eliminado) throw { status: 404, message: "Usuario no encontrado" };
  return eliminado;
};

/**
 * 🔑 Función MAESTRA para listado de usuarios.
 * Centraliza toda la lógica de permisos de módulo y filtros.
 * Única fuente de verdad para listar usuarios en toda la aplicación.
 */
export const listarUsuarios = async (user, query = {}) => {
  // Usar utilidad centralizada para generar filtro con permisos
  const filtro = buildUserListFilter(user, query);
  
  // Si hay filtro de módulo en query (para superadmin)
  if (user.role === "superadmin") {
    if (query.modulo || query.moduleLabel) {
      const moduloNormalizado = ensureModuleLabel(query.modulo || query.moduleLabel);
      const cohortCode = labelToModule(moduloNormalizado);
      if (cohortCode !== undefined) {
        filtro.cohorte = cohortCode;
      }
    }
  }

  return await userRepository.obtenerTodos(filtro).then(mapUsers);
};

export async function obtenerUsuario(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const usuario = await userRepository.obtenerPorId(id);
  if (!usuario) throw { status: 404, message: "Usuario no encontrado" };
  return mapToFrontend(usuario);
}

export async function crearUsuario(data) {
  if (!data?.nombre) throw { status: 400, message: "El nombre es obligatorio" };
  if (!data?.email) throw { status: 400, message: "El email es obligatorio" };
  if (!data?.password) throw { status: 400, message: "La contrasena es obligatoria" };

  const rol = normaliseRole(data.rol) || "alumno";
  const estado = normaliseEstado(data.estado) || "Pendiente";

  // Use moduleNumber / moduleCode; fallback to modulo label
  let code = Number(data.moduleNumber ?? data.moduleCode);
  if (!Number.isFinite(code)) {
    const moduloSeleccionado = ensureModuleLabel(data.modulo);
    if (moduloSeleccionado) {
      const derivado = labelToModule(moduloSeleccionado);
      if (Number.isFinite(derivado)) code = derivado;
    }
  }
  if (!Number.isFinite(code)) code = 1; // valor por defecto

  // Cohorte independiente: si viene explícita, úsala; si no, usar el código resuelto
  let cohortValue = Number(data.cohorte ?? data.cohort);
  if (!Number.isFinite(cohortValue)) {
    cohortValue = code;
  }

  const creado = await register({
    name: data.nombre,
    email: data.email,
    password: data.password,
    cohort: cohortValue,
    moduleNumber: code,
    role: rol,
  });

  if (estado !== "Pendiente") {
    await userRepository.actualizar(creado._id || creado.id, {
      status: estado,
    });
  }

  const final = await userRepository.obtenerPorId(creado._id || creado.id);
  return mapToFrontend(final);
}

export async function actualizarUsuario(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const usuario = await userRepository.obtenerPorId(id);
  if (!usuario) throw { status: 404, message: "Usuario no encontrado" };

  if (data.nombre !== undefined) {
    usuario.name = data.nombre ? data.nombre.toString().trim() : usuario.name;
  }
  if (data.email !== undefined) {
    usuario.email = data.email.toString().trim().toLowerCase();
  }

  const rol = normaliseRole(data.rol);
  if (rol) {
    usuario.role = rol;
  }

  // Cohorte independiente: actualizar si viene
  if (data.cohorte !== undefined || data.cohort !== undefined) {
    const cohortValue = Number(data.cohorte ?? data.cohort);
    if (Number.isFinite(cohortValue)) {
      usuario.cohorte = cohortValue;
    }
  }

  if (data.moduleNumber !== undefined || data.moduleCode !== undefined) {
    const code = Number(data.moduleNumber ?? data.moduleCode);
    if (Number.isFinite(code)) {
      const moduleInfo = resolveModuleMetadata({ cohort: code });
      applyModuleInfo(usuario, moduleInfo);
    }
  } else if (data.modulo !== undefined) {
    const moduloSeleccionado = ensureModuleLabel(data.modulo);
    if (moduloSeleccionado) {
      const moduleInfo = resolveModuleMetadata({ modulo: moduloSeleccionado });
      applyModuleInfo(usuario, moduleInfo);
    }
  }

  const estado = normaliseEstado(data.estado);
  if (estado) {
    usuario.status = estado;
  }

  await usuario.save();
  return mapToFrontend(usuario);
}

export async function eliminarUsuario(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const eliminado = await userRepository.eliminar(id);
  if (!eliminado) throw { status: 404, message: "Usuario no encontrado" };
  return eliminado;
}
