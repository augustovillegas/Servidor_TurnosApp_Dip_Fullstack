/**
 * Limpia todas las colecciones de la base de datos.
 * Actualizado para mantener consistencia con el nuevo seed completo.
 */
import mongoose from "mongoose";
import { connectMongo, disconnectMongo, isDirectRun } from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Submission } from "../models/Submission.mjs";

export async function limpiarDB() {
  const hadConnection = mongoose.connection.readyState !== 0;
  await connectMongo();
  
  console.log("\n🧹 Limpiando todas las colecciones...");
  
  // Eliminar documentos
  await Promise.all([
    User.deleteMany({}),
    Assignment.deleteMany({}),
    ReviewSlot.deleteMany({}),
    Submission.deleteMany({}),
  ]);

  // Verificar limpieza
  const counts = {
    users: await User.countDocuments(),
    assignments: await Assignment.countDocuments(),
    reviewslots: await ReviewSlot.countDocuments(),
    submissions: await Submission.countDocuments(),
  };

  console.log("✅ Base de datos limpiada:");
  console.log(`   - Usuarios: ${counts.users}`);
  console.log(`   - Asignaciones: ${counts.assignments}`);
  console.log(`   - Turnos: ${counts.reviewslots}`);
  console.log(`   - Entregas: ${counts.submissions}\n`);
  
  if (!hadConnection) {
    await disconnectMongo();
  }
}

if (isDirectRun(import.meta.url)) {
  limpiarDB().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
