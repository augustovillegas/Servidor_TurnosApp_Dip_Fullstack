import mongoose from "mongoose";
import * as slotService from "../services/slotService.mjs";
import * as frontendSlotService from "../services/frontendSlotService.mjs";

export const createSlotController = async (req, res, next) => {
  try {
    const slot = await slotService.crear(req.body, req.user);
    res.status(201).json(slot);
  } catch (error) {
    next(error);
  }
};

export const solicitarTurnoController = async (req, res, next) => {
  try {
    const turno = await slotService.solicitarTurno(req.params.id, req.user);
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const cancelarTurnoController = async (req, res, next) => {
  try {
    const turno = await slotService.cancelarTurno(req.params.id, req.user);
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoRevisionController = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const turno = await slotService.actualizarEstadoRevision(
      req.params.id,
      estado,
      req.user
    );
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const obtenerTurnosController = async (req, res, next) => {
  try {
    const turnos = await slotService.obtenerTurnosPorFiltro(req.query);
    res.status(200).json(turnos);
  } catch (error) {
    next(error);
  }
};

export const obtenerMisTurnosController = async (req, res, next) => {
  try {
    const turnos = await slotService.obtenerPorUsuario(req.user.id);
    res.status(200).json(turnos);
  } catch (error) {
    next(error);
  }
};

export const misSolicitudesController = async (req, res, next) => {
  try {
    const result = await slotService.obtenerSolicitudesPorAlumno(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const listarTurnosFrontendController = async (req, res, next) => {
  try {
    const turnos = await frontendSlotService.listarTurnos(req.query);
    res.json(turnos);
  } catch (error) {
    next(error);
  }
};

export const obtenerTurnoFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    const turno = await frontendSlotService.obtenerTurno(req.params.id);
    if (!turno) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    res.json(turno);
  } catch (error) {
    next(error);
  }
};

export const crearTurnoFrontendController = async (req, res, next) => {
  try {
    const creado = await frontendSlotService.crearTurno(req.body);
    res.status(201).json(creado);
  } catch (error) {
    next(error);
  }
};

export const actualizarTurnoFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    const actualizado = await frontendSlotService.actualizarTurno(
      req.params.id,
      req.body
    );
    if (!actualizado) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
};

export const eliminarTurnoFrontendController = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    const eliminado = await frontendSlotService.eliminarTurno(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
