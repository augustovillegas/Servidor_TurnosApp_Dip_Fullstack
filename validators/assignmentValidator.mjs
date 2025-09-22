import { body } from "express-validator";

export const assignmentValidator = [
  body("title", "El título es requerido")
    .trim()
    .notEmpty(),

  body("description", "La descripción es requerida")
    .trim()
    .notEmpty(),

  // module ya lo pone el controller → lo dejamos opcional
  body("module")
    .optional()
    .isInt().withMessage("El módulo debe ser un número entero"),

  // aceptar tanto dueDate como deadline
  body(["dueDate", "deadline"], "La fecha de entrega debe tener formato ISO (YYYY-MM-DD)")
    .notEmpty()
    .isISO8601()
    .toDate(),
];

