import { body } from "express-validator";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[A-Za-z0-9._-]+$/;

function emailOrUsernameValidator(message) {
  return body("email")
    .trim()
    .notEmpty()
    .withMessage("Email requerido")
    .bail()
    .custom((value) => {
      if (typeof value !== "string") return false;
      const identifier = value.trim();
      if (!identifier) return false;
      if (emailRegex.test(identifier)) return true;
      return usernameRegex.test(identifier);
    })
    .withMessage(message);
}

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

  emailOrUsernameValidator("Email o usuario invalido"),

  body("password", "La contrasena debe tener al menos 6 caracteres").isLength({
    min: 6,
  }),

  body("cohort")
    .optional()
    .isInt()
    .withMessage("Cohorte debe ser un numero entero"),
];

export const loginValidator = [
  emailOrUsernameValidator("Email o usuario invalido"),

  body("password", "Contrasena requerida").notEmpty(),
];
