export const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const full = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete full.passwordHash;
  delete full.__v;
  if (!full.id && full._id) {
    full.id = full._id.toString();
  }
  const rol = full.rol ?? null;
  const isApproved = full.status === "Aprobado";

  return {
    id: full.id,
    nombre: full.nombre,
    email: full.email,
    rol,
    status: full.status || "Pendiente",
    isApproved,
    cohorte: full.cohorte ?? null,
    modulo: full.modulo ?? null,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
};
