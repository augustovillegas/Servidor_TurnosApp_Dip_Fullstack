import { validationResult } from "express-validator";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      campo: err.param,
      mensaje: err.msg,
    }));
    const resumen = formatted.map((item) => item.mensaje).join("; ");
    return res.status(400).json({
      message: "Error de validacion",
      msg: resumen || "Error de validacion",
      errores: formatted,
    });
  }
  next();
};
