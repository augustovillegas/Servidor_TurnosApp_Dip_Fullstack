import express from "express";
import {
  listarEntregasFrontendController,
  obtenerEntregaFrontendController,
  crearEntregaFrontendController,
  actualizarEntregaFrontendController,
  eliminarEntregaFrontendController,
} from "../controllers/submissionController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.use(auth);
router.use(allowRoles("profesor", "superadmin"));

router.get("/", listarEntregasFrontendController);
router.get("/:id", obtenerEntregaFrontendController);
router.post("/", crearEntregaFrontendController);
router.put("/:id", actualizarEntregaFrontendController);
router.delete("/:id", eliminarEntregaFrontendController);

export default router;
