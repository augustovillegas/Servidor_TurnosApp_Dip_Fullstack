import express from "express";
import {
  listarTurnosFrontendController,
  obtenerTurnoFrontendController,
  crearTurnoFrontendController,
  actualizarTurnoFrontendController,
  eliminarTurnoFrontendController,
} from "../controllers/slotController.mjs";

const router = express.Router();

router.get("/", listarTurnosFrontendController);
router.get("/:id", obtenerTurnoFrontendController);
router.post("/", crearTurnoFrontendController);
router.put("/:id", actualizarTurnoFrontendController);
router.delete("/:id", eliminarTurnoFrontendController);

export default router;

