/**
 * === RESET & SEED (version final con resumen en SEED_USERS.md) ===
 *
 * - Limpia la base de datos
 * - Crea usuarios base y por modulo
 * - Aplica indices principales
 * - Genera asignaciones y entregas
 * - Genera turnos disponibles
 * - Escribe SEED_USERS.md con credenciales y resumen general
 */

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs-extra";
import path from "node:path";

import { limpiarDB } from "./limpiarDB.mjs";
import { crearSuperadmin } from "./crearSuperadmin.mjs";
import { crearUsuariosRoles } from "./crearUsuariosRoles.mjs";
import { crearTurnosReviews } from "./crearTurnosReviews.mjs";
import { crearAsignacionesYEntregas } from "./crearAsignacionesYEntregas.mjs";
import { aplicarIndices } from "./aplicarIndices.mjs";
import {
  writeSeedFile,
  projectRoot,
  MODULES,
  connectMongo,
  disconnectMongo,
} from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { Submission } from "../models/Submission.mjs";

const argv = yargs(hideBin(process.argv))
  .option("interactive", {
    type: "boolean",
    default: true,
    describe: "Pide confirmacion manual antes de ejecutar el seed",
  })
  .parse();

async function askConfirmation() {
  const rl = readline.createInterface({ input, output });
  console.log("\n[WARN] Este script eliminara y recreara los datos en la base 'App-turnos'.");
  const answer = (await rl.question("Escribe SI para continuar: ")).trim().toUpperCase();
  await rl.close();
  if (answer !== "SI") {
    console.log("[INFO] Operacion cancelada por el usuario.");
    process.exit(0);
  }
}

async function buildSummary(seedFilePath, counters = {}) {
  await connectMongo();
  const totalUsuarios = await User.countDocuments();
  const totalTurnos = counters.turnos ?? (await ReviewSlot.countDocuments());
  const totalAsignaciones = counters.assignments ?? (await Assignment.countDocuments());
  const totalEntregas = counters.submissions ?? (await Submission.countDocuments());
  await disconnectMongo();

  const resumen = [
    "",
    "---",
    "## Resumen de Seed",
    "",
    `- Usuarios creados: ${totalUsuarios}`,
    `- Modulos procesados: ${MODULES.length}`,
    `- Asignaciones creadas: ${totalAsignaciones}`,
    `- Entregas generadas: ${totalEntregas}`,
    `- Turnos creados: ${totalTurnos}`,
    `- Archivo de credenciales: ${path.relative(process.cwd(), seedFilePath)}`,
    `- Fecha de ejecucion: ${new Date().toLocaleString()}`,
    "",
    "---",
    "Seed completado correctamente.",
    "",
  ];

  await fs.appendFile(seedFilePath, resumen.join("\n"), { encoding: "utf8" });
  console.log("[INFO] Resumen agregado a SEED_USERS.md");
}

async function main() {
  try {
    if (argv.interactive) {
      await askConfirmation();
    } else {
      console.log("[INFO] Ejecutando sin confirmacion interactiva (--interactive=false).");
    }

    console.log("\n[1/7] Limpiando base de datos...");
    await limpiarDB();

    console.log("[2/7] Creando usuarios base...");
    const baseUsers = await crearSuperadmin();

    console.log("[3/7] Creando usuarios por modulo...");
    const roleUsers = await crearUsuariosRoles();

    const allUsers = [...baseUsers, ...roleUsers];
    const seedFilePath = path.join(projectRoot, "SEED_USERS.md");
    await writeSeedFile(allUsers, "SEED_USERS.md");

    console.log("[4/7] Aplicando indices en colecciones principales...");
    await aplicarIndices();

    console.log("[5/7] Generando asignaciones y entregas por sprint...");
    const registrosEntregas = await crearAsignacionesYEntregas();

    console.log("[6/7] Generando turnos disponibles por modulo...");
    const totalTurnos = await crearTurnosReviews();

    console.log("[7/7] Agregando resumen final al SEED_USERS.md...");
    await buildSummary(seedFilePath, {
      turnos: totalTurnos,
      assignments: registrosEntregas.assignments,
      submissions: registrosEntregas.submissions,
    });

    console.log("\n[OK] Seed completo. Revisa 'SEED_USERS.md' para credenciales y resumen.");
  } catch (err) {
    console.error("\n[ERROR] Hubo un problema durante el proceso de seed:", err);
    process.exit(1);
  }
}

main();
