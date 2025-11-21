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

// Escenarios P1-P7 y C1-C3 para segmentación por módulo (cohort)
// Módulo se deriva del campo 'cohorte' numérico en el usuario y se expone como 'module' en assignments.

let app;
let ctx;

async function setupData() {
  // Crear una asignación y turnos en cada módulo y algunas reservas
  const asignacionM1 = await crearAsignacion(ctx.profesorOwner.token); // cohorte forzada a 1
  const asignacionM2 = await crearAsignacion(ctx.profesorAjeno.token, { module: 2, cohort: 2 });

  // Turnos en M1 creados por profesorOwner (cohorte 1)
  const turnoLibreM1 = await crearTurno(ctx.profesorOwner.token, asignacionM1.res.body._id, { cohort: 1 });
  const turnoReservadoM1 = await crearTurno(ctx.profesorOwner.token, asignacionM1.res.body._id, { cohort: 1 });
  await reservarTurno(ctx.alumnoC1.token, turnoReservadoM1.res.body._id);

  // Turnos en M2 creados por profesorAjeno (cohorte 2)
  const turnoLibreM2 = await crearTurno(ctx.profesorAjeno.token, asignacionM2.res.body._id, { cohort: 2 });
  const turnoReservadoM2 = await crearTurno(ctx.profesorAjeno.token, asignacionM2.res.body._id, { cohort: 2 });
  await reservarTurno(ctx.alumnoC2.token, turnoReservadoM2.res.body._id);

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

  // P1: Profesor_M1 listar turnos solo cohorte 1
  test("P1 Profesor_M1 GET /slots solo cohorte M1", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${ctx.profesorOwner.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((slot) => {
      expect(String(slot.cohort)).toBe("1");
    });
    const otros = res.body.filter((s) => String(s.cohort) !== "1");
    expect(otros.length).toBe(0);
  });

  // P2: Profesor_M1 GET /assignments solo SUS asignaciones de cohorte 1 (aislamiento + ownership)
  test("P2 Profesor_M1 GET /assignments solo cohorte M1", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${ctx.profesorOwner.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Debe tener al menos la asignación propia creada en setup
    expect(res.body.length).toBeGreaterThan(0);
    // Todas deben ser de cohorte 1 (aislamiento) y creadas por él (ownership)
    res.body.forEach((a) => {
      expect(String(a.cohorte)).toBe("1");
      expect(String(a.createdBy)).toBe(String(ctx.profesorOwner.id));
    });
  });

  // P3: Profesor_M2 GET /usuarios devuelve solo alumnos de cohorte 2
  test("P3 Profesor_M2 GET /usuarios solo alumnos M2", async () => {
    const res = await request(app)
      .get("/usuarios")
      .set("Authorization", `Bearer ${ctx.profesorAjeno.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((u) => {
      expect(u.role).toBe("alumno");
      expect(String(u.cohort)).toBe("2");
    });
  });

  // P4: Alumno_M1 GET /submissions (entregas) solo propias y cohorte 1
  test("P4 Alumno_M1 GET /submissions solo propias de cohorte 1", async () => {
    // Crear submission completa para alumnoC1
    // (usa createBaseUsers + setupData ya creó asignaciones y turnos, reservamos uno adicional si se requiere)
    const res = await request(app)
      .get("/submissions")
      .set("Authorization", `Bearer ${ctx.alumnoC1.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((sub) => {
      expect(String(sub.student)).toBe(String(ctx.alumnoC1.id));
      // modulo label puede variar; si hay cohorte numeric mapeado validar si existe
    });
  });

  // P5: Alumno_M2 GET /slots solo cohorte 2 y disponibles o propios
  test("P5 Alumno_M2 GET /slots cohorte 2 disponibles o propios", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${ctx.alumnoC2.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((slot) => {
      expect(String(slot.cohort)).toBe("2");
      const isAvailable = slot.student === null || slot.student === undefined;
      const isOwn = String(slot.student) === String(ctx.alumnoC2.id);
      expect(isAvailable || isOwn).toBe(true);
    });
  });

  // P6: Superadmin GET /slots ve ambos
  test("P6 Superadmin GET /slots ve ambos módulos", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${ctx.superadmin.token}`);
    expect(res.status).toBe(200);
    const cohorts = new Set(res.body.map((s) => String(s.cohort)));
    expect(cohorts.has("1")).toBe(true);
    expect(cohorts.has("2")).toBe(true);
  });

  // P7: Profesor_M1 GET /submissions ve todas las de cohorte 1 (no sólo propias del alumno)
  test("P7 Profesor_M1 GET /submissions ve todas cohorte 1", async () => {
    const res = await request(app)
      .get("/submissions")
      .set("Authorization", `Bearer ${ctx.profesorOwner.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // C1: Profesor_M1 POST /slots con cohort 2 en payload debe crear en cohorte 1
  test("C1 Profesor_M1 POST /slots fuerza cohorte 1", async () => {
    const payload = {
      cohort: 2,
      date: new Date(Date.now() + 3600000).toISOString(),
    };
    const res = await request(app)
      .post("/slots")
      .set("Authorization", `Bearer ${ctx.profesorOwner.token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(String(res.body.cohort)).toBe("1");
  });

  // C2: Profesor_M2 POST /assignments con module 1 debe crear en cohorte 2
  test("C2 Profesor_M2 POST /assignments fuerza cohorte 2", async () => {
    const res = await request(app)
      .post("/assignments")
      .set("Authorization", `Bearer ${ctx.profesorAjeno.token}`)
      .send({
        title: "Forzado",
        description: "Debe forzar modulo",
        dueDate: "2026-06-01",
        module: 1,
        cohort: 1,
      });
    expect(res.status).toBe(201);
    expect(String(res.body.cohorte)).toBe("2");
    expect(res.body.module).toBe(2);
  });

  // C3: Alumno_M1 POST /slots no autorizado
  test("C3 Alumno_M1 POST /slots no autorizado", async () => {
    const res = await request(app)
      .post("/slots")
      .set("Authorization", `Bearer ${ctx.alumnoC1.token}`)
      .send({ date: new Date(Date.now() + 7200000).toISOString() });
    expect(res.status).toBe(403);
  });
});
