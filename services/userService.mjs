import userRepository from "../repository/userRepository.mjs";
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

function applyModuleInfo(target, moduleInfo) {
  if (!moduleInfo) return;
  if (moduleInfo.label) {
    target.modulo = moduleInfo.label;
  }
  if (moduleInfo.slug) {
    target.moduloSlug = moduleInfo.slug;
  }
  if (Number.isFinite(moduleInfo.code)) {
    target.moduleCode = moduleInfo.code;
    target.cohort = moduleInfo.code;
  }
}

export const getUserByEmail = async (email) => {
  return await userRepository.obtenerPorEmail(email);
};

export const getUserById = async (id) => {
  return await userRepository.obtenerPorId(id);
};

export const createUser = async (data) => {
  return await userRepository.crear(data);
};

export const updateUser = async (id, data) => {
  return await userRepository.actualizar(id, data);
};

export const deleteUser = async (id) => {
  return await userRepository.eliminar(id);
};

export const listarUsuarios = async (user) => {
  let filtro = {};
  const moduloActual = Number(user.cohort);

  if (user.role === "superadmin") {
    // Superadmin: sin filtro, obtiene todos los usuarios.
    filtro = {};
  } else if (user.role === "profesor" && Number.isFinite(moduloActual)) {
    // Profesor: solo alumnos de SU módulo (cohort)
    filtro = {
      role: "alumno",
      cohort: moduloActual, // cohort es el Módulo
    };
  } else {
    // Otro rol (alumno) o profesor sin módulo asignado: Acceso denegado.
    throw { status: 403, message: "No autorizado" };
  }

  return await userRepository.obtenerTodos(filtro).then(mapUsers);
};

export async function obtenerUsuario(id) {
  const usuario = await userRepository.obtenerPorId(id);
  return mapToFrontend(usuario);
}

export async function crearUsuario(data) {
  if (!data?.nombre) {
    throw { status: 400, message: "El nombre es obligatorio" };
  }
  if (!data?.email) {
    throw { status: 400, message: "El email es obligatorio" };
  }
  if (!data?.password) {
    throw { status: 400, message: "La contrasena es obligatoria" };
  }

  const rol = normaliseRole(data.rol) || "alumno";
  const estado = normaliseEstado(data.estado) || "Pendiente";
  const moduloSeleccionado = ensureModuleLabel(data.modulo);
  const cohortDesdeModulo =
    moduloSeleccionado !== undefined && moduloSeleccionado !== null
      ? labelToModule(moduloSeleccionado)
      : undefined;
  let cohort = cohortDesdeModulo;
  if (cohort === undefined) {
    const parsed = Number(data.cohort);
    cohort = Number.isNaN(parsed) ? undefined : parsed;
  }
  if (cohort === undefined) {
    cohort = 1;
  }

  const creado = await register({
    name: data.nombre,
    email: data.email,
    password: data.password,
    cohort,
    role: rol,
  });

  if (estado !== "Pendiente") {
    await userRepository.actualizar(creado._id || creado.id, {
      status: estado,
      isApproved: estado === "Aprobado",
    });
  }

  const final = await userRepository.obtenerPorId(creado._id || creado.id);
  return mapToFrontend(final);
}

export async function actualizarUsuario(id, data) {
  const usuario = await userRepository.obtenerPorId(id);
  if (!usuario) return null;

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

  if (data.modulo !== undefined) {
    const moduloSeleccionado = ensureModuleLabel(data.modulo);
    if (moduloSeleccionado) {
      const moduleInfo = resolveModuleMetadata({ modulo: moduloSeleccionado });
      applyModuleInfo(usuario, moduleInfo);
    }
  } else if (data.cohort !== undefined) {
    const cohort = Number(data.cohort);
    if (!Number.isNaN(cohort)) {
      const moduleInfo = resolveModuleMetadata({ cohort });
      applyModuleInfo(usuario, moduleInfo);
    }
  }

  const estado = normaliseEstado(data.estado);
  if (estado) {
    usuario.status = estado;
    usuario.isApproved = estado === "Aprobado";
  }

  await usuario.save();
  return mapToFrontend(usuario);
}

export async function eliminarUsuario(id) {
  return userRepository.eliminar(id);
}
