import { body } from "express-validator";
import { emailRegex, usernameRegex } from '../constants/constantes.mjs';

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

  body("moduleNumber")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("moduleNumber debe ser un entero positivo"),
];

export const loginValidator = [
  emailOrUsernameValidator("Email o usuario invalido"),

  body("password", "Contrasena requerida").notEmpty(),
];
