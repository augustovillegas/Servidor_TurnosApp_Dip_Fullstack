import assignmentRepository from "../repository/assignmentRepository.mjs";

export const crearAsignacion = async (body, user) => {
    
  if (!["profesor", "superadmin"].includes(user.role)) {
    throw new Error("Solo profesores o superadmin pueden crear asignaciones");
  }

  const { title, description, deadline, module } = body; 

  const nueva = await assignmentRepository.crear({
    module: Number(module),
    title,
    description,
    dueDate: new Date(deadline),
    cohort: user?.cohort || body.cohort || 1,
    createdBy: user.id,
  });

  return nueva;
};

export const obtenerTodasAsignaciones = async (user) => {
  const filtro =
    user.role === "profesor" && user.id
      ? { createdBy: user.id }
      : {};
  return await assignmentRepository.obtenerTodos(filtro);
};

export const obtenerAsignacionPorId = async (id) => {
  return await assignmentRepository.obtenerPorId(id);
};

export const actualizarAsignacion = async (id, body) => {
  const { title, description, deadline } = body;
  const data = {
    ...(title && { title }),
    ...(description && { description }),
    ...(deadline && { dueDate: new Date(deadline) }),
  };
  return await assignmentRepository.actualizar(id, data);
};

export const eliminarAsignacion = async (id) => {
  return await assignmentRepository.eliminar(id);
};


