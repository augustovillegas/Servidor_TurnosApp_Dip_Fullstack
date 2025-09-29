import express from "express";
import { crearEntregaController, obtenerEntregasPorUsuarioController, obtenerEntregaPorIdController, actualizarEntregaController, eliminarEntregaController} from "../controllers/submissionController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { submissionValidator } from "../validators/submissionValidator.mjs";
import { validateRequest } from "../middlewares/validationResult.mjs";
import { requireApproved } from "../middlewares/requireApproved.mjs";
import { allowRoles } from "../middlewares/roles.mjs";
import { param } from "express-validator";

const router = express.Router();


// 📌 Obtener entregas de un usuario
router.get("/:userId", auth, allowRoles("alumno","profesor", "superadmin"), param("userId").isMongoId(), validateRequest, obtenerEntregasPorUsuarioController);


// 📌 Obtener detalle de una entrega por ID
router.get("/detail/:id", auth, allowRoles("alumno","profesor","superadmin"), param("userId").isMongoId(), validateRequest, obtenerEntregaPorIdController);


// 📌 Crear una entrega asociada a un turno (idTurno en la URL)
router.post("/:id", auth, allowRoles("alumno"), requireApproved, submissionValidator, validateRequest, crearEntregaController);


// 📌 Actualizar entrega existente
router.put("/:id", auth, allowRoles("alumno", "profesor","superadmin"), requireApproved, submissionValidator, validateRequest, actualizarEntregaController);


// 📌 Eliminar entrega
router.delete("/:id", auth, allowRoles("alumno", "profesor", "superadmin"), requireApproved, param("id").isMongoId(), validateRequest, eliminarEntregaController);




export default router;
