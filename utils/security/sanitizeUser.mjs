export const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const full = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete full.passwordHash;
  delete full.__v;
  if (!full.id && full._id) {
    full.id = full._id.toString();
  }
  const code = full.moduleCode ?? full.cohorte ?? null;
  const labelMap = {
    1: "HTML-CSS",
    2: "JAVASCRIPT",
    3: "BACKEND - NODE JS",
    4: "FRONTEND - REACT",
  };
  const label = full.modulo || (code ? labelMap[code] : null) || null;
  
  // Derive isApproved from status field
  const isApproved = full.status === "Aprobado";
  
  const sanitized = {
    id: full.id,
    name: full.name,
    email: full.email,
    role: full.role,
    status: full.status || "Pendiente",
    isApproved,
    moduleNumber: code,
    moduleCode: code,
    moduleLabel: label,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
  return sanitized;
};
