import mongoose from "mongoose";
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../services/userService.mjs";

export const listarUsuariosController = async (req, res, next) => {
  try {
    const usuarios = await listarUsuarios(req.user);
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuarioController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const usuario = await obtenerUsuario(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const usuario = await actualizarUsuario(req.params.id, req.body);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const eliminarUsuarioController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const eliminado = await eliminarUsuario(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
