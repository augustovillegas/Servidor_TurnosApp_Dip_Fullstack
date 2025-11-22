/**
 * Setup global de tests para Vitest
 * Limpia la base de datos solo ANTES de comenzar toda la suite
 * para evitar contaminación entre ejecuciones de tests.
 */
import { beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import {
  ensureDatabaseInitialized,
  cleanDatabase,
  disconnectTestDB,
} from "./helpers/testUtils.mjs";

beforeAll(async () => {
  // Conectar DB - cada suite individual decidirá si limpia o no según su estrategia de seeding.
  await ensureDatabaseInitialized();
});

afterAll(async () => {
  // Solo desconectar; la limpieza post-tests puede interferir con tests paralelos aún en ejecución.
  if (mongoose.connection?.readyState !== 0) {
    await disconnectTestDB();
  }
});
