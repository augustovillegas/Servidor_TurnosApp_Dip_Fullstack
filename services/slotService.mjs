import slotRepository from "../repository/slotRepository.mjs";
import mongoose from "mongoose";

const REVIEW_STATUS_CANONICAL = {
  aprobado: "Aprobado",
  aprobada: "Aprobado",
  pendiente: "A revisar",
  revisar: "A revisar",
  "a revisar": "A revisar",
  cancelado: "Desaprobado",
  cancelada: "Desaprobado",
  desaprobado: "Desaprobado",
  desaprobada: "Desaprobado",
  rechazado: "Desaprobado",
  rechazada: "Desaprobado",
};

// Crear turno (profesor/superadmin)
export async function crear(data, usuario) {
  if (!["profesor", "superadmin"].includes(usuario.role)) {
    throw { status: 403, message: "No autorizado" };
  }

  const cohortValue = Number(
    data?.cohort ?? usuario?.cohort ?? 1
  );
  const payload = {
    ...data,
    cohort: Number.isNaN(cohortValue) ? 1 : cohortValue,
    reviewStatus: "A revisar",
  };

  if (data?.reviewNumber !== undefined) {
    const reviewNumber = Number(data.reviewNumber);
    payload.reviewNumber = Number.isNaN(reviewNumber) ? 1 : Math.max(1, reviewNumber);
  } else if (!payload.reviewNumber) {
    payload.reviewNumber = 1;
  }

  if (data?.assignment) {
    if (!mongoose.Types.ObjectId.isValid(data.assignment)) {
      throw { status: 400, message: "Assignment invalido" };
    }
    payload.assignment = new mongoose.Types.ObjectId(data.assignment);
  } else {
    delete payload.assignment;
  }

  return await slotRepository.crear(payload);
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
  turno.reviewStatus = "A revisar";
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

  const estadoNormalizado = estado
    ? estado.toString().trim().toLowerCase()
    : "";

  const reviewStatus = REVIEW_STATUS_CANONICAL[estadoNormalizado];

  if (!reviewStatus) {
    throw { status: 400, message: "Estado invalido" };
  }

  turno.reviewStatus = reviewStatus;
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
