import express from "express";
import {
  createSlotController,
  solicitarTurnoController,
  actualizarEstadoRevisionController,
  cancelarTurnoController,
  misSolicitudesController,
} from "../controllers/slotController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";


const router = express.Router();

// Crear turno (profesor o superadmin)
router.post("/", auth, allowRoles("profesor", "superadmin"), createSlotController);

// Solicitar un turno (alumno aprobado)
router.patch("/:id/solicitar", auth, allowRoles("alumno"), solicitarTurnoController);

// Aprobar/rechazar un turno (profesor o superadmin)
router.patch("/:id/estado", auth, allowRoles("profesor", "superadmin"), actualizarEstadoRevisionController);

// Cancelar turno (alumno)
router.patch("/:id/cancelar", auth, allowRoles("alumno"), cancelarTurnoController);

// Consultar mis solicitudes (alumno)
router.get("/mis-solicitudes", auth, allowRoles("alumno"), misSolicitudesController);

export default router;

