import express from "express";
import {
  listarUsuariosFrontendController,
  obtenerUsuarioFrontendController,
  crearUsuarioFrontendController,
  actualizarUsuarioFrontendController,
  eliminarUsuarioFrontendController,
} from "../controllers/userController.mjs";

const router = express.Router();

router.get("/", listarUsuariosFrontendController);
router.get("/:id", obtenerUsuarioFrontendController);
router.post("/", crearUsuarioFrontendController);
router.put("/:id", actualizarUsuarioFrontendController);
router.delete("/:id", eliminarUsuarioFrontendController);

export default router;

