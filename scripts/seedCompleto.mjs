/**
 * SEED COMPLETO
 * Genera un entorno realista listo para pruebas de funcionalidades:
 * - Superadmin + profesor/alumno base
 * - 4 modulos con 1 profesor y 20 alumnos cada uno
 * - 5 asignaciones por modulo y 5 entregas por alumno (400 entregas)
 * - 20 turnos de revision por modulo (80 en total) vinculados al sprint correspondiente
 */
import path from "node:path";
import {
  projectRoot,
  connectMongo,
  disconnectMongo,
  writeSeedFile,
  isDirectRun,
} from "./lib/seedUtils.mjs";
import { limpiarDB } from "./limpiarDB.mjs";
import { crearSuperadmin } from "./crearSuperadmin.mjs";
import { crearUsuariosRoles } from "./crearUsuariosRoles.mjs";
import { crearAsignacionesYEntregasCompleto, crearTurnos } from "./lib/seedGenerators.mjs";
import fs from "fs-extra";
import { User } from "../models/User.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { Submission } from "../models/Submission.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";

async function generarResumen(seedFilePath, counters) {
  const resumen = [
    "",
    "---",
    "## Resumen de Seed",
    "",
    `- Usuarios creados: ${counters.usuarios}`,
    `- Asignaciones creadas: ${counters.asignaciones}`,
    `- Entregas generadas: ${counters.entregas}`,
    `- Turnos creados: ${counters.turnos}`,
    `- Archivo de credenciales: ${path.relative(process.cwd(), seedFilePath)}`,
    `- Fecha de ejecucion: ${new Date().toLocaleString()}`,
    "",
  ];

  return resumen.join("\n");
}

export async function ejecutarSeedCompleto() {
  console.log("\n============================================");
  console.log("Iniciando SEED COMPLETO - entorno realista");
  console.log("============================================\n");

  await connectMongo();
  await limpiarDB();

  console.log("[1/4] Creando usuarios base y por modulo...");
  const baseUsers = await crearSuperadmin({ persist: true });
  const moduleUsers = await crearUsuariosRoles({ persist: true });

  const seedFilePath = path.join(projectRoot, "logs", "docs", "SEED_USERS.md");
  await writeSeedFile([...baseUsers, ...moduleUsers], "SEED_USERS.md");

  console.log("[2/4] Generando asignaciones y entregas completas...");
  const { assignmentsByModule } = await crearAsignacionesYEntregasCompleto();

  console.log("[3/4] Generando turnos disponibles vinculados a asignaciones...");
  const turnosInsertados = await crearTurnos({ assignmentsByModule });
  console.log(`      Turnos creados: ${turnosInsertados.length}`);

  console.log("[4/4] Calculando resumen final...");
  const counters = {
    usuarios: await User.countDocuments(),
    asignaciones: await Assignment.countDocuments(),
    entregas: await Submission.countDocuments(),
    turnos: await ReviewSlot.countDocuments(),
  };

  const resumenTexto = await generarResumen(seedFilePath, counters);
  await fs.appendFile(seedFilePath, resumenTexto, { encoding: "utf8" });

  console.log("\nSEED COMPLETO FINALIZADO:\n");
  console.log(`- Usuarios: ${counters.usuarios}`);
  console.log(`- Asignaciones: ${counters.asignaciones}`);
  console.log(`- Entregas: ${counters.entregas}`);
  console.log(`- Turnos: ${counters.turnos}`);
  console.log(`- Credenciales: ${path.relative(process.cwd(), seedFilePath)}\n`);

  await disconnectMongo();
}

if (isDirectRun(import.meta.url)) {
  ejecutarSeedCompleto().catch((err) => {
    console.error("\n[ERROR] Hubo un problema durante el seed completo:", err);
    process.exit(1);
  });
}
