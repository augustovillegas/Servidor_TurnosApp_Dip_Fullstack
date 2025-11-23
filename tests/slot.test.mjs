import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSlotDtoShape } from './helpers/testUtils.mjs';
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

  test("Alumno de otro módulo no puede reservar un turno", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body._id;

    const reserva = await reservarTurno(context.alumnoC2.token, slotId);

    expect(reserva.status).toBe(403);
    expect(reserva.body.message).toContain("Modulo no coincide");
  });

  test("Alumno sin aprobacion no puede solicitar turno", async () => {
    const sinAprobar = await registerAndLogin({
      prefix: "alumno-no-aprobado",
      moduleNumber: 1,
    });

    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id, { moduleNumber: 1 });
    const slotId = turnoRes.res.body._id;

    const reserva = await reservarTurno(sinAprobar.token, slotId);

    expect(reserva.status).toBe(403);
    expect(reserva.body.message).toContain("Tu cuenta debe ser aprobada");
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
    expect(aprobado.body.reviewStatus).toBe("Aprobado");
    assertSlotDtoShape(aprobado.body, expect);

    const pendiente = await request(app)
      .patch(`/slots/${slotId}/estado`)
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({ estado: "pendiente" });

    expect(pendiente.status).toBe(200);
    expect(pendiente.body.reviewStatus).toBe("A revisar");
    assertSlotDtoShape(pendiente.body, expect);
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
    expect(intento.body.message).toContain("Acceso denegado");
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
    expect(cambio.body.message).toContain("validacion");
  });

  test("Alumno no puede reservar dos veces el mismo turno", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id, { moduleNumber: 1 });
    const slotId = turnoRes.res.body._id;

    const primera = await reservarTurno(context.alumnoC1.token, slotId);
    expect(primera.status).toBe(200);
    assertSlotDtoShape(primera.body, expect);

    const segunda = await reservarTurno(context.alumnoC1.token, slotId);
    expect(segunda.status).toBe(403);
    expect(segunda.body.message).toContain("Turno ya reservado");
  });
});

