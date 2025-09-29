import { body } from "express-validator";

export const assignmentValidator = [
  body("title").notEmpty().withMessage("El título es requerido").trim(),
  body("description").notEmpty().withMessage("La descripción es requerida").trim(),
  body("module").isInt({ min: 1 }).withMessage("El módulo debe ser un número entero").toInt(),
  body(["dueDate"])
    .notEmpty()
    .withMessage("La fecha de entrega es requerida")
    .isISO8601()
    .withMessage("Formato inválido (usar YYYY-MM-DD)")
    .toDate(),
];
