import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import userRepository from "../repository/userRepository.mjs";
import { sanitizeUser } from "../utils/security/sanitizeUser.mjs";
import { resolveModuleMetadata } from "../utils/moduleMap.mjs";

export const register = async ({
  name,
  nombre,
  apellido,
  email,
  password,
  // Legacy inputs (cohort/modulo/module/moduloSlug) + new preferred (moduleNumber/moduleLabel)
  cohort,
  modulo,
  module,
  moduloSlug,
  moduleNumber,
  moduleLabel,
  role = "alumno",
}) => {
  const exists = await userRepository.obtenerPorEmail(email);
  if (exists) {
    throw { status: 409, message: "Email ya registrado" };
  }

  const fullName = name || [nombre, apellido].filter(Boolean).join(" ").trim();
  if (!fullName) {
    throw { status: 400, message: "El nombre es requerido" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Prefer explicit moduleNumber/moduleLabel if provided; fallback to legacy inputs.
  const primaryCode = moduleNumber ?? cohort;
  const primaryLabel = moduleLabel ?? modulo ?? module;
  const moduleInfo = resolveModuleMetadata({
    module: primaryLabel,
    modulo: primaryLabel,
    moduloSlug,
    cohort: primaryCode,
  });

  const user = await userRepository.crear({
    name: fullName,
    email,
    passwordHash,
    // Persist normalized fields
    cohorte: moduleInfo.code,
    modulo: moduleInfo.label,
    moduleCode: moduleInfo.code,
    role,
    status: "Pendiente",
  });

  return sanitizeUser(user);
};

export const login = async ({ email, password }) => {
  const user = await userRepository.obtenerPorEmail(email);
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    throw {
      status: 401,
      message: "Credenciales incorrectas",
    };
  }

  if (user.status === "Rechazado") {
    throw { status: 423, message: "Tu cuenta ha sido bloqueada" };
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return { token, user: sanitizeUser(user) };
};

export const aprobarUsuario = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const user = await userRepository.obtenerPorId(id);
  if (!user) throw { status: 404, message: "Usuario no encontrado" };
  const updated = await userRepository.actualizar(id, { status: "Aprobado" });
  return sanitizeUser(updated);
};

export const listarUsuarios = async (role, requester) => {
  const all = await userRepository.obtenerTodos();
  let filtered = role ? all.filter((u) => u.role === role) : all;

  if (requester) {
    if (requester.role === "profesor") {
      // Profesor: sólo alumnos de su módulo
      const requesterModule = String(requester.moduleNumber ?? requester.moduleCode);
      filtered = filtered.filter(
        (u) => u.role === "alumno" && String(u.moduleCode ?? u.cohorte) === requesterModule
      );
    } else if (requester.role === "alumno") {
      // Alumno: acceso denegado a listado
      throw { status: 403, message: "No autorizado" };
    }
    // superadmin ve todo
  }

  return filtered.map(sanitizeUser);
};

export const getUserById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 401, message: "Sesión inválida" };
  }
  const user = await userRepository.obtenerPorId(id);
  if (!user) throw { status: 401, message: "Sesión inválida" };
  return sanitizeUser(user);
};
