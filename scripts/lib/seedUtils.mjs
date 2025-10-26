/**
 * Utilidades compartidas para los scripts de seed.
 * - Normalización de emails a dominio .com
 * - Validaciones
 * - Helpers de conexión, hashing y generación de Markdown
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(projectRoot, ".env") });

export function resolveMongoUri() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  if (!uri) {
    console.error("[ERROR] Debes definir MONGO_URI o MONGO_URL en el archivo .env.");
    process.exit(1);
  }
  return uri;
}
export const EMAIL_DOMAIN = "adminapp.com"; // ✅ dominio final garantizado .com

export const MODULES = [
  { name: "Frontend", slug: "frontend", code: 1 },
  { name: "Backend", slug: "backend", code: 2 },
  { name: "UX-UI", slug: "uxui", code: 3 },
  { name: "DevOps", slug: "devops", code: 4 },
];

export const COHORTS = [
  { label: "2025-Q4", count: 12, isRecursante: false },
  { label: "2025-Q3", count: 6, isRecursante: false },
  { label: "2024-Q4", count: 2, isRecursante: true },
];

export function toPasswordToken(name) {
  return String(name).toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}
export function pad2(n) {
  return String(n).padStart(2, "0");
}

export async function connectMongo() {
  if (mongoose.connection.readyState === 0) {
    const uri = resolveMongoUri();
    await mongoose.connect(uri, { dbName: "App-turnos" });
  }
  return mongoose.connection;
}
export async function disconnectMongo() {
  await mongoose.disconnect();
}

export async function dropIfExists(name) {
  const collections = await mongoose.connection.db.listCollections({ name }).toArray();
  if (collections.length > 0) {
    await mongoose.connection.db.collection(name).drop();
    console.log(`Colección '${name}' eliminada.`);
  }
}

/**
 * Normaliza cualquier email al dominio .com definido:
 * - "alumno.backend.17@local"  -> "alumno.backend.17@adminapp.com"
 * - "profesor.uxui"            -> "profesor.uxui@adminapp.com"
 * - "user@otrodominio.net"     -> "user@adminapp.com"
 */
export function ensureEmailDomain(input, domain = EMAIL_DOMAIN) {
  const raw = String(input || "").trim();
  if (!raw) return `user@${domain}`;
  const at = raw.indexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  return `${local}@${String(domain).toLowerCase()}`;
}

/** Estricta: solo .com permitido */
export function isComEmail(email) {
  return /^[^\s@]+@[^\s@]+\.com$/i.test(String(email || "").trim());
}

/** Valida y devuelve los que NO cumplen .com */
export function validateEmailsCom(seedUsers) {
  return seedUsers.filter((s) => !isComEmail(s.document.email));
}

export function queueUser(seedUsers, cfg) {
  const normalizedEmail = cfg?.preserveEmail
    ? String(cfg.email || "").trim().toLowerCase()
    : ensureEmailDomain(cfg.email); // fuerza .com por defecto

  const doc = {
    name: `${cfg?.nombre ?? ""} ${cfg?.apellido ?? ""}`.trim() || normalizedEmail,
    nombre: cfg?.nombre ?? null,
    apellido: cfg?.apellido ?? null,
    email: normalizedEmail,
    role: cfg.role,
    modulo: cfg?.moduloName ?? "-",
    moduloSlug: cfg?.moduloSlug ?? "",
    cohort: cfg?.moduleCode ?? 0,
    cohortLabel: cfg?.cohortLabel ?? "-",
    isRecursante: Boolean(cfg?.isRecursante),
    status: cfg?.estado ?? "Aprobado",
    isApproved: (cfg?.estado ?? "Aprobado") === "Aprobado",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  seedUsers.push({
    document: doc,
    plainPassword: cfg.plainPassword,
    tableRow: {
      rol: cfg.role,
      nombre: doc.name,
      usuario: normalizedEmail,
      contrasenia: cfg.plainPassword,
      modulo: doc.modulo,
      cohort: doc.cohortLabel,
      estado: doc.status,
    },
  });
}
export async function hashPasswords(seedUsers) {
  for (const entry of seedUsers) {
    entry.document.passwordHash = await bcrypt.hash(entry.plainPassword, 10);
  }
}

export function buildMarkdown(seedUsers) {
  const header = [
    "# Credenciales de Seed - Proyecto Diplomatura",
    `Fecha: ${new Date().toISOString()}`,
    "",
    "> Usa la columna **usuario** (email) y **contrasena** para iniciar sesion.",
    "",
    "| rol | nombre | usuario | contrasena | modulo | cohort | estado |",
    "|-----|--------|---------|------------|--------|--------|--------|",
  ];
  const rows = seedUsers.map((e) => {
    const r = e.tableRow;
    return `| ${r.rol} | ${r.nombre} | ${r.usuario} | ${r.contrasenia} | ${r.modulo} | ${r.cohort} | ${r.estado} |`;
  });
  return `${header.concat(rows).join("\n")}\n`;
}

export async function writeSeedFile(seedUsers, filename = "SEED_USERS.md") {
  const md = buildMarkdown(seedUsers);
  const outPath = path.join(projectRoot, filename);
  await fs.outputFile(outPath, md, { encoding: "utf8" });
  console.log(`Archivo de credenciales generado: ${path.relative(process.cwd(), outPath)}`);
}
