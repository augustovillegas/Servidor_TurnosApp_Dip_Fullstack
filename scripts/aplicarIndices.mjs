/**
 * === aplicarIndices.mjs ===
 * Crea índices para todas las colecciones críticas de la app:
 * - usuarios, turnos, entregas, asignaciones.
 * Asegura unicidad e incrementa el rendimiento de búsqueda.
 */

import mongoose from "mongoose";
import { connectMongo, disconnectMongo, isDirectRun } from "./lib/seedUtils.mjs";

function defaultIndexName(keys = {}) {
  return Object.entries(keys)
    .map(([field, order]) => `${field}_${order}`)
    .join("_");
}

async function recreateIndex(collection, keys, options = {}, legacyNames = []) {
  const namesToDrop = new Set(
    [...legacyNames, options.name, defaultIndexName(keys)].filter(Boolean)
  );

  for (const name of namesToDrop) {
    await collection.dropIndex(name).catch(() => {});
  }

  await collection.createIndex(keys, options);
}

export async function aplicarIndices() {
  try {
    await connectMongo();
    const db = mongoose.connection.db;
    console.log("🧩 Creando índices en la base de datos...");

    // === USUARIOS ===
    const usuarios = db.collection("users");
    await recreateIndex(
      usuarios,
      { email: 1 },
      { unique: true, name: "unique_email_index" },
      ["email_1"]
    );
    await recreateIndex(usuarios, { rol: 1 }, { name: "rol_index" }, ["rol_1", "role_1"]);
    await recreateIndex(
      usuarios,
      { modulo: 1, cohorte: 1 },
      { name: "modulo_cohorte_index" },
      ["modulo_1_cohorte_1"]
    );
    console.log("✅ Índices creados: usuarios");

    // === TURNOS (ReviewSlot) ===
    const turnos = db.collection("reviewslots");
    await recreateIndex(
      turnos,
      { cohorte: 1, fecha: 1, sala: 1 },
      { unique: true, name: "unique_cohorte_fecha_sala_index" },
      ["cohorte_1_date_1_room_1", "cohorte_1_fecha_1_sala_1"]
    );
    await recreateIndex(turnos, { estado: 1 }, { name: "estado_index" }, ["estado_1"]);
    console.log("✅ Índices creados: turnos");

    // === ENTREGAS (Submission) ===
    const entregas = db.collection("submissions");
    await recreateIndex(
      entregas,
      { student: 1, sprint: 1 },
      { unique: true, name: "unique_student_sprint_index" },
      ["student_1_sprint_1"]
    );
    await recreateIndex(entregas, { reviewStatus: 1 }, { name: "review_status_index" }, ["reviewStatus_1"]);
    console.log("✅ Índices creados: entregas");

    // === ASIGNACIONES (Assignment) ===
    const asignaciones = db.collection("assignments");
    await recreateIndex(
      asignaciones,
      { modulo: 1, cohorte: 1 },
      { name: "asignaciones_modulo_cohorte" },
      ["modulo_1_cohorte_1"]
    );
    await recreateIndex(
      asignaciones,
      { createdBy: 1 },
      { name: "assignment_owner_index" },
      ["createdBy_1"]
    );
    console.log("✅ Índices creados: asignaciones");

    console.log("\n🔒 Todos los índices fueron aplicados correctamente.");
  } catch (err) {
    console.error("❌ Error al crear índices:", err);
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}

// Permite ejecución directa por CLI
if (isDirectRun(import.meta.url)) {
  aplicarIndices()
    .then(() => console.log("🧱 Creación de índices finalizada."))
    .catch((e) => {
      console.error("Error general al aplicar índices:", e);
      process.exit(1);
    });
}
