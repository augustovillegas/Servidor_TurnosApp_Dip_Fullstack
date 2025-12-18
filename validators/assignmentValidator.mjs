import { body } from "express-validator";

export const assignmentValidator = [
  body("title").notEmpty().withMessage("El título es requerido").trim(),
  body("description").notEmpty().withMessage("La descripción es requerida").trim(),
  body("modulo").notEmpty().withMessage("El módulo es requerido").isString().withMessage("El módulo debe ser un texto").trim(),
  body(["dueDate"])
    .notEmpty()
    .withMessage("La fecha de entrega es requerida")
    .isISO8601()
    .withMessage("Formato inválido (usar YYYY-MM-DD)")
    .toDate(),
];
