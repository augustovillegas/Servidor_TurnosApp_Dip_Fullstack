import { moduleToLabel } from "../moduleMap.mjs";
import { capitalise } from "../common/normalizers.mjs";

function mapEstado(user) {
  if (user?.status && ["Pendiente", "Aprobado", "Rechazado"].includes(user.status)) {
    return user.status;
  }
  return user?.isApproved ? "Aprobado" : "Pendiente";
}

function getUserModuleLabel(user) {
  if (!user) return null;
  if (typeof user.modulo === "string" && user.modulo.trim()) {
    return user.modulo;
  }
  return moduleToLabel(user.moduleCode ?? user.cohort) || null;
}

export function mapToFrontend(user) {
  if (!user) return null;
  const plain = user.toObject ? user.toObject() : user;
  return {
    id: plain._id?.toString() || plain.id,
    nombre: plain.name,
    email: plain.email,
    role: plain.role,
    rol: capitalise(plain.role),
    estado: mapEstado(plain),
    cohort: plain.cohort,
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
