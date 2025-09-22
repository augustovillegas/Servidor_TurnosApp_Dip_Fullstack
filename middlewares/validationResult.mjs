import { validationResult } from "express-validator";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      campo: err.param,
      mensaje: err.msg,
    }));
    return res.status(400).json({ errores: formatted });
  }
  next();
};
