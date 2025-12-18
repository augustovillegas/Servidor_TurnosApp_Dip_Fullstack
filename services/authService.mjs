import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import userRepository from "../repository/userRepository.mjs";
import { sanitizeUser } from "../utils/security/sanitizeUser.mjs";
import { ensureModuleLabel, labelToModule } from "../utils/moduleMap.mjs";

/**
 * 🔑 authService.mjs - SOLO AUTENTICACIÓN
 * 
 * Este servicio maneja únicamente:
 * - register: Registro de nuevos usuarios
 * - login: Autenticación y generación de tokens
 * - aprobarUsuario: Aprobación de cuentas pendientes
 * 
 * Para operaciones de usuarios (listado, obtención, etc.), usar userService.mjs
 */

export const register = async ({
  nombre,
  apellido,
  email,
  password,
  modulo,
  cohorte,
  rol = "alumno",
}) => {
  const normalizedEmail = email?.toLowerCase().trim();
  const exists = await userRepository.obtenerPorEmail(normalizedEmail);
  if (exists) {
    throw { status: 409, message: "Email ya registrado" };
  }

  const fullName = [nombre, apellido].filter(Boolean).join(" ").trim();
  if (!fullName) {
    throw { status: 400, message: "El nombre es requerido" };
  }

  const moduleLabel = ensureModuleLabel(modulo);
  if (!moduleLabel) {
    throw { status: 400, message: "El modulo es requerido" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const resolvedCohorte = Number.isFinite(Number(cohorte))
    ? Number(cohorte)
    : labelToModule(moduleLabel) ?? 1;

  const user = await userRepository.crear({
    nombre: fullName,
    email: normalizedEmail,
    passwordHash,
    cohorte: resolvedCohorte,
    modulo: moduleLabel,
    rol,
    status: "Pendiente",
  });

  return sanitizeUser(user);
};

export const login = async ({ email, password }) => {
  const normalizedEmail = email?.toLowerCase().trim();
  const user = await userRepository.obtenerPorEmail(normalizedEmail);
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

  const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return { token, user: sanitizeUser(user) };
};

export const aprobarUsuario = async (id) => {
  console.log("[APROBAR USUARIO] - ID recibido:", id);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  const user = await userRepository.obtenerPorId(id);
  if (!user) throw { status: 404, message: "Usuario no encontrado" };
  console.log("[APROBAR USUARIO] - Usuario encontrado:", user);
  const updated = await userRepository.actualizar(id, { status: "Aprobado" });
  console.log("[APROBAR USUARIO] - Usuario actualizado:", updated);
  return sanitizeUser(updated);
};
