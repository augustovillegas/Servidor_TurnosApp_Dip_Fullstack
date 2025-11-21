import express from "express";
import {
  listarTurnosController,
  obtenerTurnoController,
  crearTurnoController,
  actualizarTurnoController,
  eliminarTurnoController,
} from "../controllers/slotController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.use(auth);
router.use(allowRoles("profesor", "superadmin"));

router.get("/", listarTurnosController);
router.get("/:id", obtenerTurnoController);
router.post("/", crearTurnoController);
router.put("/:id", actualizarTurnoController);
router.delete("/:id", eliminarTurnoController);

export default router;
