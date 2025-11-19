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
const TURNOS_POR_MODULO = 5;
const TURNOS_POR_REVIEW = 5;

function buildZoomLink(modSlug, reviewNumber) {
  return `https://zoom.us/j/${modSlug}${String(reviewNumber).padStart(2, "0")}000`;
}

function buildSlotDates(baseDate, reviewNumber, turnoIndex = 1) {
  const slotDate = new Date(baseDate);
  slotDate.setDate(slotDate.getDate() + reviewNumber);

  const minutesOffset = SLOT_DURATION_MINUTES * (turnoIndex - 1);
  const startHour = DEFAULT_START_HOUR + Math.floor(minutesOffset / 60);
  const startMinutes = minutesOffset % 60;
  slotDate.setHours(startHour, startMinutes, 0, 0);

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
      for (let turnoIndex = 1; turnoIndex <= TURNOS_POR_REVIEW; turnoIndex++) {
        const { slotDate, endDate } = buildSlotDates(now, reviewNumber, turnoIndex);
        const startTime = `${String(slotDate.getHours()).padStart(
          2,
          "0"
        )}:${String(slotDate.getMinutes()).padStart(2, "0")}`;
        const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(
          endDate.getMinutes()
        ).padStart(2, "0")}`;

        turnos.push({
          cohort: mod.code,
          reviewNumber,
          date: slotDate,
          startTime,
          endTime,
          start: slotDate,
          end: endDate,
          room: `${mod.name} Sala ${reviewNumber}-${turnoIndex}`,
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

