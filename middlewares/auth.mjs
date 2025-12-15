import jwt from "jsonwebtoken";
import { getUserById } from "../services/userService.mjs";

export const auth = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, message: "Token requerido" };
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) {
      throw { status: 401, message: "Usuario no encontrado" };
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      status: user.status || "Pendiente",
      moduleCode: user.moduleCode ?? null,
      moduleNumber: user.cohorte ?? user.moduleCode ?? null,
      cohorte: user.cohorte ?? null,
    };
    req.userDocument = user;

    next();
  } catch (error) {
    throw { status: 401, message: "Token inválido o expirado" };
  }
};
