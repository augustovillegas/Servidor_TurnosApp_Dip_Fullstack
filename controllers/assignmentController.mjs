import * as servicioAsignacion from "../services/assignmentService.mjs";

export const crearAsignacionController = async (req, res, next) => {
  try {
    const nueva = await servicioAsignacion.crearAsignacion(req.body, req.user);
    // Añadimos campo 'module' numérico para tests (refleja cohorte) sin renombrar existentes
    const salida = { ...nueva.toObject(), module: nueva.cohorte };
    res.status(201).json(salida);
  } catch (err) {
    next(err);
  }
};

export const obtenerAsignacionesController = async (req, res, next) => {
  try {
    const lista = await servicioAsignacion.obtenerTodasAsignaciones(req.user);
    // Mapear para incluir campo 'module' esperado por tests
    const salida = lista.map((a) => ({ ...a.toObject(), module: a.cohorte }));
    res.json(salida);
  } catch (err) {
    next(err);
  }
};

export const obtenerAsignacionPorIdController = async (req, res, next) => {
  try {
    const asignacion = await servicioAsignacion.obtenerAsignacionPorId(req.params.id);
    const salida = { ...asignacion.toObject(), module: asignacion.cohorte };
    res.json(salida);
  } catch (err) {
    next(err);
  }
};

export const actualizarAsignacionController = async (req, res, next) => {
  try {
    const asignacion = await servicioAsignacion.actualizarAsignacion(req.params.id, req.body, req.user);
    const salida = { ...asignacion.toObject(), module: asignacion.cohorte };
    res.json(salida);
  } catch (err) {
    next(err);
  }
};

export const eliminarAsignacionController = async (req, res, next) => {
  try {
    await servicioAsignacion.eliminarAsignacion(req.params.id, req.user);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
