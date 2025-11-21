import express from "express";
import { 
  listarEntregasController, 
  crearEntregaController, 
  obtenerEntregasPorUsuarioController, 
  obtenerEntregaPorIdController, 
  actualizarEntregaController, 
  eliminarEntregaController 
} from "../controllers/submissionController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { submissionValidator } from "../validators/submissionValidator.mjs";
import { validateRequest } from "../middlewares/validationResult.mjs";
import { requireApproved } from "../middlewares/requireApproved.mjs";
import { allowRoles } from "../middlewares/roles.mjs";
import { param } from "express-validator";

const router = express.Router();


// 📌 NUEVO: Obtener todas las entregas (con filtros de query)
// Esta ruta es usada por dashboards de Profesor, Alumno y Superadmin.
router.get("/", auth, allowRoles("alumno", "profesor", "superadmin"), validateRequest, listarEntregasController);


// 📌 Obtener detalle de una entrega por ID
router.get("/detail/:id", auth, allowRoles("alumno","profesor","superadmin"), param("id", "ID de entrega invalido").isMongoId(), validateRequest, obtenerEntregaPorIdController);


// 📌 Obtener entregas de un usuario específico
router.get("/:userId", auth, allowRoles("alumno","profesor", "superadmin"), param("userId", "ID de usuario invalido").isMongoId(), validateRequest, obtenerEntregasPorUsuarioController);


// 📌 Crear una entrega asociada a un turno (idTurno en la URL)
router.post("/:id", auth, allowRoles("alumno"), requireApproved, param("id", "ID de turno invalido").isMongoId(), submissionValidator, validateRequest, crearEntregaController);


// 📌 Actualizar entrega existente
router.put("/:id", auth, allowRoles("alumno", "profesor","superadmin"), requireApproved, param("id", "ID de entrega invalido").isMongoId(), submissionValidator, validateRequest, actualizarEntregaController);


// 📌 Eliminar entrega
router.delete("/:id", auth, allowRoles("alumno", "profesor", "superadmin"), requireApproved, param("id", "ID de entrega invalido").isMongoId(), validateRequest, eliminarEntregaController);

export default router;
