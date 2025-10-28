/**
 * Crea los usuarios base para pruebas manuales y automatizadas.
 *
 * - admin.seed@gmail.com          / admin123
 * - superadmin.diplomatura@gmail.com / Superadmin#2025
 * - profesor.general@gmail.com    / Profesor#2025
 * - alumno.general@gmail.com      / Alumno#2025
 */
import mongoose from "mongoose";
import {
  connectMongo,
  disconnectMongo,
  queueUser,
  hashPasswords,
  validateEmailsCom,
} from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";

export async function crearSuperadmin(options = {}) {
  const { persist = true } = options;
  const seedUsers = [];

  queueUser(seedUsers, {
    role: "superadmin",
    nombre: "Admin",
    apellido: "App",
    email: "admin.seed@gmail.com",
    plainPassword: "admin123",
    moduloName: "-",
    moduleCode: 0,
    estado: "Aprobado",
    cohortLabel: "-",
    preserveEmail: true,
    source: "base",
  });

  queueUser(seedUsers, {
    role: "superadmin",
    nombre: "Superadmin",
    apellido: "AdminApp",
    email: "superadmin.diplomatura@gmail.com",
    plainPassword: "Superadmin#2025",
    moduloName: "-",
    moduleCode: 0,
    estado: "Aprobado",
    cohortLabel: "-",
    source: "base",
  });

  queueUser(seedUsers, {
    role: "profesor",
    nombre: "Profesor",
    apellido: "AdminApp",
    email: "profesor.general@gmail.com",
    plainPassword: "Profesor#2025",
    moduloName: "Frontend",
    moduloSlug: "frontend",
    moduleCode: 1,
    estado: "Aprobado",
    cohortLabel: "2025-Q4",
    source: "base",
  });

  queueUser(seedUsers, {
    role: "alumno",
    nombre: "Alumno",
    apellido: "AdminApp",
    email: "alumno.general@gmail.com",
    plainPassword: "Alumno#2025",
    moduloName: "Frontend",
    moduloSlug: "frontend",
    moduleCode: 1,
    estado: "Aprobado",
    cohortLabel: "2025-Q4",
    source: "base",
  });

  const invalid = validateEmailsCom(seedUsers);
  if (invalid.length) {
    const list = invalid.map((i) => i.document.email).join(", ");
    throw new Error(`Emails invalidos (.com requerido): ${list}`);
  }

  if (persist) {
    const hadConnection = mongoose.connection.readyState !== 0;
    await connectMongo();
    await hashPasswords(seedUsers);
    const documents = seedUsers.map((s) => s.document);
    try {
      await User.collection.insertMany(documents, { ordered: false });
    } catch (err) {
      if (err?.code !== 11000) {
        throw err;
      }
      console.warn("[Seed] Usuarios base ya existentes, se omite insercion duplicada.");
    }
    if (!hadConnection) {
      await disconnectMongo();
    }
  }

  return seedUsers;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearSuperadmin()
    .then(() => console.log("Superadmin + profesor + alumno base creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
