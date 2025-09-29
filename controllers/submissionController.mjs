import {
  crearEntrega,
  obtenerEntregasPorUsuario,
  obtenerEntregaPorId,
  actualizarEntrega,
  eliminarEntrega,
} from "../services/submissionService.mjs";

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

