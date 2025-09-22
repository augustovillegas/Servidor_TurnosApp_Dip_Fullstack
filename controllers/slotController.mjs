import {
  crear,
  solicitarTurno,
  actualizarEstadoRevision,
  cancelarTurno,
} from "../services/slotService.mjs";
import { errorHandler } from "../middlewares/errorHandler.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";

const mapEstado = (slot, estado) => {
  const plain = slot?.toObject ? slot.toObject() : slot;
  return { ...plain, estado };
};

export const createSlotController = async (req, res) => {
  try {
    const data = {
      assignment: req.body.assignment,
      cohort: req.user?.cohort || req.body.cohort || "default-cohort",
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    };

    const newSlot = await crear(data, req.user);
    res.status(201).json(mapEstado(newSlot, "pendiente"));
  } catch (error) {
    console.error("Error al crear turno:", error);
    errorHandler(error, req, res);
  }
};

export const solicitarTurnoController = async (req, res) => {
  try {
    const slot = await ReviewSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ msg: "Turno no encontrado" });

    if (req.user.role === "alumno" && req.user.cohort !== slot.cohort) {
      return res
        .status(403)
        .json({ msg: "No podés solicitar turnos de otra cohorte" });
    }

    const updatedSlot = await solicitarTurno(req.params.id, req.user);
    res.status(200).json(mapEstado(updatedSlot, "pendiente"));
  } catch (error) {
    console.error("Error al solicitar turno:", error);
    errorHandler(error, req, res);
  }
};

export const actualizarEstadoRevisionController = async (req, res) => {
  try {
    const estado = req.body.estado;
    const updatedSlot = await actualizarEstadoRevision(
      req.params.id,
      estado,
      req.user
    );
    res.status(200).json(mapEstado(updatedSlot, estado));
  } catch (error) {
    console.error("Error al actualizar estado de revisión:", error);
    errorHandler(error, req, res);
  }
};

export const cancelarTurnoController = async (req, res) => {
  try {
    const updatedSlot = await cancelarTurno(req.params.id, req.user);
    res.status(200).json(mapEstado(updatedSlot, "cancelado"));
  } catch (error) {
    console.error("Error al cancelar turno:", error);
    errorHandler(error, req, res);
  }
};

export const misSolicitudesController = async (req, res) => {
  try {
    const solicitudes = await obtenerPorUsuario(req.user._id);
    res.json(solicitudes);
  } catch (error) {
    console.error("Error al obtener mis solicitudes:", error);
    errorHandler(error, req, res);
  }
};
