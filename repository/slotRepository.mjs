import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { IRepository } from "./IRepository.mjs";

function populateSlot(query) {
  return query
    .populate({
      path: "assignment",
      select: "modulo cohorte title description createdBy",
    })
    .populate({
      path: "student",
      select: "nombre rol cohorte modulo",
    });
}

class SlotRepository extends IRepository {
  async obtenerTodos(filtro = {}) {
    const query = ReviewSlot.find(filtro);
    return await populateSlot(query);
  }
  async obtenerPorId(id) {
    const query = ReviewSlot.findById(id);
    return await populateSlot(query);
  }
  async obtenerPorAssignment(assignmentId) {
    const query = ReviewSlot.find({ assignment: assignmentId });
    return await populateSlot(query);
  }
  async crear(data) {
    const creado = await ReviewSlot.create(data);
    return await this.obtenerPorId(creado._id);
  }
  async actualizar(id, data) {
    await ReviewSlot.findByIdAndUpdate(id, data);
    return await this.obtenerPorId(id);
  }
  async eliminar(id) {
    return await ReviewSlot.findByIdAndDelete(id);
  }
}

export default new SlotRepository();
