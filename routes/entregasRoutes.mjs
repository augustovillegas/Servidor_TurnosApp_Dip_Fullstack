import express from "express";
import {
  listarEntregasController,
  obtenerEntregaPorIdController,
  crearEntregaController,
  actualizarEntregaController,
  eliminarEntregaController,
} from "../controllers/submissionController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.use(auth);
router.use(allowRoles("profesor", "superadmin"));

router.get("/", listarEntregasController);
router.get("/:id", obtenerEntregaPorIdController);
router.post("/", crearEntregaController);
router.put("/:id", actualizarEntregaController);
router.delete("/:id", eliminarEntregaController);

export default router;
