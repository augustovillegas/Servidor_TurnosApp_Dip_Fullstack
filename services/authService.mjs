import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "../repository/userRepository.mjs";
import { sanitizeUser } from "../utils/sanitizeUser.mjs";
import { resolveModuleMetadata } from "../utils/moduleMap.mjs";

export const register = async ({
  name,
  nombre,
  apellido,
  email,
  password,
  cohort,
  modulo,
  module,
  moduloSlug,
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
  const moduleInfo = resolveModuleMetadata({ module, modulo, moduloSlug, cohort });

  const user = await userRepository.crear({
    name: fullName,
    nombre: nombre || undefined,
    apellido: apellido || undefined,
    email,
    passwordHash,
    cohort: moduleInfo.code,
    modulo: moduleInfo.label,
    moduloSlug: moduleInfo.slug,
    role,
    isApproved: false,
  });

  return sanitizeUser(user);
};

export const login = async ({ email, password }) => {
  const user = await userRepository.obtenerPorEmail(email);
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    throw {
      status: 401,
      message: "Credenciales invalidas",
      msg: "Credenciales incorrectas",
    };
  }

  if (user.status === "Rechazado") {
    throw { status: 423, message: "Usuario bloqueado", msg: "Usuario bloqueado" };
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return { token, user: sanitizeUser(user) };
};

export const aprobarUsuario = async (id) => {
  const updated = await userRepository.actualizar(id, { isApproved: true, status: "Aprobado" });
  return sanitizeUser(updated);
};

export const listarUsuarios = async (role, requester) => {
  const all = await userRepository.obtenerTodos();
  let filtered = role ? all.filter((u) => u.role === role) : all;

  if (requester) {
    if (requester.role === "profesor") {
      // Profesor: sólo alumnos de su módulo
      filtered = filtered.filter(
        (u) => u.role === "alumno" && String(u.cohort) === String(requester.cohort)
      );
    } else if (requester.role === "alumno") {
      // Alumno: sólo su propio usuario
      filtered = filtered.filter((u) => String(u._id) === String(requester.id));
    }
    // superadmin ve todo
  }

  return filtered.map(sanitizeUser);
};

export const getUserById = async (id) => {
  if (!id) return null;
  const user = await userRepository.obtenerPorId(id);
  return sanitizeUser(user);
};
