import express from "express";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";
import { crearAsignacionController, obtenerAsignacionesController, obtenerAsignacionPorIdController, actualizarAsignacionController, eliminarAsignacionController } from "../controllers/assignmentController.mjs";
import { assignmentValidator } from "../validators/assignmentValidator.mjs";
import { validateRequest } from "../middlewares/validationResult.mjs";
import { param } from "express-validator";

const router = express.Router();

router.get("/", auth, obtenerAsignacionesController);

router.get("/:id", auth, [param("id", "ID inválido").isMongoId()], validateRequest, obtenerAsignacionPorIdController);

router.post("/", auth, allowRoles("profesor"), assignmentValidator, validateRequest, crearAsignacionController);

router.put("/:id", auth, allowRoles("profesor"), [param("id", "ID inválido").isMongoId()], assignmentValidator, validateRequest, actualizarAsignacionController);

router.delete("/:id", auth, allowRoles("profesor"), [param("id", "ID inválido").isMongoId()], validateRequest, eliminarAsignacionController);

export default router;
