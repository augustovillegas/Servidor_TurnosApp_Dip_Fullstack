import jwt from "jsonwebtoken";
import { getUserById } from "../services/userService.mjs";
import { labelToModule } from "../utils/moduleMap.mjs";

export const auth = async (req, _res, next) => {
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

    const cohorte =
      Number.isFinite(Number(user.cohorte)) && user.cohorte !== null
        ? Number(user.cohorte)
        : labelToModule(user.modulo);

    req.user = {
      id: user._id.toString(),
      rol: user.rol,
      status: user.status || "Pendiente",
      modulo: user.modulo ?? null,
      cohorte: cohorte ?? null,
    };
    req.userDocument = user;

    next();
  } catch (error) {
    if (error?.status) {
      return next(error);
    }
    return next({ status: 401, message: "Token invalido o expirado" });
  }
};
