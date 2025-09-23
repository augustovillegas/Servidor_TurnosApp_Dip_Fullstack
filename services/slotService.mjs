import slotRepository from "../repository/slotRepository.mjs";
import mongoose from "mongoose";

// Crear turno (profesor/superadmin)
export async function crear(data, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.role)) {
    throw { status: 403, message: "No autorizado" };
  }

  return await slotRepository.crear({
    ...data,
    assignment: new mongoose.Types.ObjectId(data.assignment),
    cohort: Number(data.cohort) || 1,
    reviewStatus: "revisar",
  });
}

// Alumno solicita turno
export async function solicitarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (turno.student) {
    throw { status: 403, message: "Turno ya reservado" };
  }

  if (String(turno.cohort) !== String(usuario.cohort)) {
    throw { status: 403, message: "Cohorte no coincide" };
  }

  turno.student = usuario.id;
  await turno.save();
  return turno;
}

// Alumno cancela turno
export async function cancelarTurno(idTurno, usuario) {
  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  if (!turno.student || turno.student.toString() !== usuario.id.toString()) {
    throw { status: 403, message: "No autorizado para cancelar este turno" };
  }

  turno.student = null;
  turno.reviewStatus = "revisar";
  await turno.save();
  return turno;
}

// Cambiar estado del turno (profesor/superadmin)
export async function actualizarEstadoRevision(idTurno, estado, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.role)) {
    throw { status: 403, message: "No autorizado" };
  }

  const turno = await slotRepository.obtenerPorId(idTurno);
  if (!turno) throw { status: 404, message: "Turno no encontrado" };

  const estadosValidos = {
    aprobado: "aprobado",
    pendiente: "revisar",
    cancelado: "desaprobado",
  };

  if (!(estado in estadosValidos)) {
    throw { status: 400, message: "Estado inválido" };
  }

  turno.reviewStatus = estadosValidos[estado];
  await turno.save();
  return turno;
}

export async function obtenerPorUsuario(usuarioId) {
  return await slotRepository.obtenerTodos({ student: usuarioId });
}

export async function obtenerTurnosPorFiltro({ cohort }) {
  const filtro = {};
  if (cohort) filtro.cohort = Number(cohort);
  return await slotRepository.obtenerTodos(filtro);
}

export async function obtenerSolicitudesPorAlumno(alumnoId) {
  return await slotRepository.obtenerTodos({ student: alumnoId });
}
