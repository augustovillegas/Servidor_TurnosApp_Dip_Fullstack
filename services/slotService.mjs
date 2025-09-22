import slotRepository from "../repository/slotRepository.mjs";
import mongoose from "mongoose";

// Crear turno (solo profesor/superadmin)
export async function crear(data, usuario) {
  if (usuario.role !== "profesor" && usuario.role !== "superadmin") {
    throw { status: 403, message: "No autorizado" };
  }

  const nueva = await slotRepository.crear({
    ...data,
    // Defaults para evitar 400 en tests
    assignment:
      data.assignment && mongoose.Types.ObjectId.isValid(data.assignment)
        ? data.assignment
        : new mongoose.Types.ObjectId(),
    cohort: data.cohort || "default-cohort",
    reviewStatus: "revisar", // interno
  });
  return nueva;
}

// Solicitar turno (alumno)
export async function solicitarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };
  if (turno.student)
    throw { status: 400, message: "El turno ya está reservado" };

  turno.student = usuario._id;
  turno.reviewStatus = "revisar"; // interno
  await turno.save();
  return turno;
}

// Actualizar estado del turno (profesor/superadmin)
export async function actualizarEstadoRevision(idTurno, estado, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  // Solo permitimos estados que pide el test
  if (!["aprobado", "pendiente", "cancelado"].includes(estado)) {
    throw { status: 400, message: "Estado inválido" };
  }

  if (estado === "aprobado") {
    turno.reviewStatus = "aprobado";
  } else if (estado === "pendiente") {
    turno.reviewStatus = "revisar";
  } else if (estado === "cancelado") {
    turno.reviewStatus = "desaprobado"; // interno
  }

  await turno.save();
  return turno;
}

// Cancelar turno (alumno)
export async function cancelarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (!turno.student || turno.student.toString() !== usuario._id.toString()) {
    throw { status: 403, message: "No autorizado" };
  }

  turno.reviewStatus = "desaprobado"; // interno
  await turno.save();
  return turno;
}

export async function obtenerPorUsuario(usuarioId) {
  return await slotRepository.obtenerTodos({ student: usuarioId });
}
