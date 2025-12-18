import mongoose from "mongoose";
import request from "supertest";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { limpiarDB } from "../../scripts/limpiarDB.mjs";
import { crearSuperadmin } from "../../scripts/crearSuperadmin.mjs";
import { crearUsuariosRoles } from "../../scripts/crearUsuariosRoles.mjs";

dotenv.config();

const TEST_DB_URI = process.env.MONGO_URL;
const MODULE_LABELS = {
  1: "HTML-CSS",
  2: "JAVASCRIPT",
  3: "BACKEND - NODE JS",
  4: "FRONTEND - REACT",
};

const moduleNumberToLabel = (value) => MODULE_LABELS[value] || MODULE_LABELS[1];

const appPromise = import("../../server.mjs").then((mod) => mod.default);

export async function getApp() {
  return appPromise;
}

let initPromise = null;

export async function ensureDatabaseInitialized() {
  if (!initPromise) {
    initPromise = connectTestDB();
  }
  await initPromise;
}
export const password = "Passw0rd!";

export const uniqueValue = (() => {
  let counter = 0;
  return (prefix) => {
    const time = Date.now().toString(36);
    const random = randomUUID().replace(/-/g, "").slice(0, 6);
    return `${prefix}-${time}-${counter++}-${random}`;
  };
})();

export async function connectTestDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB_URI);
  }
  await dropLegacyIndexes();
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

export async function resetDatabase() {
  await limpiarDB();
}

/**
 * Limpia todas las colecciones de la base de datos.
 * Resuelve problemas de contaminación entre tests.
 */
export async function cleanDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

async function dropLegacyIndexes() {
  const collection = mongoose.connection.collections.reviewslots;
  if (!collection) return;
  try {
    await collection.dropIndex("unique_cohorte_fecha_sala_index");
  } catch (err) {
    if (err.codeName !== "IndexNotFound") {
    }
  }
}

const seedEntryToCredential = (entry) => ({
  email: entry.document.email,
  password: entry.plainPassword,
  rol: entry.document.rol,
  modulo: entry.document.modulo,
  source: entry.source,
});

export async function ensureSuperadmin() {
  let baseSeedUsers;
  try {
    baseSeedUsers = await crearSuperadmin();
  } catch (err) {
    const message = err?.message ?? "";
    if (!message.includes("duplicate key")) {
      throw err;
    }
    baseSeedUsers = await crearSuperadmin({ persist: false });
  }

  const superadminSeed = baseSeedUsers.find((entry) => entry.document.rol === "superadmin");
  if (!superadminSeed) {
    throw new Error("Seed base no contiene un superadmin para login");
  }

  const credentials = seedEntryToCredential(superadminSeed);

  const app = await getApp();
  const loginRes = await request(app)
    .post("/auth/login")
    .send({ email: credentials.email, password: credentials.password });

  if (loginRes.status !== 200) {
    throw new Error(
      `No se pudo iniciar sesion del superadmin (${credentials.email}): ${loginRes.status} ${JSON.stringify(loginRes.body)}`
    );
  }

  return {
    token: loginRes.body.token,
    id: loginRes.body.user._id,
    user: loginRes.body.user,
    credentials,
  };
}

export async function registerAndLogin({
  prefix,
  rol = "alumno",
  moduleNumber = 1,
  approvedByToken,
}) {
  const app = await getApp();
  const resolvedRole = rol;
  const modulo = moduleNumberToLabel(moduleNumber);
  const email = `${prefix}-${uniqueValue("user")}@test.com`;
  const registerRes = await request(app).post("/auth/register").send({
    nombre: `${prefix} Test`,
    email,
    password,
    rol: resolvedRole,
    modulo,
    cohorte: moduleNumber,
  });

  if (registerRes.status !== 201) {
    throw new Error(
      `Fallo registro de ${prefix} (${email}): ${registerRes.status} ${JSON.stringify(registerRes.body)}`
    );
  }

  const userId = registerRes.body.user.id || registerRes.body.user._id;

  if (approvedByToken) {
    let approveRes;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      approveRes = await request(app)
        .patch(`/auth/aprobar/${userId}`)
        .set("Authorization", `Bearer ${approvedByToken}`);

      if (approveRes.status === 200) {
        break;
      }

      if (approveRes.status === 404 || approveRes.status === 401) {
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        break;
      }
    }

    if (approveRes.status !== 200) {
      throw new Error(
        `Fallo aprobacion de ${prefix} (${attempts} intentos): ${approveRes.status} ${JSON.stringify(approveRes.body)}`
      );
    }
  }

  const loginRes = await request(app).post("/auth/login").send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(
      `Fallo login de ${prefix} (${email}): ${loginRes.status} ${JSON.stringify(loginRes.body)}`
    );
  }

  return {
    token: loginRes.body.token,
    id: userId,
    user: loginRes.body.user,
    email: email.toLowerCase(),
    password,
  };
}

export async function crearAsignacion(token, overrides = {}) {
  const app = await getApp();
  const resolvedModule = overrides.moduleNumber ?? overrides.module ?? 1;
  const payload = {
    title: overrides.title || `TP ${uniqueValue("assignment")}`,
    description: overrides.description || "Descripcion de prueba",
    dueDate: overrides.dueDate || "2026-01-15",
    modulo: overrides.modulo || moduleNumberToLabel(resolvedModule),
  };

  const res = await request(app)
    .post("/assignments")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

  return { res, payload };
}

export async function crearTurno(token, assignmentId, overrides = {}) {
  const app = await getApp();
  const payload = {
    assignment: assignmentId,
    modulo: overrides.modulo || moduleNumberToLabel(overrides.moduleNumber ?? 1),
    fecha: overrides.fecha || overrides.date || new Date(Date.now() + 86400000).toISOString(),
    sala: overrides.sala ?? Math.floor(Math.random() * 100000) + 1,
  };

  const res = await request(app)
    .post("/slots")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

  if (res.body && res.body.id && !res.body._id) {
    res.body._id = res.body.id;
  }

  return { res, payload };
}

export async function reservarTurno(token, slotId) {
  const app = await getApp();
  return await request(app)
    .patch(`/slots/${slotId}/solicitar`)
    .set("Authorization", `Bearer ${token}`);
}

export async function cancelarTurno(token, slotId) {
  const app = await getApp();
  return await request(app)
    .patch(`/slots/${slotId}/cancelar`)
    .set("Authorization", `Bearer ${token}`);
}

export async function crearEntrega(token, slotId, overrides = {}) {
  const app = await getApp();
  const payload = {};
  if (overrides.githubLink) payload.githubLink = overrides.githubLink;
  if (overrides.link) payload.link = overrides.link;
  if (overrides.renderLink) payload.renderLink = overrides.renderLink;
  if (overrides.comentarios !== undefined) payload.comentarios = overrides.comentarios;

  return await request(app)
    .post(`/submissions/${slotId}`)
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
}

export async function crearSubmissionCompleta({
  tokenProfesor,
  tokenAlumno,
  moduleNumber = 1,
  githubLink,
}) {
  const { res: asignacionRes } = await crearAsignacion(tokenProfesor, { moduleNumber });
  const assignmentId = asignacionRes.body._id;

  const turnoRes = await crearTurno(tokenProfesor, assignmentId, { moduleNumber });
  const slotId = turnoRes.res.body.id || turnoRes.res.body._id;

  const reserva = await reservarTurno(tokenAlumno, slotId);
  if (reserva.status !== 200) {
    throw new Error(
      `Fallo al reservar turno: ${reserva.status} ${JSON.stringify(reserva.body)}`
    );
  }

  const entrega = await crearEntrega(tokenAlumno, slotId, {
    githubLink: githubLink || `https://github.com/${uniqueValue("repo")}`,
  });

  if (entrega.status !== 201) {
    throw new Error(
      `Fallo al crear entrega: ${entrega.status} ${JSON.stringify(entrega.body)}`
    );
  }

  return {
    assignmentId,
    slotId,
    submission: entrega.body,
    submissionId: entrega.body.id || entrega.body._id,
  };
}

export async function createBaseUsers() {
  const superadmin = await ensureSuperadmin();

  const profesorOwner = await registerAndLogin({
    prefix: "prof-owner",
    rol: "profesor",
    moduleNumber: 1,
    approvedByToken: superadmin.token,
  });

  const profesorAjeno = await registerAndLogin({
    prefix: "prof-ajeno",
    rol: "profesor",
    moduleNumber: 2,
    approvedByToken: superadmin.token,
  });

  const alumnoC1 = await registerAndLogin({
    prefix: "alumno-c1",
    rol: "alumno",
    moduleNumber: 1,
    approvedByToken: profesorOwner.token,
  });

  const alumnoC2 = await registerAndLogin({
    prefix: "alumno-c2",
    rol: "alumno",
    moduleNumber: 2,
    approvedByToken: profesorOwner.token,
  });

  return {
    superadmin,
    profesorOwner,
    profesorAjeno,
    alumnoC1,
    alumnoC2,
  };
}

export async function seedAllScriptUsers({ reset = true } = {}) {
  if (reset) {
    await resetDatabase();
  }

  const baseSeed = await crearSuperadmin();
  const moduleSeed = await crearUsuariosRoles();
  const combinedRaw = [...baseSeed, ...moduleSeed];
  const seen = new Set();
  const combined = [];
  for (const entry of combinedRaw) {
    const email = entry?.document?.email?.toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    combined.push(entry);
  }

  return {
    baseSeed,
    moduleSeed,
    credentials: combined.map(seedEntryToCredential),
  };
}

export function assertSlotDtoShape(slot, expectFn) {
  const requiredKeys = [
    "id",
    "reviewNumber",
    "fecha",
    "fechaISO",
    "horario",
    "sala",
    "zoomLink",
    "estado",
    "reviewStatus",
    "comentarios",
    "titulo",
    "descripcion",
    "modulo",
    "duracion",
    "cohorte",
  ];
  for (const key of requiredKeys) {
    expectFn(slot).toHaveProperty(key);
  }
}

export { moduleNumberToLabel };
