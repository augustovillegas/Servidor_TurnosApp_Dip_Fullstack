import userRepository from "../repository/userRepository.mjs";
import { register } from "./authService.mjs";

const VALID_ROLES = ["alumno", "profesor", "superadmin"];
const VALID_ESTADOS = ["Pendiente", "Aprobado", "Rechazado"];

function capitalise(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normaliseRole(value) {
  if (!value) return undefined;
  const role = value.toString().trim().toLowerCase();
  return VALID_ROLES.includes(role) ? role : undefined;
}

function normaliseEstado(value) {
  if (!value) return undefined;
  const estado = capitalise(value.toString().trim().toLowerCase());
  return VALID_ESTADOS.includes(estado) ? estado : undefined;
}

function mapEstado(user) {
  if (user.status && VALID_ESTADOS.includes(user.status)) {
    return user.status;
  }
  return user.isApproved ? "Aprobado" : "Pendiente";
}

function mapToFrontend(user) {
  if (!user) return null;
  const plain = user.toObject ? user.toObject() : user;
  return {
    id: plain._id?.toString() || plain.id,
    nombre: plain.name,
    email: plain.email,
    rol: capitalise(plain.role),
    estado: mapEstado(plain),
    cohort: plain.cohort,
    creadoEn: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
  };
}

export async function listarUsuarios(query = {}) {
  const usuarios = await userRepository.obtenerTodos();
  const estadoFiltro = normaliseEstado(query.estado);
  const rolFiltro = normaliseRole(query.rol);

  return usuarios
    .filter((usuario) => {
      if (estadoFiltro && mapEstado(usuario) !== estadoFiltro) return false;
      if (rolFiltro && usuario.role !== rolFiltro) return false;
      return true;
    })
    .map(mapToFrontend);
}

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
  const cohort = Number(data.cohort) || 1;

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

  if (data.cohort !== undefined) {
    const cohort = Number(data.cohort);
    if (!Number.isNaN(cohort)) {
      usuario.cohort = cohort;
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
