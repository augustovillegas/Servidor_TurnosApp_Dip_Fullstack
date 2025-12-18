export const requireApproved = (req, _res, next) => {
  if (req.user.rol === "alumno" && req.user.status !== "Aprobado") {
    throw {
      status: 403,
      message: "Tu cuenta debe ser aprobada por un profesor o administrador",
    };
  }
  next();
};
