/**
 * Crea asignaciones y cinco entregas por alumno reutilizando la logica comun.
 */
import { crearAsignacionesYEntregasCompleto } from "./lib/seedGenerators.mjs";
import { isDirectRun } from "./lib/seedUtils.mjs";

export async function crearAsignacionesYEntregas(options = {}) {
  return crearAsignacionesYEntregasCompleto(options);
}

if (isDirectRun(import.meta.url)) {
  crearAsignacionesYEntregas()
    .then((res) =>
      console.log(
        `Asignaciones creadas: ${res.assignments} | Entregas generadas: ${res.submissions}`
      )
    )
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
