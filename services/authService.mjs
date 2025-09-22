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
  try {
    console.log(">>> [authService.register] Payload recibido:", {
      name,
      nombre,
      apellido,
      email,
      role,
      cohort,
    });

    const exists = await userRepository.obtenerPorEmail(email);
    if (exists) {
      console.log(">>> [authService.register] Usuario ya existe:", email);
      const err = new Error("Email ya registrado");
      err.status = 400;
      throw err;
    }

    // Si no viene name, construimos con nombre + apellido
    const fullName = name || [nombre, apellido].filter(Boolean).join(" ").trim();
    console.log(">>> [authService.register] Nombre final construido:", fullName);

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

    console.log(">>> [authService.register] Usuario creado con éxito:", {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return user;
  } catch (err) {
    console.error("❌ [authService.register] Error:", err.message);
    throw err;
  }
};

export const login = async ({ email, password }) => {
  try {
    console.log(">>> [authService.login] Intentando login con:", email);

    const user = await userRepository.obtenerPorEmail(email);
    console.log(">>> [authService.login] Usuario encontrado:", !!user);

    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    console.log(">>> [authService.login] Password válido?", valid);

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

    console.log(">>> [authService.login] Login exitoso:", {
      id: user._id,
      email: user.email,
      role: user.role,
    });

    return { token, user };
  } catch (err) {
    console.error("❌ [authService.login] Error:", err.message);
    throw err;
  }
};

export const aprobarUsuario = async (id) => {
  console.log(">>> [authService.aprobarUsuario] Aprobando usuario:", id);
  return await userRepository.actualizar(id, { isApproved: true });
};




