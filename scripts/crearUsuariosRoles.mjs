/**
 * Genera un profesor y veinte alumnos por modulo usando los generadores comunes.
 * Evita logica duplicada y mantiene correos/contraseñas coherentes.
 */
import { crearUsuariosPorModulo } from "./lib/seedGenerators.mjs";
import { isDirectRun } from "./lib/seedUtils.mjs";

export async function crearUsuariosRoles(options = {}) {
  return crearUsuariosPorModulo(options);
}

if (isDirectRun(import.meta.url)) {
  crearUsuariosRoles()
    .then(() => console.log("Usuarios por modulo creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export async function getModuleUserCredentials() {
  const seedUsers = await crearUsuariosRoles({ persist: false });
  return seedUsers.map(({ document, plainPassword, source }) => ({
    email: document.email,
    password: plainPassword,
    rol: document.rol,
    moduloName: document.modulo,
    cohorte: document.cohorte,
    source,
  }));
}
