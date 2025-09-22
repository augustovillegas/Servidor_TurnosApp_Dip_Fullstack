import * as authService from "../services/authService.mjs";

// Registro de usuario (alumno o profesor)
export const registerController = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    // El test solo valida que después se pueda loguear, así que basta con 201 + user
    res.status(201).json({ user });
  } catch (err) {
    // Los errores con err.status se manejan por errorHandler
    next(err);
  }
};

// Login de usuario
export const loginController = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    // El test valida que haya token y user._id
    res.status(200).json({ token, user });
  } catch (err) {
    next(err);
  }
};

// Aprobar usuario (solo superadmin o profesor)
export const aprobarUsuarioController = async (req, res, next) => {
  try {
    const userId = req.params.id;
    // La ruta ya está protegida con allowRoles, así que este if sería redundante,
    // pero lo dejamos como defensa extra
    if (req.user.role !== "superadmin" && req.user.role !== "profesor") {
      return res
        .status(403)
        .json({ msg: "Solo superadmin o profesor puede aprobar usuarios" });
    }

    const aprobado = await authService.aprobarUsuario(userId);
    res.status(200).json(aprobado);
  } catch (err) {
    next(err);
  }
};
