import mongoose from "mongoose";
import request from "supertest";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { limpiarDB } from "../../scripts/limpiarDB.mjs";
import { crearSuperadmin } from "../../scripts/crearSuperadmin.mjs";

dotenv.config();

const workerIdRaw = process.env.VITEST_WORKER_ID || "main";
const sanitizedWorkerId = workerIdRaw.replace(/[^a-zA-Z0-9_-]/g, "_");

function buildWorkerMongoUri(uri, workerId) {
  if (!uri) return uri;
  const [base, query] = uri.split("?");
  const slashIndex = base.lastIndexOf("/");
  if (slashIndex === -1) return uri;
  const prefix = base.slice(0, slashIndex);
  const dbName = base.slice(slashIndex + 1) || "test";
  const workerDb = `${dbName}_worker_${workerId}`;
  return `${prefix}/${workerDb}${query ? `?${query}` : ""}`;
}

const TEST_DB_URI = buildWorkerMongoUri(process.env.MONGO_URL, sanitizedWorkerId);
if (TEST_DB_URI) {
  process.env.MONGO_URL = TEST_DB_URI;
}

const appPromise = import("../../server.mjs").then((mod) => mod.default);

export async function getApp() {
  return appPromise;
}

let initPromise = null;

export async function ensureDatabaseInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectTestDB();
      await limpiarDB();
    })();
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
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

export async function resetDatabase() {
  await limpiarDB();
}

export async function ensureSuperadmin() {
  try {
    await crearSuperadmin();
  } catch (err) {
    const message = err?.message ?? "";
    if (!message.includes("duplicate key")) {
      throw err;
    }
  }

  const app = await getApp();
  const loginRes = await request(app)
    .post("/auth/login")
    .send({ email: "admin@app.com", password: "admin123" });

  if (loginRes.status !== 200) {
    throw new Error(
      `No se pudo iniciar sesión del superadmin: ${loginRes.status} ${JSON.stringify(loginRes.body)}`
    );
  }

  return {
    token: loginRes.body.token,
    id: loginRes.body.user._id,
    user: loginRes.body.user,
  };
}

export async function registerAndLogin({ prefix, role = "alumno", cohort = 1, approvedByToken }) {
  const app = await getApp();
  const email = `${prefix}-${uniqueValue("user")}@test.com`;
  const registerRes = await request(app).post("/auth/register").send({
    name: `${prefix} Test`,
    email,
    password,
    role,
    cohort,
  });

  if (registerRes.status !== 201) {
    throw new Error(
      `Fallo registro de ${prefix} (${email}): ${registerRes.status} ${JSON.stringify(registerRes.body)}`
    );
  }

  const userId = registerRes.body.user._id;

  if (approvedByToken) {
    const approveRes = await request(app)
      .patch(`/auth/aprobar/${userId}`)
      .set("Authorization", `Bearer ${approvedByToken}`);

    if (approveRes.status !== 200) {
      throw new Error(
        `Fallo aprobacion de ${prefix}: ${approveRes.status} ${JSON.stringify(approveRes.body)}`
      );
    }
  }

  const loginRes = await request(app).post("/auth/login").send({ email, password });

  if (loginRes.status !== 200) {
    throw new Error(
      `Fallo login de ${prefix}: ${loginRes.status} ${JSON.stringify(loginRes.body)}`
    );
  }

  return { id: loginRes.body.user._id, token: loginRes.body.token, email };
}

export async function crearAsignacion(token, overrides = {}) {
  const app = await getApp();
  const payload = {
    title: overrides.title || `TP ${uniqueValue("assignment")}`,
    description: overrides.description || "Descripcion de prueba",
    dueDate: overrides.dueDate || "2026-01-15",
    module: overrides.module ?? 1,
    cohort: overrides.cohort ?? 1,
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
    cohort: overrides.cohort ?? 1,
    date: overrides.date || new Date(Date.now() + 86400000).toISOString(),
  };

  const res = await request(app)
    .post("/slots")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

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
  cohort = 1,
  githubLink,
}) {
  const { res: asignacionRes } = await crearAsignacion(tokenProfesor, { cohort });
  const assignmentId = asignacionRes.body._id;

  const turnoRes = await crearTurno(tokenProfesor, assignmentId, { cohort });
  const slotId = turnoRes.res.body._id;

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
    submissionId: entrega.body._id,
  };
}

export async function createBaseUsers() {
  const superadmin = await ensureSuperadmin();

  const profesorOwner = await registerAndLogin({
    prefix: "prof-owner",
    role: "profesor",
    cohort: 1,
    approvedByToken: superadmin.token,
  });

  const profesorAjeno = await registerAndLogin({
    prefix: "prof-ajeno",
    role: "profesor",
    cohort: 2,
    approvedByToken: superadmin.token,
  });

  const alumnoC1 = await registerAndLogin({
    prefix: "alumno-c1",
    role: "alumno",
    cohort: 1,
    approvedByToken: profesorOwner.token,
  });

  const alumnoC2 = await registerAndLogin({
    prefix: "alumno-c2",
    role: "alumno",
    cohort: 2,
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




