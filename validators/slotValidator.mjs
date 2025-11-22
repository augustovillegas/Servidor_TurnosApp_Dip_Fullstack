import { body, param } from "express-validator";

export const slotIdParamValidator = [
  param("id", "ID de turno invalido").isMongoId(),
];

export const createSlotValidator = [
  body("assignment")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("El assignment debe ser un identificador valido"),
  body("moduleNumber")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("moduleNumber debe ser un entero positivo"),
  body("reviewNumber")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("El número de review debe ser un entero positivo"),
  body("date")
    .exists({ checkFalsy: true })
    .withMessage("La fecha es obligatoria")
    .bail()
    .isISO8601()
    .withMessage("La fecha debe estar en formato ISO 8601"),
  body("start")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("El inicio debe estar en formato ISO 8601"),
  body("end")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("El fin debe estar en formato ISO 8601"),
  body("startTime")
    .optional({ nullable: true })
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("startTime debe usar el formato HH:MM"),
  body("endTime")
    .optional({ nullable: true })
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("endTime debe usar el formato HH:MM"),
  body("estado")
    .optional({ nullable: true })
    .isIn(["Disponible", "Solicitado", "Aprobado", "Rechazado"])
    .withMessage("Estado de turno invalido"),
];

export const updateEstadoValidator = [
  body("estado")
    .exists({ checkFalsy: true })
    .withMessage("Estado es obligatorio")
    .bail()
    .isString()
    .withMessage("Estado debe ser texto")
    .trim()
    .toLowerCase()
    .isIn(["aprobado", "pendiente", "cancelado"])
    .withMessage("Estado no permitido"),
];
