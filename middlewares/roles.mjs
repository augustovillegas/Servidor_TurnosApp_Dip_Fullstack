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
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: "No autenticado" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Acceso denegado" });
    }
    next();
  };
};


