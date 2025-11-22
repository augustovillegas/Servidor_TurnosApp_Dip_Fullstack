import express from "express";
import {
  listarUsuariosController,
  obtenerUsuarioController,
  crearUsuarioController,
  actualizarUsuarioController,
  eliminarUsuarioController,
} from "../controllers/userController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.use(auth);
// Permitir también profesores para listado segmentado y alumnos para ver su propio usuario
router.use(allowRoles("superadmin", "profesor"));

router.get("/", listarUsuariosController);
router.get("/:id", obtenerUsuarioController);
router.post("/", crearUsuarioController);
router.put("/:id", actualizarUsuarioController);
router.delete("/:id", eliminarUsuarioController);

export default router;
