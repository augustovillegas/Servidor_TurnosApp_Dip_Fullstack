import { body } from "express-validator";

export const submissionValidator = [
  // assignment lo resuelve el controller desde ReviewSlot → opcional
  body("assignment")
    .optional()
    .isMongoId().withMessage("ID de la asignación inválido"),

  // aceptar tanto githubLink como link
  body(["githubLink", "link"], "Link de GitHub inválido")
    .optional()
    .isURL()
    .matches(/github\.com/)
    .withMessage("El enlace debe ser de github.com"),

  body("renderLink")
    .optional()
    .isURL()
    .withMessage("Link de Render inválido"),
];

