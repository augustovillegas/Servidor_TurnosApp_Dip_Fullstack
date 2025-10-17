import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "../repository/userRepository.mjs";
import { sanitizeUser } from "../utils/sanitizeUser.mjs";

export const register = async ({
  name,
  nombre,
  apellido,
  email,
  password,
  cohort,
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

  const user = await userRepository.crear({
    name: fullName,
    email,
    passwordHash,
    cohort: cohort || 1,
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
      message: "Credenciales inválidas",
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

export const listarUsuarios = async (role) => {
  const all = await userRepository.obtenerTodos();
  const filtered = role ? all.filter((u) => u.role === role) : all;
  return filtered.map(sanitizeUser);
};

export const getUserById = async (id) => {
  if (!id) return null;
  const user = await userRepository.obtenerPorId(id);
  return sanitizeUser(user);
};
