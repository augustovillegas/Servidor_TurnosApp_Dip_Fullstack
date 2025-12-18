import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../services/userService.mjs";

export const listarUsuariosController = async (req, res, next) => {
  try {
    console.log("[USUARIOS - LISTAR] - Solicitud recibida:", {
      usuarioId: req.user.id,
      rol: req.user.rol,
      filtros: req.query,
      timestamp: new Date().toISOString()
    });
    const usuarios = await listarUsuarios(req.user, req.query);
    console.log(`[USUARIOS - LISTADO COMPLETADO] - Total: ${usuarios.length}`);
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuarioController = async (req, res, next) => {
  try {
    console.log("[USUARIO - OBTENER] - Solicitud recibida:", {
      usuarioSolicitadoId: req.params.id,
      usuarioActualId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const usuario = await obtenerUsuario(req.params.id);
    console.log("[USUARIO - OBTENIDO]:", { usuarioId: usuario._id, email: usuario.email });
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const crearUsuarioController = async (req, res, next) => {
  try {
    console.log("[USUARIO - CREAR] - Datos recibidos:", {
      nombre: req.body.nombre,
      email: req.body.email,
      rol: req.body.rol,
      modulo: req.body.modulo,
      cohorte: req.body.cohorte,
      usuarioCreadorId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const usuario = await crearUsuario(req.body);
    console.log("[USUARIO - CREADO]:", { usuarioId: usuario._id, email: usuario.email });
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const actualizarUsuarioController = async (req, res, next) => {
  try {
    console.log("[USUARIO - ACTUALIZAR] - Datos recibidos:", {
      usuarioActualizadoId: req.params.id,
      cambios: req.body,
      usuarioActualId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const usuario = await actualizarUsuario(req.params.id, req.body);
    console.log("[USUARIO - ACTUALIZADO]:", { usuarioId: usuario._id });
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const eliminarUsuarioController = async (req, res, next) => {
  try {
    console.log("[USUARIO - ELIMINAR] - Solicitud recibida:", {
      usuarioEliminadoId: req.params.id,
      usuarioActualId: req.user.id,
      timestamp: new Date().toISOString()
    });
    await eliminarUsuario(req.params.id);
    console.log("[USUARIO - ELIMINADO]:", { usuarioId: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
