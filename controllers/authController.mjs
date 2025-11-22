import * as authService from "../services/authService.mjs";
import * as userService from "../services/userService.mjs";

// Verificación de disponibilidad sin dependencias externas
export const pingController = (_req, res) => {
  res.status(200).json({ status: "ok" });
};

// Registro de usuario
export const registerController = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

// Login de usuario
export const loginController = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    res.status(200).json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const sessionController = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user?.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// Aprobar usuario
export const aprobarUsuarioController = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const aprobado = await authService.aprobarUsuario(userId);
    res.status(200).json(aprobado);
  } catch (err) {
    next(err);
  }
};

// Listar usuarios
export const listarUsuariosController = async (req, res, next) => {
  try {
    const users = await userService.listarUsuarios(req.user, req.query);
    res.json(users);
  } catch (err) {
    next(err);
  }
};
