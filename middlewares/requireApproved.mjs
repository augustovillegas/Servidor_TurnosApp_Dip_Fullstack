export const requireApproved = (req, res, next) => {
  if (req.user.role === "alumno" && !req.user.isApproved) {
    return res
      .status(403)
      .json({
        msg: "Tu cuenta debe ser aprobada por un profesor o administrador",
      });
  }
  next();
};
