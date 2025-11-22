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

export const BASE_USERS_CONFIG = Object.freeze([
  {
    role: "superadmin",
    nombre: "Admin",
    apellido: "App",
    email: "admin.seed@gmail.com",
    plainPassword: "admin123",
    moduloName: "-",
    moduloSlug: "",
    moduleCode: 0,
    estado: "Aprobado",
    cohortLabel: "-",
    preserveEmail: true,
  },
  {
    role: "superadmin",
    nombre: "Superadmin",
    apellido: "AdminApp",
    email: "superadmin.diplomatura@gmail.com",
    plainPassword: "Superadmin#2025",
    moduloName: "-",
    moduloSlug: "",
    moduleCode: 0,
    estado: "Aprobado",
    cohortLabel: "-",
  },
  {
    role: "profesor",
    nombre: "Profesor",
    apellido: "AdminApp",
    email: "profesor.general@gmail.com",
    plainPassword: "Profesor#2025",
    moduloName: "FRONTEND - REACT",
    moduloSlug: "react",
    moduleCode: 4,
    estado: "Aprobado",
    cohortLabel: "2025-Q4",
  },
  {
    role: "alumno",
    nombre: "Alumno",
    apellido: "AdminApp",
    email: "alumno.general@gmail.com",
    plainPassword: "Alumno#2025",
    moduloName: "FRONTEND - REACT",
    moduloSlug: "react",
    moduleCode: 4,
    estado: "Aprobado",
    cohortLabel: "2025-Q4",
  },
]);

export async function crearSuperadmin(options = {}) {
  const { persist = true } = options;
  const seedUsers = [];

  for (const config of BASE_USERS_CONFIG) {
    queueUser(seedUsers, {
      ...config,
      // Asegurar isApproved verdadero si estado es Aprobado
      isApproved: config.estado === "Aprobado",
      source: "base",
    });
  }

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

export function getBaseUserCredentials() {
  return BASE_USERS_CONFIG.map(
    ({ email, plainPassword, role, moduloName, moduloSlug, cohortLabel }) => ({
      email,
      password: plainPassword,
      role,
      moduloName,
      moduloSlug,
      cohortLabel,
    })
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearSuperadmin()
    .then(() => console.log("Superadmin + profesor + alumno base creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
