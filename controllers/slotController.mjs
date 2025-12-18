import * as slotService from "../services/slotService.mjs";

export const createSlotController = async (req, res, next) => {
  try {
    console.log("[TURNO - CREAR] - Datos recibidos:", {
      asignacionId: req.body.assignment,
      modulo: req.body.modulo || req.user.modulo,
      fecha: req.body.fecha,
      horaInicio: req.body.startTime,
      horaFin: req.body.endTime,
      sala: req.body.sala,
      profesorId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const slot = await slotService.crear(req.body, req.user);
    console.log("[TURNO - CREADO]:", { turnoId: slot._id, fecha: slot.date });
    res.status(201).json(slot);
  } catch (error) {
    next(error);
  }
};

export const solicitarTurnoController = async (req, res, next) => {
  try {
    console.log("[TURNO - SOLICITAR] - Alumno solicitando turno:", {
      turnoId: req.params.id,
      alumnoId: req.user.id,
      nombreAlumno: req.user?.nombre,
      timestamp: new Date().toISOString()
    });
    const turno = await slotService.solicitarTurno(req.params.id, req.user);
    console.log("[TURNO - SOLICITADO]:", { turnoId: turno._id, estado: turno.estado });
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const cancelarTurnoController = async (req, res, next) => {
  try {
    console.log("[TURNO - CANCELAR] - Alumno cancelando turno:", {
      turnoId: req.params.id,
      alumnoId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const turno = await slotService.cancelarTurno(req.params.id, req.user);
    console.log("[TURNO - CANCELADO]:", { turnoId: turno._id, estado: turno.estado });
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoRevisionController = async (req, res, next) => {
  try {
    const { estado } = req.body;
    console.log("[TURNO - CAMBIAR ESTADO] - Profesor actualizando estado:", {
      turnoId: req.params.id,
      nuevoEstado: estado,
      profesorId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const turno = await slotService.actualizarEstadoRevision(req.params.id, estado, req.user);
    console.log("[TURNO - ESTADO ACTUALIZADO]:", { turnoId: turno._id, nuevoEstado: turno.estado });
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const obtenerTurnosController = async (req, res, next) => {
  try {
    console.log("[TURNOS - LISTAR] - Filtros recibidos:", {
      usuarioId: req.user.id,
      rol: req.user.rol,
      filtros: req.query,
      timestamp: new Date().toISOString()
    });
    const turnos = await slotService.obtenerTurnosPorFiltro(req.query, req.user);
    console.log(`[TURNOS - LISTADOS] - Total: ${turnos.length}`);
    res.status(200).json(turnos);
  } catch (error) {
    next(error);
  }
};

export const misSolicitudesController = async (req, res, next) => {
  try {
    console.log("[MIS SOLICITUDES] - Alumno consultando sus solicitudes:", {
      alumnoId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const result = await slotService.obtenerSolicitudesPorAlumno(req.user.id);
    console.log(`[MIS SOLICITUDES - OBTENIDAS] - Total: ${result.length}`);
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
    console.log("[TURNO - OBTENER] - Solicitud recibida:", {
      turnoId: req.params.id,
      usuarioId: req.user.id,
      rol: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const turno = await slotService.obtenerTurno(req.params.id);
    console.log("[TURNO - OBTENIDO]:", { turnoId: turno._id, estado: turno.estado });
    res.json(turno);
  } catch (error) {
    next(error);
  }
};

export const actualizarTurnoController = async (req, res, next) => {
  try {
    console.log("[TURNO - ACTUALIZAR] - Datos recibidos:", {
      turnoId: req.params.id,
      cambios: req.body,
      usuarioId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const turno = await slotService.actualizarTurno(req.params.id, req.body);
    console.log("[TURNO - ACTUALIZADO]:", { turnoId: turno._id });
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
};

export const eliminarTurnoController = async (req, res, next) => {
  try {
    console.log("[TURNO - ELIMINAR] - Solicitud recibida:", {
      turnoId: req.params.id,
      usuarioId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const turno = await slotService.eliminarTurno(req.params.id);
    console.log("[TURNO - ELIMINADO]:", { turnoId: req.params.id });
    res.status(200).json({ message: "Turno eliminado exitosamente", turno });
  } catch (error) {
    next(error);
  }
};
