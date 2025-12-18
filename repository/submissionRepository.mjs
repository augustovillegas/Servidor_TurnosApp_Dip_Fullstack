import { Submission } from "../models/Submission.mjs";
import { IRepository } from "./IRepository.mjs";

function populateSubmission(query) {
  return query
    .populate({ path: "assignment", select: "cohorte modulo title description" })
    .populate({ path: "student", select: "nombre rol cohorte modulo" });
}

class RepositorioEntrega extends IRepository {
  async obtenerTodos(filtro = {}) {
    return await populateSubmission(Submission.find(filtro));
  }

  async obtenerPorId(id) {
    return await populateSubmission(Submission.findById(id));
  }

  async obtenerPorEstudiante(idEstudiante) {
    return await populateSubmission(Submission.find({ student: idEstudiante }));
  }

  async crear(datos) {
    return await Submission.create(datos);
  }

  async actualizar(id, datos) {
    return await populateSubmission(Submission.findByIdAndUpdate(id, datos, { new: true }));
  }

  async eliminar(id) {
    return await populateSubmission(Submission.findByIdAndDelete(id));
  }
}

export default new RepositorioEntrega();


