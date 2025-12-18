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
  body("nombre")
    .exists({ checkFalsy: true })
    .withMessage("El nombre es requerido")
    .bail()
    .isString()
    .withMessage("El nombre debe ser texto")
    .trim(),

  body("apellido").optional().trim(),

  emailOrUsernameValidator("Email o usuario invalido"),

  body("password", "La contrasena debe tener al menos 6 caracteres").isLength({
    min: 6,
  }),

  body("modulo")
    .exists({ checkFalsy: true })
    .withMessage("El modulo es requerido")
    .bail()
    .isString()
    .withMessage("El modulo debe ser texto")
    .trim(),

  body("cohorte")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("La cohorte debe ser un numero"),
];

export const loginValidator = [
  emailOrUsernameValidator("Email o usuario invalido"),

  body("password", "Contrasena requerida").notEmpty(),
];
