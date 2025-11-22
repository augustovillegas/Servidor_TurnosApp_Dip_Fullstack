import express from "express";
import {
  createSlotController,
  solicitarTurnoController,
  actualizarEstadoRevisionController,
  cancelarTurnoController,
  misSolicitudesController,
  obtenerTurnosController,
  obtenerTurnoController,
  actualizarTurnoController,
  eliminarTurnoController,
} from "../controllers/slotController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";
import { requireApproved } from "../middlewares/requireApproved.mjs";
import { validateRequest } from "../middlewares/validationResult.mjs";
import {
  createSlotValidator,
  slotIdParamValidator,
  updateEstadoValidator,
  updateSlotValidator,
} from "../validators/slotValidator.mjs";

const router = express.Router();

// Consultar mis solicitudes (alumno) - DEBE IR ANTES DE /:id
router.get(
  "/mis-solicitudes",
  auth,
  allowRoles("alumno"),
  requireApproved,
  misSolicitudesController
);

// Obtener los turnos
router.get("/", auth, obtenerTurnosController);

// Obtener un turno por ID (profesor o superadmin)
router.get(
  "/:id",
  auth,
  allowRoles("profesor", "superadmin"),
  ...slotIdParamValidator,
  validateRequest,
  obtenerTurnoController
);

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

// Actualizar turno completo (profesor o superadmin)
router.put(
  "/:id",
  auth,
  allowRoles("profesor", "superadmin"),
  ...slotIdParamValidator,
  ...updateSlotValidator,
  validateRequest,
  actualizarTurnoController
);

// Eliminar turno (profesor o superadmin)
router.delete(
  "/:id",
  auth,
  allowRoles("profesor", "superadmin"),
  ...slotIdParamValidator,
  validateRequest,
  eliminarTurnoController
);

export default router;
