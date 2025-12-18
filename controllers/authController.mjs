import * as authService from "../services/authService.mjs";
import * as userService from "../services/userService.mjs";

// Verificacion de disponibilidad sin dependencias externas
export const pingController = (_req, res) => {
  res.status(200).json({ status: "ok" });
};

// Registro de usuario
export const registerController = async (req, res, next) => {
  try {
    console.log("[REGISTER] - Datos recibidos del frontend:", {
      email: req.body.email,
      nombre: req.body.nombre,
      modulo: req.body.modulo,
      timestamp: new Date().toISOString()
    });
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

// Login de usuario
export const loginController = async (req, res, next) => {
  try {
    console.log("[LOGIN] - Credenciales recibidas:", {
      email: req.body.email,
      timestamp: new Date().toISOString()
    });
    const { token, user } = await authService.login(req.body);
    console.log("[LOGIN SUCCESS] - Usuario autenticado:", {
      userId: user._id,
      email: user.email,
      rol: user.rol,
      status: user.status
    });
    res.status(200).json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const sessionController = async (req, res, next) => {
  try {
    console.log("[SESSION] - Usuario solicitando sesion:", {
      userId: req.user?.id,
      rol: req.user?.rol,
      timestamp: new Date().toISOString()
    });
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
    console.log("[APROBAR USUARIO] - Solicitud recibida:", {
      usuarioAprobarId: userId,
      profesorId: req.user.id,
      rolProfesor: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const aprobado = await authService.aprobarUsuario(userId);
    console.log("[USUARIO APROBADO]:", aprobado);
    res.status(200).json(aprobado);
  } catch (err) {
    next(err);
  }
};

// Listar usuarios
export const listarUsuariosController = async (req, res, next) => {
  try {
    console.log("[LISTAR USUARIOS] - Filtros recibidos:", {
      profesorId: req.user.id,
      rolProfesor: req.user.rol,
      filtros: req.query,
      timestamp: new Date().toISOString()
    });
    const users = await userService.listarUsuarios(req.user, req.query);
    console.log(`[USUARIOS LISTADOS] - Total: ${users.length}`);
    res.json(users);
  } catch (err) {
    next(err);
  }
};
