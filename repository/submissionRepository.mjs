import { Submission } from "../models/Submission.mjs";
import { IRepository } from "./IRepository.mjs";

class RepositorioEntrega extends IRepository {
  async obtenerTodos() {
    return await Submission.find();
  }

  async obtenerPorId(id) {
    return await Submission.findById(id);
  }

  async obtenerPorEstudiante(idEstudiante) {
    return await Submission.find({ student: idEstudiante });
  }

  async crear(datos) {
    return await Submission.create(datos);
  }

  async actualizar(id, datos) {
    return await Submission.findByIdAndUpdate(id, datos, { new: true });
  }

  async eliminar(id) {
    return await Submission.findByIdAndDelete(id);
  }
}

export default new RepositorioEntrega();


