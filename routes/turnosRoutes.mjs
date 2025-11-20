import express from "express";
import {
  listarTurnosFrontendController,
  obtenerTurnoFrontendController,
  crearTurnoFrontendController,
  actualizarTurnoFrontendController,
  eliminarTurnoFrontendController,
} from "../controllers/slotController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.use(auth);
router.use(allowRoles("profesor", "superadmin"));

router.get("/", listarTurnosFrontendController);
router.get("/:id", obtenerTurnoFrontendController);
router.post("/", crearTurnoFrontendController);
router.put("/:id", actualizarTurnoFrontendController);
router.delete("/:id", eliminarTurnoFrontendController);

export default router;
