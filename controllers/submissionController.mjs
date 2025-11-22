import {
  listarEntregas,  
  crearEntrega,
  actualizarEntrega,
  eliminarEntrega,
  obtenerEntregasPorUsuario,
  obtenerEntregaPorId,
} from "../services/submissionService.mjs";


// 📌 NUEVO: Listado general para Superadmin/Profesor
export const listarEntregasController = async (req, res, next) => {
  try {
    // Pasar req.user para permisos y req.query para filtros opcionales (estado, sprint, etc.)
    const entregas = await listarEntregas(req.user, req.query); 
    res.json(entregas);
  } catch (error) {
    next(error);
  }
};

// En POST /submissions/:slotId el parámetro representa el ID del turno (slot) asociado.
export const crearEntregaController = async (req, res, next) => {
  try {
    const nuevaEntrega = await crearEntrega(req.params.id, req.user, req.body);
    res.status(201).json(nuevaEntrega);
  } catch (error) {
    next(error);
  }
};

// En GET /submissions/:userId el parámetro hace referencia al ID del alumno.
export const obtenerEntregasPorUsuarioController = async (req, res, next) => {
  try {
    const entregas = await obtenerEntregasPorUsuario( req.params.userId, req.user );
    res.json(entregas);
  } catch (err) {
    next(err);
  }
};

// En GET /submissions/detail/:id el parámetro corresponde al ID de la submission.
// Usamos este como el controlador canónico para obtener por ID.
export const obtenerEntregaPorIdController = async (req, res, next) => {
  try {
    const entrega = await obtenerEntregaPorId(req.params.id, req.user);
    res.json(entrega);
  } catch (err) {
    next(err);
  }
};

export const actualizarEntregaController = async (req, res, next) => {
  try {
    const entrega = await actualizarEntrega(req.params.id, req.body, req.user);
    res.json(entrega);
  } catch (error) {
    next(error);
  }
};

export const eliminarEntregaController = async (req, res, next) => {
  try {
    await eliminarEntrega(req.params.id, req.user);
    res.json({ message: "Entrega eliminada con éxito" });
  } catch (error) {
    next(error);
  }
};
