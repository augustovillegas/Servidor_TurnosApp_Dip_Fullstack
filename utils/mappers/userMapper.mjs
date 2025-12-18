import { moduleToLabel } from "../moduleMap.mjs";
import { capitalise } from "../normalizers/normalizers.mjs";

function mapEstado(user) {
  if (user?.status && ["Pendiente", "Aprobado", "Rechazado"].includes(user.status)) {
    return user.status;
  }
  return "Pendiente";
}

function getUserModuleLabel(user) {
  if (!user) return null;
  if (typeof user.moduleLabel === "string" && user.moduleLabel.trim()) {
    return user.moduleLabel.trim();
  }
  if (typeof user.modulo === "string" && user.modulo.trim()) {
    return user.modulo.trim();
  }
  return moduleToLabel(user.cohorte) || null;
}

export function mapToFrontend(user) {
  if (!user) return null;
  const plain = user.toObject ? user.toObject() : user;
  const rol = plain.rol ?? null;
  const estado = mapEstado(plain);
  return {
    id: plain._id?.toString() || plain.id,
    nombre: plain.nombre,
    email: plain.email,
    rol,
    estado,
    status: estado,
    isApproved: estado === "Aprobado",
    cohorte: plain.cohorte ?? null,
    modulo: getUserModuleLabel(plain) || "",
    creadoEn: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
  };
}

export function mapUsers(users) {
  if (!Array.isArray(users)) return [];
  return users.map(mapToFrontend).filter(Boolean);
}

export { getUserModuleLabel };
export { mapEstado };
