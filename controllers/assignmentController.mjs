import * as servicioAsignacion from "../services/assignmentService.mjs";

export const crearAsignacionController = async (req, res, next) => {
  try {
    console.log("[ASIGNACION - CREAR] - Datos recibidos:", {
      titulo: req.body.title,
      descripcion: req.body.description?.substring(0, 50) + "...",
      modulo: req.body.modulo,
      fechaEntrega: req.body.dueDate,
      profesorId: req.user.id,
      rolProfesor: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const nueva = await servicioAsignacion.crearAsignacion(req.body, req.user);
    console.log("[ASIGNACION - CREADA]:", { asignacionId: nueva._id, titulo: nueva.title });
    res.status(201).json(nueva.toObject ? nueva.toObject() : nueva);
  } catch (err) {
    next(err);
  }
};

export const obtenerAsignacionesController = async (req, res, next) => {
  try {
    console.log("[ASIGNACIONES - LISTAR] - Solicitud recibida:", {
      usuarioId: req.user.id,
      rol: req.user.rol,
      cohorte: req.user.cohorte,
      timestamp: new Date().toISOString()
    });
    const lista = await servicioAsignacion.obtenerTodasAsignaciones(req.user);
    console.log(`[ASIGNACIONES - LISTADAS] - Total: ${lista.length}`);
    res.json(lista.map((a) => (a.toObject ? a.toObject() : a)));
  } catch (err) {
    next(err);
  }
};

export const obtenerAsignacionPorIdController = async (req, res, next) => {
  try {
    console.log("[ASIGNACION - OBTENER] - Solicitud recibida:", {
      asignacionId: req.params.id,
      usuarioId: req.user.id,
      rol: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const asignacion = await servicioAsignacion.obtenerAsignacionPorId(req.params.id, req.user);
    console.log("[ASIGNACION - OBTENIDA]:", { asignacionId: asignacion._id, titulo: asignacion.title });
    res.json(asignacion.toObject ? asignacion.toObject() : asignacion);
  } catch (err) {
    next(err);
  }
};

export const actualizarAsignacionController = async (req, res, next) => {
  try {
    console.log("[ASIGNACION - ACTUALIZAR] - Datos recibidos:", {
      asignacionId: req.params.id,
      cambios: req.body,
      usuarioId: req.user.id,
      timestamp: new Date().toISOString()
    });
    const asignacion = await servicioAsignacion.actualizarAsignacion(req.params.id, req.body, req.user);
    console.log("[ASIGNACION - ACTUALIZADA]:", { asignacionId: asignacion._id });
    res.json(asignacion.toObject ? asignacion.toObject() : asignacion);
  } catch (err) {
    next(err);
  }
};

export const eliminarAsignacionController = async (req, res, next) => {
  try {
    console.log("[ASIGNACION - ELIMINAR] - Solicitud recibida:", {
      asignacionId: req.params.id,
      usuarioId: req.user.id,
      timestamp: new Date().toISOString()
    });
    await servicioAsignacion.eliminarAsignacion(req.params.id, req.user);
    console.log("[ASIGNACION - ELIMINADA]:", { asignacionId: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
