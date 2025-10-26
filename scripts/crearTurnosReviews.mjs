/**
 * Genera 10 turnos "Disponibles" por cada módulo.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODULES,
  projectRoot,
  connectMongo,
  disconnectMongo,
} from "./lib/seedUtils.mjs";
import dotenv from "dotenv";
import { ReviewSlot } from "../models/ReviewSlot.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(projectRoot, ".env") });

export async function crearTurnosReviews() {
  await connectMongo();

  // Limpiar turnos previos
  await ReviewSlot.deleteMany({});
  console.log("🧹 Turnos previos eliminados.");

  const turnos = [];
  for (const mod of MODULES) {
    for (let i = 1; i <= 10; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split("T")[0];

      turnos.push({
        review: i,
        fecha: fechaStr,
        horario: "10:00 - 10:30",
        sala: `${mod.name} Sala ${i}`,
        zoomLink: `https://zoom.us/j/${mod.slug}${i}000`,
        estado: "Disponible",
        modulo: mod.name,
        moduloSlug: mod.slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const inserted = await ReviewSlot.insertMany(turnos, { ordered: true });
  console.log("\n=== TURNOS CREADOS ===");
  inserted.forEach((t) => {
    console.log(`📅 ${t.modulo} | ${t.fecha} | ${t.sala} | ${t.estado}`);
  });
  console.log(`\n✅ Total: ${inserted.length} turnos creados.`);

  await disconnectMongo();
  return inserted.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearTurnosReviews()
    .then(() => console.log("✅ Turnos creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

