import mongoose from "mongoose";
import {
  crearEntrega,
  obtenerEntregasPorUsuario,
  obtenerEntregaPorId,
  actualizarEntrega,
  eliminarEntrega,
} from "../services/submissionService.mjs";
import * as frontendSubmissionService from "../services/frontendSubmissionService.mjs";

export const crearEntregaController = async (req, res, next) => {
  try {
    const nuevaEntrega = await crearEntrega(req.params.id, req.user, req.body);
    res.status(201).json(nuevaEntrega);
  } catch (error) {
    next(error);
  }
};

export const obtenerEntregasPorUsuarioController = async (req, res, next) => {
  try {
    const entregas = await obtenerEntregasPorUsuario(req.params.userId, req.user);
    res.json(entregas);
  } catch (err) {
    next(err);
  }
};

export const obtenerEntregaPorIdController = async (req, res, next) => {
  try {
    const entrega = await obtenerEntregaPorId(req.params.id, req.user);
    res.json(entrega);
  } catch (err) {
    next(err);
  }
};

export const actualizarEntregaController = async (req, res, next) => {
  try {
    const actualizada = await actualizarEntrega(req.params.id, req.body, req.user);
    res.json(actualizada);
  } catch (err) {
    next(err);
  }
};

export const eliminarEntregaController = async (req, res, next) => {
  try {
    await eliminarEntrega(req.params.id, req.user);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const listarEntregasFrontendController = async (req, res, next) => {
  try {
    const entregas = await frontendSubmissionService.listarEntregas(req.query);
    res.json(entregas);
  } catch (error) {
    next(error);
  }
};

export const obtenerEntregaFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Entrega no encontrada" });
    }
    const entrega = await frontendSubmissionService.obtenerEntrega(
      req.params.id
    );
    if (!entrega) {
      return res.status(404).json({ message: "Entrega no encontrada" });
    }
    res.json(entrega);
  } catch (error) {
    next(error);
  }
};

export const crearEntregaFrontendController = async (req, res, next) => {
  try {
    const entrega = await frontendSubmissionService.crearEntrega(req.body);
    res.status(201).json(entrega);
  } catch (error) {
    next(error);
  }
};

export const actualizarEntregaFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Entrega no encontrada" });
    }
    const entrega = await frontendSubmissionService.actualizarEntrega(
      req.params.id,
      req.body
    );
    if (!entrega) {
      return res.status(404).json({ message: "Entrega no encontrada" });
    }
    res.json(entrega);
  } catch (error) {
    next(error);
  }
};

export const eliminarEntregaFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Entrega no encontrada" });
    }
    const eliminada = await frontendSubmissionService.eliminarEntrega(
      req.params.id
    );
    if (!eliminada) {
      return res.status(404).json({ message: "Entrega no encontrada" });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
