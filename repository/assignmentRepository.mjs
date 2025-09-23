import { Assignment } from "../models/Assignment.mjs";
import { IRepository } from "./IRepository.mjs";


class RepositorioAsignacion extends IRepository {
    
async obtenerTodos(filtro = {}) {
return await Assignment.find(filtro);
}


async obtenerPorId(id) {
return await Assignment.findById(id);
}


async crear(datos) {
return await Assignment.create(datos);
}


async actualizar(id, datos) {
return await Assignment.findByIdAndUpdate(id, datos, { new: true });
}


async eliminar(id) {
return await Assignment.findByIdAndDelete(id);
}
}


export default new RepositorioAsignacion();

