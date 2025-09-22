import express from "express";
import {
  crearEntregaController,
  obtenerEntregasPorUsuarioController,
  obtenerEntregaPorIdController,
  actualizarEntregaController,
  eliminarEntregaController,
} from "../controllers/submissionController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { submissionValidator } from "../validators/submissionValidator.mjs";
import { validateRequest } from "../middlewares/validationResult.mjs";

const router = express.Router();

// 📌 Obtener entregas de un usuario
router.get("/:userId", auth, obtenerEntregasPorUsuarioController);

// 📌 Obtener detalle de una entrega por ID
router.get("/detail/:id", auth, obtenerEntregaPorIdController);

// 📌 Crear una entrega asociada a un turno (idTurno en la URL)
router.post("/:id", auth, submissionValidator, validateRequest, crearEntregaController);

// 📌 Actualizar entrega existente
router.put("/:id", auth, submissionValidator, validateRequest, actualizarEntregaController);

// 📌 Eliminar entrega
router.delete("/:id", auth, eliminarEntregaController);

export default router;

