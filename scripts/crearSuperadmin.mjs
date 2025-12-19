/**
 * Crea los usuarios base para pruebas manuales y automatizadas.
 *
 * - admin.seed@gmail.com          / admin123
 * - superadmin.diplomatura@gmail.com / Superadmin#2025
 */
import mongoose from "mongoose";
import {
  connectMongo,
  disconnectMongo,
  queueUser,
  hashPasswords,
  validateEmailsCom,
  isDirectRun,
  MODULES,
} from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";

const SUPERADMIN_DEFAULT_MODULE =
  MODULES.find((mod) => mod.slug === "htmlcss") ?? MODULES[0];

export const BASE_USERS_CONFIG = Object.freeze([
  {
    rol: "superadmin",
    nombre: "Admin",
    apellido: "App",
    email: "admin.seed@gmail.com",
    plainPassword: "admin123",
    moduloName: SUPERADMIN_DEFAULT_MODULE.name,
    moduloSlug: SUPERADMIN_DEFAULT_MODULE.slug,
    cohorte: SUPERADMIN_DEFAULT_MODULE.cohorte,
    estado: "Aprobado",
    preserveEmail: true,
  },
  {
    rol: "superadmin",
    nombre: "Superadmin",
    apellido: "AdminApp",
    email: "superadmin.diplomatura@gmail.com",
    plainPassword: "Superadmin#2025",
    moduloName: SUPERADMIN_DEFAULT_MODULE.name,
    moduloSlug: SUPERADMIN_DEFAULT_MODULE.slug,
    cohorte: SUPERADMIN_DEFAULT_MODULE.cohorte,
    estado: "Aprobado",
  },
]);

export async function crearSuperadmin(options = {}) {
  const { persist = true } = options;
  const seedUsers = [];

  for (const config of BASE_USERS_CONFIG) {
    const { apellido, ...rest } = config;
    queueUser(seedUsers, {
      ...rest,
      fullName: apellido ? `${config.nombre} ${apellido}` : config.nombre,
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
    ({ email, plainPassword, rol, moduloName, cohorte }) => ({
      email,
      password: plainPassword,
      rol,
      moduloName,
      cohorte,
    })
  );
}

if (isDirectRun(import.meta.url)) {
  crearSuperadmin()
    .then(() => console.log("Superadmin + profesor + alumno base creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
