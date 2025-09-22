import jwt from "jsonwebtoken";
import { getUserById } from "../services/userService.mjs";

export const auth = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) return res.status(401).json({ msg: "Usuario no encontrado" });

    req.user = {
      id: user._id.toString(),
      role: user.role,
      isApproved: user.isApproved,
      cohort: user.cohort,
    };

    next();
  } catch (error) {
    return res.status(403).json({ msg: "Token inválido o expirado" });
  }
};



