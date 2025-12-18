/**
 * 🛡️ Utilidades centralizadas para manejo de permisos y filtros de módulo/cohorte
 * 
 * Centraliza la lógica duplicada de acceso por módulo que antes estaba dispersa
 * en assignmentService, submissionService, slotService, authService y userService.
 */

/**
 * Genera un filtro de consulta basado en el rol y módulo del usuario autenticado.
 * 
 * FILTRO PRINCIPAL: `modulo` (String) - Define qué contenido ve cada usuario.
 * METADATO: `cohorte` (Number) - Solo para reportes, NO para filtrado de acceso.
 * 
 * @param {Object} requester - Usuario autenticado (req.user)
 * @param {string} requester.rol - Rol del usuario ('superadmin', 'profesor', 'alumno')
 * @param {string} requester.modulo - Módulo del usuario (String: "HTML-CSS", "JAVASCRIPT", etc.)
 * @param {Object} options - Opciones adicionales
 * @param {Object} options.queryFilters - Filtros adicionales de query (ej: {modulo, cohorte})
 * @param {boolean} options.studentOnly - Si true, agrega filtro {rol: 'alumno'} (para profesores)
 * @param {string} options.studentField - Campo student para filtro de alumno (ej: 'student')
 * @param {string} options.userId - ID del usuario para filtros específicos
 * 
 * @returns {Object} Filtro de Mongoose para aplicar en consultas
 * @throws {Object} Error {status: 403, message} si el usuario no tiene autorización
 */
export function buildModuleFilter(requester, options = {}) {
  const { queryFilters = {}, studentOnly = false, studentField = null, userId = null } = options;
  const { rol, modulo, id } = requester;
  
  let filtro = {};

  // === SUPERADMIN ===
  if (rol === "superadmin") {
    // Superadmin ve todo, pero puede aplicar filtros opcionales de query
    // Si viene modulo en query, lo aplicamos
    if (queryFilters.modulo) {
      filtro.modulo = queryFilters.modulo;
    }
    // cohorte es solo metadato, pero lo aplicamos si viene explícitamente
    if (queryFilters.cohorte !== undefined) {
      filtro.cohorte = Number(queryFilters.cohorte);
    }
    return filtro;
  }

  // === PROFESOR ===
  if (rol === "profesor") {
    if (!modulo || typeof modulo !== "string") {
      throw { status: 403, message: "No autorizado" };
    }
    
    // FILTRO PRINCIPAL: Profesor ve solo de su módulo (String)
    filtro.modulo = modulo;
    if (requester.cohorte !== undefined && requester.cohorte !== null) {
      filtro.cohorte = Number(requester.cohorte);
    }
    
    // Si studentOnly es true, agregamos filtro de rol: 'alumno'
    if (studentOnly) {
      filtro.rol = "alumno";
    }
    
    return filtro;
  }

  // === ALUMNO ===
  if (rol === "alumno") {
    if (!modulo || typeof modulo !== "string") {
      throw { status: 403, message: "No autorizado" };
    }
    
    // FILTRO PRINCIPAL: Alumno ve solo de su módulo (String)
    filtro.modulo = modulo;
    if (requester.cohorte !== undefined && requester.cohorte !== null) {
      filtro.cohorte = Number(requester.cohorte);
    }
    
    // Si studentField está definido, el alumno solo ve sus propios registros
    if (studentField) {
      filtro[studentField] = userId ?? id;
    }
    
    return filtro;
  }

  // Rol no autorizado
  throw { status: 403, message: "No autorizado" };
}

/**
 * Genera un filtro específico para listado de usuarios con permisos de módulo.
 * FILTRO PRINCIPAL: `modulo` (String) - Solo ve usuarios de su módulo.
 * 
 * @param {Object} requester - Usuario autenticado
 * @param {Object} queryFilters - Filtros opcionales de query (rol, modulo, etc.)
 * @returns {Object} Filtro de Mongoose
 * @throws {Object} Error si el usuario no tiene autorización
 */
export function buildUserListFilter(requester, queryFilters = {}) {
  const { rol, modulo } = requester;
  
  let filtro = {};

  // === SUPERADMIN ===
  if (rol === "superadmin") {
    // Superadmin puede filtrar opcionalmente, si no filtra ve todo
    if (queryFilters.modulo) {
      filtro.modulo = queryFilters.modulo;
    }
    
    // Aplicar filtro de rol si viene en query
    if (queryFilters.rol) {
      filtro.rol = queryFilters.rol;
    }
    
    return filtro;
  }

  // === PROFESOR ===
  if (rol === "profesor") {
    if (!modulo || typeof modulo !== "string") {
      throw { status: 403, message: "No autorizado" };
    }
    
    // FILTRO PRINCIPAL: Profesor solo ve alumnos de su módulo (String)
    filtro.modulo = modulo;
    filtro.rol = "alumno";
    
    return filtro;
  }

  // === ALUMNO ===
  // Alumnos no tienen permiso para listar usuarios
  throw { status: 403, message: "No autorizado" };
}

/**
 * Extrae el módulo (String) de un usuario de forma robusta.
 * 
 * @param {Object} user - Usuario (req.user o documento de BD)
 * @returns {string|undefined} Módulo del usuario ("HTML-CSS", "JAVASCRIPT", etc.)
 */
export function getModuleString(user) {
  if (!user) return undefined;
  return user.modulo && typeof user.modulo === "string" ? user.modulo : undefined;
}
