import {
  listarEntregas,
  crearEntrega,
  actualizarEntrega,
  eliminarEntrega,
  obtenerEntregasPorUsuario,
  obtenerEntregaPorId,
} from "../services/submissionService.mjs";

// NUEVO: Listado general para Superadmin/Profesor
export const listarEntregasController = async (req, res, next) => {
  try {
    console.log("[ENTREGAS - LISTAR] - Solicitud recibida:", {
      usuarioId: req.user.id,
      rol: req.user.rol,
      filtros: req.query,
      timestamp: new Date().toISOString()
    });
    // Pasar req.user para permisos y req.query para filtros opcionales (estado, sprint, etc.)
    const entregas = await listarEntregas(req.user, req.query);
    console.log(`[ENTREGAS - LISTADAS] - Total: ${entregas.length}`);
    res.json(entregas);
  } catch (error) {
    next(error);
  }
};

// En POST /submissions/:slotId el parametro representa el ID del turno (slot) asociado.
export const crearEntregaController = async (req, res, next) => {
  try {
    console.log("[ENTREGA - CREAR] - Datos recibidos:", {
      turnoId: req.params.id,
      alumnoId: req.user.id,
      gitHub: req.body.githubLink?.substring(0, 40) + "...",
      render: req.body.renderLink?.substring(0, 40) + "...",
      sprint: req.body.sprint,
      timestamp: new Date().toISOString()
    });
    const nuevaEntrega = await crearEntrega(req.params.id, req.user, req.body);
    console.log("[ENTREGA - CREADA]:", { entregaId: nuevaEntrega._id });
    res.status(201).json(nuevaEntrega);
  } catch (error) {
    next(error);
  }
};

// En GET /submissions/:userId el parametro hace referencia al ID del alumno.
export const obtenerEntregasPorUsuarioController = async (req, res, next) => {
  try {
    console.log("[ENTREGAS - POR USUARIO] - Solicitud recibida:", {
      usuarioSolicitadoId: req.params.userId,
      usuarioActualId: req.user.id,
      rol: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const entregas = await obtenerEntregasPorUsuario(req.params.userId, req.user);
    console.log(`[ENTREGAS - POR USUARIO OBTENIDAS] - Total: ${entregas.length}`);
    res.json(entregas);
  } catch (err) {
    next(err);
  }
};

// En GET /submissions/detail/:id el parametro corresponde al ID de la submission.
// Usamos este como el controlador canonico para obtener por ID.
export const obtenerEntregaPorIdController = async (req, res, next) => {
  try {
    console.log("[ENTREGA - OBTENER] - Solicitud recibida:", {
      entregaId: req.params.id,
      usuarioId: req.user.id,
      rol: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const entrega = await obtenerEntregaPorId(req.params.id, req.user);
    console.log("[ENTREGA - OBTENIDA]:", { entregaId: entrega._id, estado: entrega.reviewStatus });
    res.json(entrega);
  } catch (err) {
    next(err);
  }
};

export const actualizarEntregaController = async (req, res, next) => {
  try {
    console.log("[ENTREGA - ACTUALIZAR] - Datos recibidos:", {
      entregaId: req.params.id,
      cambios: req.body,
      usuarioId: req.user.id,
      rol: req.user.rol,
      timestamp: new Date().toISOString()
    });
    const entrega = await actualizarEntrega(req.params.id, req.body, req.user);
    console.log("[ENTREGA - ACTUALIZADA]:", { entregaId: entrega._id, nuevoEstado: entrega.reviewStatus });
    res.json(entrega);
  } catch (error) {
    next(error);
  }
};

export const eliminarEntregaController = async (req, res, next) => {
  try {
    console.log("[ENTREGA - ELIMINAR] - Solicitud recibida:", {
      entregaId: req.params.id,
      usuarioId: req.user.id,
      rol: req.user.rol,
      timestamp: new Date().toISOString()
    });
    await eliminarEntrega(req.params.id, req.user);
    console.log("[ENTREGA - ELIMINADA]:", { entregaId: req.params.id });
    res.json({ message: "Entrega eliminada con exito" });
  } catch (error) {
    next(error);
  }
};
