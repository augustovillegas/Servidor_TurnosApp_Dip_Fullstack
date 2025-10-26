/**
 * Limpia colecciones principales.
 */
import mongoose from "mongoose";
import { connectMongo, disconnectMongo, dropIfExists } from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Submission } from "../models/Submission.mjs";

export async function limpiarDB() {
  const hadConnection = mongoose.connection.readyState !== 0;
  await connectMongo();
  console.log("[DB] Limpiando colecciones...");
  await Promise.all([
    User.deleteMany({}),
    Assignment.deleteMany({}),
    ReviewSlot.deleteMany({}),
    Submission.deleteMany({}),
  ]);
  await dropIfExists("usuarios");
  await dropIfExists("turnos");
  await dropIfExists("entregas");
  console.log("[DB] Colecciones limpiadas.");
  if (!hadConnection) {
    await disconnectMongo();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  limpiarDB().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
