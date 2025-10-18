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
import { validateRequest } from "../middlewares/validationResult.mjs";
import {
  createSlotValidator,
  slotIdParamValidator,
  updateEstadoValidator,
} from "../validators/slotValidator.mjs";

const router = express.Router();

// Obtener los turnos
router.get("/", auth, obtenerTurnosController);

// Crear turno (profesor o superadmin)
router.post(
  "/",
  auth,
  allowRoles("profesor", "superadmin"),
  ...createSlotValidator,
  validateRequest,
  createSlotController
);

// Solicitar un turno (alumno aprobado)
router.patch(
  "/:id/solicitar",
  auth,
  allowRoles("alumno"),
  requireApproved,
  ...slotIdParamValidator,
  validateRequest,
  solicitarTurnoController
);

// Aprobar/rechazar un turno (profesor o superadmin)
router.patch(
  "/:id/estado",
  auth,
  allowRoles("profesor", "superadmin"),
  ...slotIdParamValidator,
  ...updateEstadoValidator,
  validateRequest,
  actualizarEstadoRevisionController
);

// Cancelar turno (alumno)
router.patch(
  "/:id/cancelar",
  auth,
  allowRoles("alumno"),
  requireApproved,
  ...slotIdParamValidator,
  validateRequest,
  cancelarTurnoController
);

// Consultar mis solicitudes (alumno)
router.get(
  "/mis-solicitudes",
  auth,
  allowRoles("alumno"),
  requireApproved,
  misSolicitudesController
);

export default router;

