import {
  crearEntrega,
  obtenerEntregasPorUsuario,
  obtenerEntregaPorId,
  actualizarEntrega,
  eliminarEntrega,
} from "../services/submissionService.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";

export const crearEntregaController = async (req, res) => {
  try {
    const slotId = req.params.id; // viene en la URL: /api/submissions/:idTurno
    const slot = await ReviewSlot.findById(slotId);
    if (!slot) return res.status(404).json({ msg: "Turno no encontrado" });

    const { link, comentarios } = req.body;

    const nuevaEntrega = await crearEntrega({
      assignment: slot.assignment,
      studentId: req.user.id,
      githubLink: link,
      comentarios, // opcional
    });

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
    const actualizada = await actualizarEntrega(
      req.params.id,
      req.body,
      req.user
    );
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
