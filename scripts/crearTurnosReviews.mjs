/**
 * Genera turnos de revisión completos para cada módulo,
 * asegurando que todas las columnas relevantes tengan información.
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

const DEFAULT_START_HOUR = 10;
const SLOT_DURATION_MINUTES = 30;
const TURNOS_POR_MODULO = 10;

function buildZoomLink(modSlug, reviewNumber) {
  return `https://zoom.us/j/${modSlug}${String(reviewNumber).padStart(2, "0")}000`;
}

function buildSlotDates(baseDate, index) {
  const slotDate = new Date(baseDate);
  slotDate.setDate(slotDate.getDate() + index);
  slotDate.setHours(DEFAULT_START_HOUR, 0, 0, 0);

  const endDate = new Date(slotDate);
  endDate.setMinutes(endDate.getMinutes() + SLOT_DURATION_MINUTES);

  return { slotDate, endDate };
}

export async function crearTurnosReviews() {
  const hadConnection = ReviewSlot.db?.readyState && ReviewSlot.db.readyState !== 0;
  await connectMongo();

  await ReviewSlot.deleteMany({});
  console.log("[Turnos] Colección limpiada antes de regenerar datos.");

  const now = new Date();
  const turnos = [];

  for (const mod of MODULES) {
    for (let reviewNumber = 1; reviewNumber <= TURNOS_POR_MODULO; reviewNumber++) {
      const { slotDate, endDate } = buildSlotDates(now, reviewNumber);

      turnos.push({
        cohort: mod.code,
        reviewNumber,
        date: slotDate,
        startTime: `${String(DEFAULT_START_HOUR).padStart(2, "0")}:00`,
        endTime: `${String(DEFAULT_START_HOUR).padStart(2, "0")}:${String(
          SLOT_DURATION_MINUTES
        ).padStart(2, "0")}`,
        start: slotDate,
        end: endDate,
        room: `${mod.name} Sala ${reviewNumber}`,
        zoomLink: buildZoomLink(mod.slug, reviewNumber),
        estado: "Disponible",
        reviewStatus: "A revisar",
        comentarios: "Disponible para reservas.",
        modulo: mod.name,
        moduloSlug: mod.slug,
        assignment: null,
        student: null,
        approvedByProfessor: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const inserted = await ReviewSlot.insertMany(turnos, { ordered: true });
  console.log("\n=== TURNOS CREADOS ===");
  inserted.forEach((slot) => {
    console.log(
      `[Turno] ${slot.modulo} | Cohorte ${slot.cohort} | ${slot.date.toISOString()} | ${slot.room} | ${slot.estado}`
    );
  });
  console.log(`\n[Turnos] Total registrados: ${inserted.length}.`);

  if (!hadConnection) {
    await disconnectMongo();
  }
  return inserted.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearTurnosReviews()
    .then(() => console.log("[Turnos] Registros generados correctamente."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

