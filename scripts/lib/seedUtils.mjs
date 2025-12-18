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
export const EMAIL_DOMAIN = "gmail.com"; // ✅ dominio final garantizado .com

export const MODULES = [
  { name: "HTML-CSS", slug: "htmlcss", cohorte: 1 },
  { name: "JAVASCRIPT", slug: "javascript", cohorte: 2 },
  { name: "BACKEND - NODE JS", slug: "node", cohorte: 3 },
  { name: "FRONTEND - REACT", slug: "react", cohorte: 4 },
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

export function slugifyLocal(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.+/g, ".")
    .toLowerCase();
}

export async function connectMongo() {
  if (mongoose.connection.readyState === 0) {
    const uri = resolveMongoUri();
    await mongoose.connect(uri);
  }
  return mongoose.connection;
}
export async function disconnectMongo() {
  await mongoose.disconnect();
}

export function isDirectRun(metaUrl) {
  if (!metaUrl) return false;
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return invokedPath && invokedPath === fileURLToPath(metaUrl);
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
 * - "alumno.backend.17@local"  -> "alumno.backend.17@gmail.com"
 * - "profesor.uxui"            -> "profesor.uxui@gmail.com"
 * - "user@otrodominio.net"     -> "user@gmail.com"
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

  const fullName =
    cfg?.fullName ??
    (cfg?.apellido ? `${cfg.nombre} ${cfg.apellido}`.trim() : cfg?.nombre ?? normalizedEmail);

  const doc = {
    nombre: fullName,
    email: normalizedEmail,
    rol: cfg.rol,
    modulo: cfg?.moduloName ?? "-",
    moduloSlug: cfg?.moduloSlug ?? null,
    cohorte: cfg?.cohorte ?? 0,
    status: cfg?.estado ?? "Aprobado",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  seedUsers.push({
    document: doc,
    plainPassword: cfg.plainPassword,
    tableRow: {
      rol: cfg.rol,
      nombre: fullName,
      usuario: normalizedEmail,
      contrasenia: cfg.plainPassword,
      modulo: doc.modulo,
      cohorte: doc.cohorte,
      estado: doc.status,
    },
    source: cfg?.source ?? "module",
  });
}
export async function hashPasswords(seedUsers) {
  for (const entry of seedUsers) {
    entry.document.passwordHash = await bcrypt.hash(entry.plainPassword, 10);
  }
}

export function buildMarkdown(seedUsers) {
  const padTable = (headers, rows) => {
    const widths = headers.map((h, idx) =>
      Math.max(h.length, ...rows.map((r) => String(r[idx] ?? "").length))
    );

    const formatRow = (cols) =>
      `| ${cols
        .map((c, i) => String(c ?? "").padEnd(widths[i], " "))
        .join(" | ")} |`;

    const header = formatRow(headers);
    const separator = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
    const body = rows.map((r) => formatRow(r));

    return [header, separator, ...body, ""].join("\n");
  };

  const lines = [
    "# Credenciales de Seed - Proyecto Diplomatura",
    `Fecha: ${new Date().toISOString()}`,
    "",
    "> Usa la columna **usuario** (email) y **contrasena** para iniciar sesion.",
    "",
  ];

  const generalEntries = seedUsers
    .filter((entry) => entry.source === "base")
    .sort((a, b) => a.tableRow.usuario.localeCompare(b.tableRow.usuario));

  if (generalEntries.length) {
    lines.push("## Credenciales generales", "");
    const headers = ["rol", "nombre", "usuario", "contrasena", "modulo", "cohorte", "estado"];
    const rows = generalEntries.map((entry) => {
      const r = entry.tableRow;
      return [r.rol, r.nombre, r.usuario, r.contrasenia, r.modulo, r.cohorte ?? r.cohort ?? "-", r.estado];
    });
    lines.push(padTable(headers, rows));
  }

  for (const mod of MODULES) {
    const moduleEntries = seedUsers
      .filter(
        (entry) =>
          entry.source === "module" &&
          (entry.document.moduloSlug === mod.slug || entry.document.modulo === mod.name)
      )
      .sort((a, b) => {
        const aRole = a.document.rol === "profesor" ? 0 : 1;
        const bRole = b.document.rol === "profesor" ? 0 : 1;
        if (aRole !== bRole) {
          return aRole - bRole;
        }
        return a.tableRow.nombre.localeCompare(b.tableRow.nombre);
      });

    if (!moduleEntries.length) {
      continue;
    }

    lines.push(`## Modulo ${mod.name}`, "");
    const headers = ["modulo", "rol", "nombre", "usuario", "contrasena", "cohorte", "estado"];
    const rows = moduleEntries.map((entry) => {
      const r = entry.tableRow;
      return [r.modulo, r.rol, r.nombre, r.usuario, r.contrasenia, r.cohorte ?? "-", r.estado];
    });
    lines.push(padTable(headers, rows));
  }

  return `${lines.join("\n")}\n`;
}

export async function writeSeedFile(seedUsers, filename = "SEED_USERS.md") {
  const md = buildMarkdown(seedUsers);
  // Siempre guardar en /logs/docs/
  const outPath = path.join(projectRoot, "logs", "docs", filename);
  await fs.outputFile(outPath, md, { encoding: "utf8" });
  console.log(`✅ Archivo de credenciales generado: ${path.relative(projectRoot, outPath)}`);
}
