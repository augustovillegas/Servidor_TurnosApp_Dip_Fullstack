import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { IRepository } from "./IRepository.mjs";

class SlotRepository extends IRepository {
  async obtenerTodos(filtro = {}) {
    return await ReviewSlot.find(filtro);
  }
  async obtenerPorId(id) {
    return await ReviewSlot.findById(id);
  }
  async obtenerPorAssignment(assignmentId) {
    return await ReviewSlot.find({ assignment: assignmentId });
  }
  async crear(data) {
    return await ReviewSlot.create(data);
  }
  async actualizar(id, data) {
    return await ReviewSlot.findByIdAndUpdate(id, data, { new: true });
  }
  async eliminar(id) {return await ReviewSlot.findByIdAndDelete(id);
  }
}

export default new SlotRepository();

