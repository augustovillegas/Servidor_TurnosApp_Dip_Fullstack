import express from "express";
import {
  aprobarUsuarioController,
  listarUsuariosController,
  loginController,
  pingController,
  registerController,
  sessionController,
} from "../controllers/authController.mjs";
import { registerValidator, loginValidator } from "../validators/authValidator.mjs";
import { validateRequest } from "../middlewares/validationResult.mjs";
import { auth } from "../middlewares/auth.mjs";
import { allowRoles } from "../middlewares/roles.mjs";

const router = express.Router();

router.get("/ping", pingController);

router.post("/login", loginValidator, validateRequest, loginController);
router.get("/session", auth, sessionController);

router.post("/register", registerValidator, validateRequest, registerController);

router.patch(
  "/aprobar/:id",
  auth,
  allowRoles("superadmin", "profesor"),
  aprobarUsuarioController
);

router.get("/usuarios", auth, allowRoles("superadmin", "profesor"), listarUsuariosController);

export default router;
