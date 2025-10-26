/**
 * Crea los usuarios base para pruebas:
 * - admin@app.com          / admin123
 * - superadmin@adminapp.com / Superadmin#2025
 * - profesor@adminapp.com  / Profesor#2025
 * - alumno@adminapp.com    / Alumno#2025
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

export async function crearSuperadmin() {
  const seedUsers = [];

  queueUser(seedUsers, {
    role: "superadmin",
    nombre: "Admin",
    apellido: "App",
    email: "admin@app.com",
    plainPassword: "admin123",
    moduloName: "-",
    moduleCode: 0,
    estado: "Aprobado",
    cohortLabel: "-",
    preserveEmail: true,
  });

  queueUser(seedUsers, {
    role: "superadmin",
    nombre: "Superadmin",
    apellido: "AdminApp",
    email: "superadmin@adminapp.com",
    plainPassword: "Superadmin#2025",
    moduloName: "-",
    moduleCode: 0,
    estado: "Aprobado",
    cohortLabel: "-",
  });

  queueUser(seedUsers, {
    role: "profesor",
    nombre: "Profesor",
    apellido: "AdminApp",
    email: "profesor@adminapp.com",
    plainPassword: "Profesor#2025",
    moduloName: "Frontend",
    moduloSlug: "frontend",
    moduleCode: 1,
    estado: "Aprobado",
    cohortLabel: "2025-Q4",
  });

  queueUser(seedUsers, {
    role: "alumno",
    nombre: "Alumno",
    apellido: "AdminApp",
    email: "alumno@adminapp.com",
    plainPassword: "Alumno#2025",
    moduloName: "Frontend",
    moduloSlug: "frontend",
    moduleCode: 1,
    estado: "Aprobado",
    cohortLabel: "2025-Q4",
  });

  // ✅ verificación estricta .com
  const invalid = validateEmailsCom(seedUsers);
  if (invalid.length) {
    const list = invalid.map((i) => i.document.email).join(", ");
    throw new Error(`Emails inválidos (.com requerido): ${list}`);
  }

  const hadConnection = mongoose.connection.readyState !== 0;
  await connectMongo();
  await hashPasswords(seedUsers);
  await User.collection.insertMany(seedUsers.map((s) => s.document), { ordered: true });
  if (!hadConnection) {
    await disconnectMongo();
  }

  return seedUsers;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearSuperadmin()
    .then(() => console.log("✅ Superadmin + profesor + alumno creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

