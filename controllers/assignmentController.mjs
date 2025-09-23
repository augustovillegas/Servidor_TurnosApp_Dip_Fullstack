import * as servicioAsignacion from "../services/assignmentService.mjs";

export const crearAsignacionController = async (req, res) => {
  try {
    const nueva = await servicioAsignacion.crearAsignacion(req.body, req.user);

    if (!nueva || !nueva._id) {
      return res.status(500).json({ msg: "Error al crear asignación" });
    }

    res.status(201).json(nueva);
  } catch (err) {
    console.error("❌ Error en crearAsignacionController:", err);
    res.status(500).json({ msg: err.message || "Error interno del servidor" });
  }
};

export const obtenerAsignacionesController = async (req, res, next) => {
  try {
    const lista = await servicioAsignacion.obtenerTodasAsignaciones(req.user);
    res.json(lista);
  } catch (err) {
    next(err);
  }
};

export const obtenerAsignacionPorIdController = async (req, res, next) => {
  try {
    const asignacion = await servicioAsignacion.obtenerAsignacionPorId(req.params.id);
    if (!asignacion) return res.status(404).json({ msg: "Asignación no encontrada" });
    res.json(asignacion);
  } catch (err) {
    next(err);
  }
};

export const actualizarAsignacionController = async (req, res, next) => {
  try {
    const asignacion = await servicioAsignacion.actualizarAsignacion(req.params.id, req.body);
    res.json(asignacion);
  } catch (err) {
    next(err);
  }
};

export const eliminarAsignacionController = async (req, res, next) => {
  try {
    await servicioAsignacion.eliminarAsignacion(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
