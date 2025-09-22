import * as servicioAsignacion from "../services/assignmentService.mjs";

export const crearAsignacionController = async (req, res) => {
  try {
    if (req.user.role !== "profesor" && req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({
          msg: "Solo profesores o superadmin pueden crear asignaciones",
        });
    }

    const cohort = req.user?.cohort || req.body.cohort || 1;

    // Mapear deadline → dueDate y agregar module default
    const { title, description, deadline } = req.body;
    const nueva = await servicioAsignacion.crearAsignacion({
      module: 1,
      title,
      description,
      dueDate: new Date(deadline),
      cohort,
    });

    if (!nueva || !nueva._id) {
      return res.status(500).json({ msg: "Error al crear asignación" });
    }

    res.status(201).json(nueva);
  } catch (error) {
    console.error("❌ Error al crear asignación:", error.message);
    res.status(500).json({ msg: "Error interno al crear asignación" });
  }
};

export const obtenerAsignacionesController = async (_req, res, next) => {
  try {
    const lista = await servicioAsignacion.obtenerTodasAsignaciones();
    res.json(lista);
  } catch (err) {
    next(err);
  }
};

export const obtenerAsignacionPorIdController = async (req, res, next) => {
  try {
    const asignacion = await servicioAsignacion.obtenerAsignacionPorId(
      req.params.id
    );
    res.json(asignacion);
  } catch (err) {
    next(err);
  }
};

export const actualizarAsignacionController = async (req, res, next) => {
  try {
    const { title, description, deadline } = req.body;
    const data = {
      ...(title && { title }),
      ...(description && { description }),
      ...(deadline && { dueDate: new Date(deadline) }),
    };
    const asignacion = await servicioAsignacion.actualizarAsignacion(
      req.params.id,
      data
    );
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
