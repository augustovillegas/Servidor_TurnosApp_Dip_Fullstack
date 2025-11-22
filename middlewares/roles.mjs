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
    if (!req.user) {
      throw { status: 401, message: "No autenticado" };
    }
    if (!roles.includes(req.user.role)) {
      throw { status: 403, message: "Acceso denegado" };
    }
    next();
  };
};


