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
    // Se pasa req.user para aplicar segmentación por módulo y rol
    const turnos = await slotService.obtenerTurnosPorFiltro(req.query, req.user);
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

export const listarTurnosController = async (req, res, next) => {
  try {
    const turnos = await slotService.listarTurnos(req.query);
    res.json(turnos);
  } catch (error) {
    next(error);
  }
};

export const obtenerTurnoController = async (req, res, next) => {
  try {
    const turno = await slotService.obtenerTurno(req.params.id);
    res.json(turno);
  } catch (error) {
    next(error);
  }
};

export const crearTurnoController = async (req, res, next) => {
  try {
    const creado = await slotService.crearTurno(req.body);
    res.status(201).json(creado);
  } catch (error) {
    next(error);
  }
};

export const actualizarTurnoController = async (req, res, next) => {
  try {
    const actualizado = await slotService.actualizarTurno(req.params.id, req.body);
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
};

export const eliminarTurnoController = async (req, res, next) => {
  try {
    await slotService.eliminarTurno(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
