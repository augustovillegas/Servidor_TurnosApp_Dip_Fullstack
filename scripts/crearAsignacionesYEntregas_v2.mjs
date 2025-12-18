/**
 * Alias de compatibilidad para mantener el nombre anterior sin duplicar logica.
 */
import { crearAsignacionesYEntregas } from "./crearAsignacionesYEntregas.mjs";
import { isDirectRun } from "./lib/seedUtils.mjs";

export { crearAsignacionesYEntregas };

if (isDirectRun(import.meta.url)) {
  crearAsignacionesYEntregas().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
