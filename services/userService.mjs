import userRepository from "../repository/userRepository.mjs";

export const getAllUsers = async () => {
  return await userRepository.obtenerTodos();
};

export const getUserByEmail = async (email) => {
  return await userRepository.obtenerPorEmail(email);
};

export const getUserById = async (id) => {
  return await userRepository.obtenerPorId(id);
};

export const createUser = async (data) => {
  return await userRepository.crear(data);
};

export const updateUser = async (id, data) => {
  return await userRepository.actualizar(id, data);
};

export const deleteUser = async (id) => {
  return await userRepository.eliminar(id);
};

