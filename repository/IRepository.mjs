class IRepository {
  
  obtenerTodos() { throw new Error("Método 'obtenerTodos()' no implementado"); }
  
  obtenerPorId(id) { throw new Error("Método 'obtenerPorId(id)' no implementado"); }
  
  crear(data) { throw new Error("Método 'crear(data)' no implementado"); }
  
  actualizar(id, data) { throw new Error("Método 'actualizar(id, data)' no implementado"); }
  
  eliminar(id) { throw new Error("Método 'eliminar(id)' no implementado"); }
  
}

export { IRepository };
