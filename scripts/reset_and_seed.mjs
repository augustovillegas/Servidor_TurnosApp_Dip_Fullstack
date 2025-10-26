/**
 * === RESET & SEED (versión final con resumen en SEED_USERS.md) ===
 *
 * - Limpia la DB
 * - Crea usuarios base y por módulo
 * - Aplica índices (usuarios, turnos, entregas, asignaciones)
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

const argv = yargs(hideBin(process.argv))
  .option("interactive", {
    type: "boolean",
    default: true,
    describe: "Pide confirmación manual antes de ejecutar el seed",
  })
  .parse();

/** Confirmación antes de borrar la DB */
async function askConfirmation() {
  const rl = readline.createInterface({ input, output });
  console.log("\n⚠️  [ADVERTENCIA] Este script ELIMINARÁ y RECREARÁ los datos en la base 'App-turnos'.");
  const answer = (await rl.question("Escribe SI para continuar: ")).trim().toUpperCase();
  await rl.close();
  if (answer !== "SI") {
    console.log("❌ Operación cancelada por el usuario.");
    process.exit(0);
  }
}

/** Genera el bloque de resumen que se añadirá a SEED_USERS.md */
async function buildSummary(seedFilePath, turnosCount) {
  await connectMongo();
  const totalUsuarios = await User.countDocuments();
  const totalTurnos = turnosCount || (await ReviewSlot.countDocuments());
  await disconnectMongo();

  const resumen = [
    "",
    "---",
    "## 📊 Resumen de Seed",
    "",
    `- 👥 **Usuarios creados:** ${totalUsuarios}`,
    `- 🧩 **Módulos procesados:** ${MODULES.length}`,
    `- 🕒 **Turnos creados:** ${totalTurnos}`,
    `- 📂 **Archivo de credenciales:** ${path.relative(process.cwd(), seedFilePath)}`,
    `- ⏱ **Fecha de ejecución:** ${new Date().toLocaleString()}`,
    "",
    "---",
    "✅ Seed completado correctamente.",
    "",
  ];

  await fs.appendFile(seedFilePath, resumen.join("\n"), { encoding: "utf8" });
  console.log("📊 Resumen agregado a SEED_USERS.md");
}

async function main() {
  try {
    if (argv.interactive) {
      await askConfirmation();
    } else {
      console.log("[INFO] Ejecutando sin confirmación interactiva (--interactive=false).");
    }

    console.log("\n🧹 Limpiando base de datos...");
    await limpiarDB();

    console.log("👤 Creando usuarios base...");
    const baseUsers = await crearSuperadmin();

    console.log("👥 Creando usuarios por roles y módulos...");
    const roleUsers = await crearUsuariosRoles();

    const allUsers = [...baseUsers, ...roleUsers];
    const seedFilePath = path.join(projectRoot, "SEED_USERS.md");
    await writeSeedFile(allUsers, "SEED_USERS.md");

    console.log("🔒 Aplicando índices en colecciones principales...");
    await aplicarIndices();

    console.log("🕒 Generando turnos disponibles por módulo...");
    const totalTurnos = await crearTurnosReviews();

    console.log("🧾 Agregando resumen final al SEED_USERS.md...");
    await buildSummary(seedFilePath, totalTurnos);

    console.log("\n✅ SEED COMPLETO");
    console.log("Revisa 'SEED_USERS.md' para credenciales y resumen.");
  } catch (err) {
    console.error("\n❌ Error durante el proceso de seed:", err);
    process.exit(1);
  }
}

main();
