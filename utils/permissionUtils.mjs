/**
 * 🛡️ Utilidades centralizadas para manejo de permisos y filtros de módulo/cohorte
 * 
 * Centraliza la lógica duplicada de acceso por módulo que antes estaba dispersa
 * en assignmentService, submissionService, slotService, authService y userService.
 */

/**
 * Genera un filtro de consulta basado en el rol y módulo del usuario autenticado.
 * 
 * @param {Object} requester - Usuario autenticado (req.user)
 * @param {string} requester.role - Rol del usuario ('superadmin', 'profesor', 'alumno')
 * @param {number} requester.moduleNumber - Número de módulo del usuario
 * @param {number} requester.moduleCode - Código de módulo (fallback)
 * @param {Object} options - Opciones adicionales
 * @param {Object} options.queryFilters - Filtros adicionales de query (ej: {modulo, cohort})
 * @param {boolean} options.studentOnly - Si true, agrega filtro {role: 'alumno'} (para profesores)
 * @param {string} options.studentField - Campo student para filtro de alumno (ej: 'student')
 * @param {string} options.userId - ID del usuario para filtros específicos
 * 
 * @returns {Object} Filtro de Mongoose para aplicar en consultas
 * @throws {Object} Error {status: 403, message} si el usuario no tiene autorización
 */
export function buildModuleFilter(requester, options = {}) {
  const { queryFilters = {}, studentOnly = false, studentField = null, userId = null } = options;
  const { role, moduleNumber, moduleCode, cohorte, id } = requester;
  const moduloActual = Number(moduleNumber ?? moduleCode ?? cohorte);
  
  let filtro = {};

  // === SUPERADMIN ===
  if (role === "superadmin") {
    // Superadmin ve todo, pero puede aplicar filtros opcionales de query
    // No forzamos módulo, solo aplicamos si viene en query
    if (
      queryFilters.cohort !== undefined ||
      queryFilters.cohorte !== undefined ||
      queryFilters.moduleNumber !== undefined ||
      queryFilters.moduleCode !== undefined
    ) {
      const queryCohort = Number(
        queryFilters.cohort ??
          queryFilters.cohorte ??
          queryFilters.moduleNumber ??
          queryFilters.moduleCode
      );
      if (Number.isFinite(queryCohort)) {
        filtro.cohorte = queryCohort;
      }
    }
    return filtro;
  }

  // === PROFESOR ===
  if (role === "profesor") {
    if (!Number.isFinite(moduloActual)) {
      throw { status: 403, message: "No autorizado" };
    }
    
    // Profesor ve solo de su módulo
    filtro.cohorte = moduloActual;
    
    // Si studentOnly es true, agregamos filtro de role: 'alumno'
    if (studentOnly) {
      filtro.role = "alumno";
    }
    
    return filtro;
  }

  // === ALUMNO ===
  if (role === "alumno") {
    if (!Number.isFinite(moduloActual)) {
      throw { status: 403, message: "No autorizado" };
    }
    
    // Alumno ve solo de su módulo
    filtro.cohorte = moduloActual;
    
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
 * 
 * @param {Object} requester - Usuario autenticado
 * @param {Object} queryFilters - Filtros opcionales de query (role, modulo, cohort, etc.)
 * @returns {Object} Filtro de Mongoose
 * @throws {Object} Error si el usuario no tiene autorización
 */
export function buildUserListFilter(requester, queryFilters = {}) {
  const { role, moduleNumber, moduleCode, cohorte } = requester;
  const moduloActual = Number(moduleNumber ?? moduleCode ?? cohorte);
  
  let filtro = {};

  // === SUPERADMIN ===
  if (role === "superadmin") {
    // Superadmin puede filtrar opcionalmente, si no filtra ve todo
    if (
      queryFilters.cohort !== undefined ||
      queryFilters.cohorte !== undefined ||
      queryFilters.moduleNumber !== undefined ||
      queryFilters.moduleCode !== undefined
    ) {
      const queryCohort = Number(
        queryFilters.cohort ??
          queryFilters.cohorte ??
          queryFilters.moduleNumber ??
          queryFilters.moduleCode
      );
      if (Number.isFinite(queryCohort)) {
        filtro.cohorte = queryCohort;
      }
    }
    
    // Aplicar filtro de role si viene en query
    if (queryFilters.role) {
      filtro.role = queryFilters.role;
    }
    
    return filtro;
  }

  // === PROFESOR ===
  if (role === "profesor") {
    if (!Number.isFinite(moduloActual)) {
      throw { status: 403, message: "No autorizado" };
    }
    
    // Profesor solo ve alumnos de su módulo
    filtro.cohorte = moduloActual;
    filtro.role = "alumno";
    
    return filtro;
  }

  // === ALUMNO ===
  // Alumnos no tienen permiso para listar usuarios
  throw { status: 403, message: "No autorizado" };
}

/**
 * Extrae el número de módulo de un usuario de forma robusta.
 * 
 * @param {Object} user - Usuario (req.user o documento de BD)
 * @returns {number|undefined} Número de módulo
 */
export function getModuleNumber(user) {
  if (!user) return undefined;
  const moduleNum = Number(user.cohorte ?? user.moduleNumber ?? user.moduleCode);
  return Number.isFinite(moduleNum) ? moduleNum : undefined;
}
