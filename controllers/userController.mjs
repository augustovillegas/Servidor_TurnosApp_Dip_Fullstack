import mongoose from "mongoose";
import * as frontendUserService from "../services/frontendUserService.mjs";

export const listarUsuariosFrontendController = async (req, res, next) => {
  try {
    const usuarios = await frontendUserService.listarUsuarios(req.query);
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const obtenerUsuarioFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const usuario = await frontendUserService.obtenerUsuario(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const crearUsuarioFrontendController = async (req, res, next) => {
  try {
    const usuario = await frontendUserService.crearUsuario(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const actualizarUsuarioFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const usuario = await frontendUserService.actualizarUsuario(
      req.params.id,
      req.body
    );
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const eliminarUsuarioFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const eliminado = await frontendUserService.eliminarUsuario(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

