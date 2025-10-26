/**
 * === aplicarIndices.mjs ===
 * Crea índices para todas las colecciones críticas de la app:
 * - usuarios, turnos, entregas, asignaciones.
 * Asegura unicidad e incrementa el rendimiento de búsqueda.
 */

import { connectMongo, disconnectMongo } from "./lib/seedUtils.mjs";

export async function aplicarIndices() {
  try {
    await connectMongo();
    const db = (await import("mongoose")).connection.db;
    console.log("🧩 Creando índices en la base de datos...");

    // === USUARIOS ===
    const usuarios = db.collection("usuarios");
    await usuarios.createIndex({ email: 1 }, { unique: true, name: "unique_email_index" });
    await usuarios.createIndex({ role: 1 }, { name: "role_index" });
    await usuarios.createIndex({ modulo: 1, cohortLabel: 1 }, { name: "modulo_cohort_index" });
    console.log("✅ Índices creados: usuarios");

    // === TURNOS (ReviewSlot) ===
    const turnos = db.collection("reviewslots");
    await turnos.createIndex(
      { modulo: 1, fecha: 1, sala: 1 },
      { unique: true, name: "unique_modulo_fecha_sala_index" }
    );
    await turnos.createIndex({ estado: 1 }, { name: "estado_index" });
    console.log("✅ Índices creados: turnos");

    // === ENTREGAS (Submission) ===
    const entregas = db.collection("submissions");
    await entregas.createIndex(
      { alumnoId: 1, sprint: 1 },
      { unique: true, name: "unique_alumno_sprint_index" }
    );
    await entregas.createIndex({ reviewStatus: 1 }, { name: "review_status_index" });
    console.log("✅ Índices creados: entregas");

    // === ASIGNACIONES (Assignment) ===
    const asignaciones = db.collection("assignments");
    await asignaciones.createIndex(
      { profesorId: 1, alumnoId: 1 },
      { unique: true, name: "unique_profesor_alumno_index" }
    );
    await asignaciones.createIndex({ modulo: 1 }, { name: "asignaciones_modulo_index" });
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
if (import.meta.url === `file://${process.argv[1]}`) {
  aplicarIndices()
    .then(() => console.log("🧱 Creación de índices finalizada."))
    .catch((e) => {
      console.error("Error general al aplicar índices:", e);
      process.exit(1);
    });
}
