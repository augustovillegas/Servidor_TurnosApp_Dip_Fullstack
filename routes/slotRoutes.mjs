import express from "express";
import {
  createSlotController,
  solicitarTurnoController,
  actualizarEstadoRevisionController,
  cancelarTurnoController,
  misSolicitudesController,
  obtenerTurnosController,
} from "../controllers/slotController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";
import { requireApproved } from "../middlewares/requireApproved.mjs";


const router = express.Router();


// Obtener los turnos
router.get("/", auth, obtenerTurnosController);

// Crear turno (profesor o superadmin)
router.post("/", auth, allowRoles("profesor", "superadmin"), createSlotController);

// Solicitar un turno (alumno aprobado)
router.patch("/:id/solicitar", auth, allowRoles("alumno"), requireApproved, solicitarTurnoController);

// Aprobar/rechazar un turno (profesor o superadmin)
router.patch("/:id/estado", auth, allowRoles("profesor", "superadmin"), actualizarEstadoRevisionController);

// Cancelar turno (alumno)
router.patch("/:id/cancelar", auth, allowRoles("alumno"), requireApproved, cancelarTurnoController);

// Consultar mis solicitudes (alumno)
router.get("/mis-solicitudes", auth, allowRoles("alumno"), requireApproved, misSolicitudesController);



export default router;

