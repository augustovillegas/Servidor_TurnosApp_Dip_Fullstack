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
  return moduleToLabel(user.moduleCode) || null;
}

export function mapToFrontend(user) {
  if (!user) return null;
  const plain = user.toObject ? user.toObject() : user;
  const estado = mapEstado(plain);
  return {
    id: plain._id?.toString() || plain.id,
    nombre: plain.name,
    email: plain.email,
    role: plain.role,
    rol: capitalise(plain.role),
    estado: estado,
    isApproved: estado === "Aprobado",
    moduleNumber: plain.moduleNumber ?? plain.moduleCode ?? null,
    moduleLabel: plain.moduleLabel || getUserModuleLabel(plain) || "",
    creadoEn: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
  };
}

export function mapUsers(users) {
  if (!Array.isArray(users)) return [];
  return users.map(mapToFrontend).filter(Boolean);
}

export { getUserModuleLabel };
export { mapEstado };
