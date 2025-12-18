/**
 * Genera 20 turnos por modulo (4 revisiones x 5 turnos) con datos completos.
 */
import { crearTurnos } from "./lib/seedGenerators.mjs";
import { crearAsignaciones } from "./lib/seedGenerators.mjs";
import { isDirectRun } from "./lib/seedUtils.mjs";

export async function crearTurnosReviews(options = {}) {
  const { assignmentsByModule } = await crearAsignaciones(options);
  const inserted = await crearTurnos({ assignmentsByModule });
  return inserted.length;
}

if (isDirectRun(import.meta.url)) {
  crearTurnosReviews()
    .then((total) => console.log(`[Turnos] Total registrados: ${total}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
