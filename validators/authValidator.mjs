import { body } from "express-validator";

export const registerValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido"),

  body("nombre")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido"),

  body("apellido").optional().trim(),

  body("email", "Email inválido").trim().isEmail(),

  body("password", "La contraseña debe tener al menos 6 caracteres").isLength({
    min: 6,
  }),

  body("cohort")
    .optional()
    .isInt()
    .withMessage("Cohorte debe ser un número entero"),
];

export const loginValidator = [
  body("email", "Email inválido").trim().isEmail(),

  body("password", "Contraseña requerida").notEmpty(),
];
