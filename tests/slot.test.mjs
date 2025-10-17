import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import {
  disconnectTestDB,
  ensureDatabaseInitialized,
  createBaseUsers,
  crearAsignacion,
  crearTurno,
  reservarTurno,
  registerAndLogin,
  getApp,
} from "./helpers/testUtils.mjs";

describe.sequential("Slots", () => {
  let app;
  let context;

  beforeAll(async () => {
    app = await getApp();
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    context = await createBaseUsers();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  test("Alumno de otra cohorte no puede reservar un turno", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body._id;

    const reserva = await reservarTurno(context.alumnoC2.token, slotId);

    expect(reserva.status).toBe(403);
    expect(reserva.body.msg).toContain("Cohorte no coincide");
  });

  test("Alumno sin aprobacion no puede solicitar turno", async () => {
    const sinAprobar = await registerAndLogin({
      prefix: "alumno-no-aprobado",
      cohort: 1,
    });

    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id, { cohort: 1 });
    const slotId = turnoRes.res.body._id;

    const reserva = await reservarTurno(sinAprobar.token, slotId);

    expect(reserva.status).toBe(403);
    expect(reserva.body.msg).toContain("Tu cuenta debe ser aprobada");
  });

  test("Profesor actualiza estado del turno entre aprobado y pendiente", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body._id;

    const aprobado = await request(app)
      .patch(`/slots/${slotId}/estado`)
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({ estado: "aprobado" });

    expect(aprobado.status).toBe(200);
    expect(aprobado.body.reviewStatus).toBe("aprobado");

    const pendiente = await request(app)
      .patch(`/slots/${slotId}/estado`)
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({ estado: "pendiente" });

    expect(pendiente.status).toBe(200);
    expect(pendiente.body.reviewStatus).toBe("revisar");
  });

  test("Alumno no autorizado no puede cambiar estado de turno", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body._id;

    const intento = await request(app)
      .patch(`/slots/${slotId}/estado`)
      .set("Authorization", `Bearer ${context.alumnoC1.token}`)
      .send({ estado: "aprobado" });

    expect(intento.status).toBe(403);
    expect(intento.body.msg).toContain("Acceso denegado");
  });

  test("Estado invalido al actualizar turno responde 400", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body._id;

    const cambio = await request(app)
      .patch(`/slots/${slotId}/estado`)
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({ estado: "desconocido" });

    expect(cambio.status).toBe(400);
    expect(cambio.body.msg).toContain("Estado");
  });

  test("Alumno no puede reservar dos veces el mismo turno", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id, { cohort: 1 });
    const slotId = turnoRes.res.body._id;

    const primera = await reservarTurno(context.alumnoC1.token, slotId);
    expect(primera.status).toBe(200);

    const segunda = await reservarTurno(context.alumnoC1.token, slotId);
    expect(segunda.status).toBe(403);
    expect(segunda.body.msg).toContain("Turno ya reservado");
  });
});

