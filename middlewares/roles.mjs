export const rolesConfig = {
  superadmin: {
    puedeAprobarUsuarios: true,  
    puedeAprobarSlots: true,
    puedeAprobarSubmissions: true,
  },
  profesor: {    
    puedeAprobarUsuarios: true,  
    puedeAprobarSlots: true,     
    puedeAprobarSubmissions: true 
  },
  alumno: {
    puedeAprobarUsuarios: false,
    puedeAprobarSlots: false,
    puedeAprobarSubmissions: false,
  },
};

export const allowRoles = (...roles) => {
  return (req, _res, next) => {
    console.log("[ALLOW ROLES] - Roles permitidos:", roles);
    console.log("[ALLOW ROLES] - Usuario autenticado:", req.user);
    if (!req.user) {
      throw { status: 401, message: "No autenticado" };
    }
    if (!roles.includes(req.user.rol)) {
      console.log("[ALLOW ROLES] - Acceso denegado para rol:", req.user.rol);
      throw { status: 403, message: "Acceso denegado" };
    }
    next();
  };
};


