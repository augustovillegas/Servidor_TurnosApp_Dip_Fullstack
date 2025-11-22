import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../services/userService.mjs";

export const listarUsuariosController = async (req, res, next) => {
  try {
    const usuarios = await listarUsuarios(req.user, req.query);
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuarioController = async (req, res, next) => {
  try {
    const usuario = await obtenerUsuario(req.params.id);
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const crearUsuarioController = async (req, res, next) => {
  try {
    const usuario = await crearUsuario(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const actualizarUsuarioController = async (req, res, next) => {
  try {
    const usuario = await actualizarUsuario(req.params.id, req.body);
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const eliminarUsuarioController = async (req, res, next) => {
  try {
    await eliminarUsuario(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
