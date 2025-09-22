import { User } from "../models/User.mjs";
import { IRepository } from "./IRepository.mjs";

class UserRepository extends IRepository {
  async obtenerTodos() {
    return await User.find();
  }
  async obtenerPorId(id) {
    return await User.findById(id);
  }
  async obtenerPorEmail(email) {
    return await User.findOne({ email });
  }
  async crear(data) {
    return await User.create(data);
  }
  async actualizar(id, data) {
    return await User.findByIdAndUpdate(id, data, { new: true });
  }
  async eliminar(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
