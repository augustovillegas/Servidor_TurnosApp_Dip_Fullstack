import * as slotService from "../services/slotService.mjs";

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
    const result = await slotService.obtenerSolicitudesPorAlumno(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
