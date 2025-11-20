import express from "express";
import {
  listarUsuariosFrontendController,
  obtenerUsuarioFrontendController,
  crearUsuarioFrontendController,
  actualizarUsuarioFrontendController,
  eliminarUsuarioFrontendController,
} from "../controllers/userController.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.use(auth);
router.use(allowRoles("superadmin"));

router.get("/", listarUsuariosFrontendController);
router.get("/:id", obtenerUsuarioFrontendController);
router.post("/", crearUsuarioFrontendController);
router.put("/:id", actualizarUsuarioFrontendController);
router.delete("/:id", eliminarUsuarioFrontendController);

export default router;
