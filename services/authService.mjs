import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "../repository/userRepository.mjs";
import { sanitizeUser } from "../utils/sanitizeUser.mjs";

export const register = async ({ name, nombre, apellido, email, password, cohort, role = "alumno" }) => {
  const exists = await userRepository.obtenerPorEmail(email);
  if (exists) throw new Error("Email ya registrado");

  const fullName = name || [nombre, apellido].filter(Boolean).join(" ").trim();
  if (!fullName) throw new Error("El nombre es requerido");

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
  if (!valid) throw new Error("Credenciales incorrectas");

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return { token, user: sanitizeUser(user) };
};

export const aprobarUsuario = async (id) => {
  return await userRepository.actualizar(id, { isApproved: true });
};

export const listarUsuarios = async (role) => {
  const all = await userRepository.obtenerTodos();
  const filtered = role ? all.filter((u) => u.role === role) : all;
  return filtered.map(sanitizeUser);
};
