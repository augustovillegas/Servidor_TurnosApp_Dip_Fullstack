import userRepository from "../repository/userRepository.mjs";
import mongoose from "mongoose";
import { register } from "./authService.mjs";
import { ensureModuleLabel, labelToModule } from "../utils/moduleMap.mjs";
import { mapToFrontend, mapUsers } from "../utils/mappers/userMapper.mjs";
import { normaliseRole, normaliseEstado } from "../utils/common/normalizers.mjs";
import { buildUserListFilter } from "../utils/permissionUtils.mjs";

export const getUserByEmail = async (email) => {
  return await userRepository.obtenerPorEmail(email);
};

export const getUserById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 401, message: "Sesion invalida" };
  }
  const user = await userRepository.obtenerPorId(id);
  if (!user) throw { status: 401, message: "Sesion invalida" };
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

export const listarUsuarios = async (user, query = {}) => {
  const normalizedQuery = { ...query };
  const filtro = buildUserListFilter(user, normalizedQuery);

  if (user.rol === "superadmin" && normalizedQuery.modulo) {
    const moduloNormalizado = ensureModuleLabel(normalizedQuery.modulo);
    if (moduloNormalizado) {
      filtro.modulo = moduloNormalizado;
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

  const moduloSeleccionado = ensureModuleLabel(data.modulo);
  if (!moduloSeleccionado) {
    throw { status: 400, message: "El modulo es obligatorio" };
  }

  const cohorte = Number.isFinite(Number(data.cohorte))
    ? Number(data.cohorte)
    : labelToModule(moduloSeleccionado) ?? 1;

  const creado = await register({
    nombre: data.nombre,
    email: data.email,
    password: data.password,
    modulo: moduloSeleccionado,
    cohorte,
    rol,
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
    usuario.nombre = data.nombre ? data.nombre.toString().trim() : usuario.nombre;
  }
  if (data.email !== undefined) {
    usuario.email = data.email.toString().trim().toLowerCase();
  }

  const rol = normaliseRole(data.rol);
  if (rol) {
    usuario.rol = rol;
  }

  if (data.cohorte !== undefined) {
    const cohorte = Number(data.cohorte);
    if (Number.isFinite(cohorte)) {
      usuario.cohorte = cohorte;
    }
  }

  if (data.modulo !== undefined) {
    const moduloSeleccionado = ensureModuleLabel(data.modulo);
    if (moduloSeleccionado) {
      usuario.modulo = moduloSeleccionado;
      if (data.cohorte === undefined) {
        const cohorte = labelToModule(moduloSeleccionado);
        if (Number.isFinite(cohorte)) {
          usuario.cohorte = cohorte;
        }
      }
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
