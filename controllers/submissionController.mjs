import {
  crearEntrega,
  obtenerEntregasPorUsuario,
  obtenerEntregaPorId,
  actualizarEntrega,
  eliminarEntrega,
} from "../services/submissionService.mjs";

export const crearEntregaController = async (req, res) => {
  try {
    const nuevaEntrega = await crearEntrega(req.params.id, req.user, req.body);
    res.status(201).json(nuevaEntrega);
  } catch (error) {
    console.error("Error al crear entrega:", error);
    res.status(400).json({ msg: error.message });
  }
};

export const obtenerEntregasPorUsuarioController = async (req, res, next) => {
  try {
    const entregas = await obtenerEntregasPorUsuario(req.params.userId);
    res.json(entregas);
  } catch (err) {
    next(err);
  }
};

export const obtenerEntregaPorIdController = async (req, res, next) => {
  try {
    const entrega = await obtenerEntregaPorId(req.params.id);
    res.json(entrega);
  } catch (err) {
    next(err);
  }
};

export const actualizarEntregaController = async (req, res) => {
  try {
    const actualizada = await actualizarEntrega(req.params.id, req.body, req.user);
    res.json(actualizada);
  } catch (error) {
    console.error("Error al actualizar entrega:", error);
    res.status(400).json({ msg: error.message });
  }
};

export const eliminarEntregaController = async (req, res, next) => {
  try {
    await eliminarEntrega(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
