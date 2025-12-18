import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import {
  getApp,
  ensureDatabaseInitialized,
  createBaseUsers,
  crearAsignacion,
  crearTurno,
  reservarTurno,
} from "./helpers/testUtils.mjs";
import { moduleNumberToLabel } from "./helpers/testUtils.mjs";

let app;
let ctx;

async function setupData() {
  const asignacionM1 = await crearAsignacion(ctx.profesorOwner.token);
  const asignacionM2 = await crearAsignacion(ctx.profesorAjeno.token);

  const turnoLibreM1 = await crearTurno(ctx.profesorOwner.token, asignacionM1.res.body._id);
  const turnoReservadoM1 = await crearTurno(ctx.profesorOwner.token, asignacionM1.res.body._id);
  await reservarTurno(ctx.alumnoC1.token, turnoReservadoM1.res.body._id || turnoReservadoM1.res.body.id);

  const turnoLibreM2 = await crearTurno(ctx.profesorAjeno.token, asignacionM2.res.body._id);
  const turnoReservadoM2 = await crearTurno(ctx.profesorAjeno.token, asignacionM2.res.body._id);
  await reservarTurno(ctx.alumnoC2.token, turnoReservadoM2.res.body._id || turnoReservadoM2.res.body.id);

  return {
    asignacionM1: asignacionM1.res.body,
    asignacionM2: asignacionM2.res.body,
    turnoLibreM1: turnoLibreM1.res.body,
    turnoReservadoM1: turnoReservadoM1.res.body,
    turnoLibreM2: turnoLibreM2.res.body,
    turnoReservadoM2: turnoReservadoM2.res.body,
  };
}

describe.sequential("Cohort Isolation", () => {
  let data;

  beforeAll(async () => {
    app = await getApp();
    await ensureDatabaseInitialized();
    ctx = await createBaseUsers();
    data = await setupData();
  });

  test("P1 Profesor_M1 GET /slots solo cohorte M1", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${ctx.profesorOwner.token}`);
    expect(res.status).toBe(200);
    res.body.forEach((slot) => {
      expect(String(slot.cohorte)).toBe("1");
    });
  });

  test("P2 Profesor_M1 GET /assignments solo cohorte M1", async () => {
    const res = await request(app).get("/assignments").set("Authorization", `Bearer ${ctx.profesorOwner.token}`);
    expect(res.status).toBe(200);
    res.body.forEach((a) => {
      expect(String(a.cohorte)).toBe("1");
      expect(a.modulo).toBe(moduleNumberToLabel(1));
    });
  });

  test("P3 Profesor_M2 GET /usuarios solo alumnos M2", async () => {
    const res = await request(app).get("/usuarios").set("Authorization", `Bearer ${ctx.profesorAjeno.token}`);
    expect(res.status).toBe(200);
    res.body.forEach((u) => {
      expect(u.rol).toBe("alumno");
      expect(String(u.cohorte)).toBe("2");
      expect(u.modulo).toBe(moduleNumberToLabel(2));
    });
  });

  test("P4 Alumno_M1 GET /submissions solo propias de cohorte 1", async () => {
    const res = await request(app).get("/submissions").set("Authorization", `Bearer ${ctx.alumnoC1.token}`);
    expect(res.status).toBe(200);
    res.body.forEach((sub) => {
      expect(String(sub.student)).toBe(String(ctx.alumnoC1.id));
      expect(String(sub.cohorte)).toBe("1");
    });
  });

  test("P5 Alumno_M2 GET /slots cohorte 2 disponibles o propios", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${ctx.alumnoC2.token}`);
    expect(res.status).toBe(200);
    res.body.forEach((slot) => {
      expect(String(slot.cohorte)).toBe("2");
      const isAvailable = slot.solicitanteId === null || slot.solicitanteId === undefined;
      const isOwn = String(slot.solicitanteId) === String(ctx.alumnoC2.id);
      expect(isAvailable || isOwn).toBe(true);
    });
  });

  test("P6 Superadmin GET /slots ve ambos modulos", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${ctx.superadmin.token}`);
    expect(res.status).toBe(200);
    const cohorts = new Set(res.body.map((s) => String(s.cohorte)));
    expect(cohorts.has("1")).toBe(true);
    expect(cohorts.has("2")).toBe(true);
  });

  test("P7 Profesor_M1 GET /submissions ve todas cohorte 1", async () => {
    const res = await request(app).get("/submissions").set("Authorization", `Bearer ${ctx.profesorOwner.token}`);
    expect(res.status).toBe(200);
    res.body.forEach((sub) => {
      expect(String(sub.cohorte)).toBe("1");
    });
  });

  test("C1 Profesor_M1 POST /slots fuerza cohorte 1", async () => {
    const payload = {
      cohorte: 2,
      fecha: new Date(Date.now() + 3600000).toISOString(),
    };
    const res = await request(app)
      .post("/slots")
      .set("Authorization", `Bearer ${ctx.profesorOwner.token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(String(res.body.cohorte)).toBe("1");
    expect(res.body.modulo).toBe(moduleNumberToLabel(1));
  });

  test("C2 Profesor_M2 POST /assignments fuerza cohorte 2", async () => {
    const res = await request(app)
      .post("/assignments")
      .set("Authorization", `Bearer ${ctx.profesorAjeno.token}`)
      .send({
        title: "Forzado",
        description: "Debe forzar modulo",
        dueDate: "2026-06-01",
        modulo: moduleNumberToLabel(1),
      });
    expect(res.status).toBe(201);
    expect(String(res.body.cohorte)).toBe("2");
    expect(res.body.modulo).toBe(moduleNumberToLabel(2));
  });

  test("C3 Alumno_M1 POST /slots no autorizado", async () => {
    const res = await request(app)
      .post("/slots")
      .set("Authorization", `Bearer ${ctx.alumnoC1.token}`)
      .send({ fecha: new Date(Date.now() + 7200000).toISOString() });
    expect(res.status).toBe(403);
  });
});
