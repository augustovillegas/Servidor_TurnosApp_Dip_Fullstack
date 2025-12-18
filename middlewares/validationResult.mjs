import { validationResult } from "express-validator";

export const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      campo: err.param,
      mensaje: err.msg,
    }));
    throw {
      status: 422,
      message: "Error de validacion",
      errores: formatted,
    };
  }
  next();
};
