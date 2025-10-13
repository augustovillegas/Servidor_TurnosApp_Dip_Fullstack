import express from "express";
import {
  listarEntregasFrontendController,
  obtenerEntregaFrontendController,
  crearEntregaFrontendController,
  actualizarEntregaFrontendController,
  eliminarEntregaFrontendController,
} from "../controllers/submissionController.mjs";

const router = express.Router();

router.get("/", listarEntregasFrontendController);
router.get("/:id", obtenerEntregaFrontendController);
router.post("/", crearEntregaFrontendController);
router.put("/:id", actualizarEntregaFrontendController);
router.delete("/:id", eliminarEntregaFrontendController);

export default router;

