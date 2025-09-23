import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "../repository/userRepository.mjs";

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
    const err = new Error("Email ya registrado");
    err.status = 400;
    throw err;
  }

  const fullName = name || [nombre, apellido].filter(Boolean).join(" ").trim();
  if (!fullName) {
    const err = new Error("El nombre es requerido");
    err.status = 400;
    throw err;
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

  return user;
};

export const login = async ({ email, password }) => {
  const user = await userRepository.obtenerPorEmail(email);
  const valid = user && (await bcrypt.compare(password, user.passwordHash));

  if (!valid) {
    const err = new Error("Credenciales incorrectas");
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, user };
};

export const aprobarUsuario = async (id) => {
  return await userRepository.actualizar(id, { isApproved: true });
};

export const listarUsuarios = async (role) => {
  const all = await userRepository.obtenerTodos();
  if (role) {
    return all.filter((u) => u.role === role);
  }
  return all;
};
