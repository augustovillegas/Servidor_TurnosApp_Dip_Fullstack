import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import {
  disconnectTestDB,
  ensureDatabaseInitialized,
  createBaseUsers,
  crearAsignacion,
  uniqueValue,
  getApp,
  moduleNumberToLabel,
} from "./helpers/testUtils.mjs";

describe.sequential("Assignments", () => {
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

  test("Alumno no puede crear una asignacion", async () => {
    const res = await request(app)
      .post("/assignments")
      .set("Authorization", `Bearer ${context.alumnoC1.token}`)
      .send({
        title: "Intento invalido",
        description: "Esto no deberia crear",
        dueDate: "2026-02-10",
        modulo: moduleNumberToLabel(1),
        cohorte: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Acceso denegado");
  });

  test("Asignacion con dueDate invalido devuelve 422", async () => {
    const res = await request(app)
      .post("/assignments")
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({
        title: "Fecha invalida",
        description: "Debe fallar",
        dueDate: "31-12-2026",
        modulo: moduleNumberToLabel(1),
        cohorte: 1,
      });

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.errores)).toBe(true);
    expect(res.body.errores.length).toBeGreaterThan(0);
    const mensajes = res.body.errores.map((err) => (err.mensaje || "").toLowerCase());
    expect(mensajes.some((msg) => msg.includes("fecha") || msg.includes("due") || msg.includes("formato"))).toBe(true);
  });

  test("Asignacion valida conserva ownership del profesor creador", async () => {
    const { res } = await crearAsignacion(context.profesorOwner.token);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
      modulo: expect.any(String),
      createdBy: expect.any(String),
    });
    expect(String(res.body.createdBy)).toBe(String(context.profesorOwner.id));
  });

  test("Profesor ajeno no puede actualizar asignacion de otro profesor", async () => {
    const { res: creada } = await crearAsignacion(context.profesorOwner.token);
    const assignmentId = creada.body._id || creada.body.id;

    const update = await request(app)
      .put(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${context.profesorAjeno.token}`)
      .send({
        title: "Actualizacion no permitida",
        description: "Intento de otro profesor",
        dueDate: "2026-03-01",
        modulo: moduleNumberToLabel(2),
      });

    expect(update.status).toBe(403);
    expect(update.body.message).toContain("No autorizado");
  });

  test("Superadmin puede actualizar asignacion ajena", async () => {
    const { res: creada } = await crearAsignacion(context.profesorOwner.token);
    const assignmentId = creada.body._id || creada.body.id;

    const update = await request(app)
      .put(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${context.superadmin.token}`)
      .send({
        title: "Actualizada por superadmin",
        description: "Descripcion nueva",
        dueDate: "2026-04-01",
        modulo: moduleNumberToLabel(3),
      });

    expect(update.status).toBe(200);
    expect(update.body.title).toBe("Actualizada por superadmin");
    expect(update.body.description).toBe("Descripcion nueva");
  });

  test("Profesor ajeno no puede eliminar asignacion y la misma sigue disponible", async () => {
    const { res: creada } = await crearAsignacion(context.profesorOwner.token);
    const assignmentId = creada.body._id || creada.body.id;

    const eliminacion = await request(app)
      .delete(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${context.profesorAjeno.token}`);

    expect(eliminacion.status).toBe(403);
    expect(eliminacion.body.message).toContain("No autorizado");

    const consulta = await request(app)
      .get(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(consulta.status).toBe(200);
    expect(consulta.body._id || consulta.body.id).toBe(assignmentId);
  });

  test("Superadmin puede eliminar asignacion de terceros", async () => {
    const { res: creada } = await crearAsignacion(context.profesorOwner.token);
    const assignmentId = creada.body._id || creada.body.id;

    const eliminacion = await request(app)
      .delete(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(eliminacion.status).toBe(204);

    const consulta = await request(app)
      .get(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(consulta.status).toBe(404);
  });

  test("Listado para profesor devuelve todas las asignaciones de su modulo", async () => {
    await crearAsignacion(context.profesorOwner.token, { title: "Asignacion A" });
    await crearAsignacion(context.profesorOwner.token, { title: "Asignacion B" });
    await crearAsignacion(context.profesorAjeno.token, { title: "Asignacion ajena" });

    const listadoOwner = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${context.profesorOwner.token}`);

    expect(listadoOwner.status).toBe(200);
    expect(Array.isArray(listadoOwner.body)).toBe(true);

    expect(listadoOwner.body.length).toBeGreaterThan(0);
    listadoOwner.body.forEach((item) => {
      expect(String(item.cohorte)).toBe("1");
    });

    const tieneAjenas = listadoOwner.body.some((item) => String(item.cohorte) !== "1");
    expect(tieneAjenas).toBe(false);
  });

  test("Campos extra se ignoran al crear una asignacion", async () => {
    const nombreExtra = uniqueValue("campo-extra");
    const res = await request(app)
      .post("/assignments")
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({
        title: "Con campo extra",
        description: "Debe ignorarse el campo",
        dueDate: "2026-05-01",
        modulo: moduleNumberToLabel(1),
        cohorte: 1,
        campoExtra: nombreExtra,
      });

    expect(res.status).toBe(201);
    expect(res.body.campoExtra).toBeUndefined();
  });
});
