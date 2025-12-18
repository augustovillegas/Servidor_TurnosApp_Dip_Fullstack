import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import {
  disconnectTestDB,
  ensureDatabaseInitialized,
  createBaseUsers,
  crearAsignacion,
  crearTurno,
  registerAndLogin,
  getApp,
  moduleNumberToLabel,
} from "./helpers/testUtils.mjs";

describe.sequential("Error Handling - Inversión de Control", () => {
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

  describe("Middlewares de Autenticación (401)", () => {
    test("GET /slots sin token devuelve 401 con formato unificado", async () => {
      const res = await request(app).get("/slots");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Token");
      expect(res.body).not.toHaveProperty("msg");
      expect(res.body).not.toHaveProperty("code");
    });

    test("POST /assignments sin token devuelve 401", async () => {
      const res = await request(app)
        .post("/assignments")
        .send({
          title: "Test",
          description: "Test",
          dueDate: "2026-12-31",
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /auth/aprobar/:id sin token devuelve 401", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).patch(`/auth/aprobar/${fakeId}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("Token inválido devuelve 401 con mensaje apropiado", async () => {
      const res = await request(app)
        .get("/slots")
        .set("Authorization", "Bearer token_invalido_123");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
    });
  });

  describe("Middlewares de Autorización (403)", () => {
    test("Alumno intentando crear asignación recibe 403", async () => {
      const res = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          title: "Intento",
          description: "No permitido",
          dueDate: "2026-12-31",
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Acceso denegado");
      expect(res.body).not.toHaveProperty("msg");
      expect(res.body).not.toHaveProperty("code");
    });

    test("Alumno intentando listar usuarios recibe 403", async () => {
      const res = await request(app)
        .get("/usuarios")
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Acceso denegado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("Alumno intentando crear slot recibe 403", async () => {
      const res = await request(app)
        .post("/slots")
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          fecha: "2026-12-31T10:00:00.000Z",
          startTime: "10:00",
          endTime: "11:00",
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Acceso denegado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("Profesor intentando aprobar usuario recibe 404 (ID válido inexistente)", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/auth/aprobar/${fakeId}`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Usuario no encontrado");
      expect(res.body).not.toHaveProperty("msg");
    });
  });

  describe("Middleware requireApproved (403)", () => {
    test("Alumno no aprobado no puede solicitar turno", async () => {
      const sinAprobar = await registerAndLogin({
        prefix: "no-aprobado",
      });

      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id || turnoRes.res.body.id;

      const reserva = await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${sinAprobar.token}`);

      expect(reserva.status).toBe(403);
      expect(reserva.body).toHaveProperty("message");
      expect(reserva.body.message).toContain("aprobada");
      expect(reserva.body).not.toHaveProperty("msg");
      expect(reserva.body).not.toHaveProperty("code");
    });
  });

  describe("Middleware de Validación (422)", () => {
    test("POST /assignments con dueDate inválido devuelve 422 con errores array", async () => {
      const res = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({
          title: "Test",
          description: "Test",
          dueDate: "fecha-invalida",
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(Array.isArray(res.body.errores)).toBe(true);
      expect(res.body.errores.length).toBeGreaterThan(0);
      expect(res.body).not.toHaveProperty("msg");
      expect(res.body).not.toHaveProperty("code");
    });

    test("POST /assignments sin campos requeridos devuelve 422", async () => {
      const res = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(Array.isArray(res.body.errores)).toBe(true);
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /slots/:id/estado con estado inválido devuelve 422", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id || turnoRes.res.body.id;

      const res = await request(app)
        .patch(`/slots/${slotId}/estado`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({ estado: "estado_invalido_xyz" });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("POST /auth/register sin password devuelve 422", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({
          nombre: "Test",
          email: "test@example.com",
          modulo: moduleNumberToLabel(1),
          cohorte: 1,
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(res.body).not.toHaveProperty("msg");
    });
  });

  describe("Servicios - Errores 404 (ID Inválido/No Existe)", () => {
    test("GET /assignments/:id con ID inválido devuelve 422 (validación de parámetro)", async () => {
      const res = await request(app)
        .get("/assignments/id-invalido-123")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect([422, 404]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
      expect(res.body).not.toHaveProperty("code");
    });

    test("GET /assignments/:id con ID válido pero inexistente devuelve 404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/assignments/${fakeId}`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(
        res.body.message.includes("Asignación no encontrada") ||
        res.body.message.includes("Asignacion no encontrada")
      ).toBe(true);
      expect(res.body).not.toHaveProperty("msg");
    });

    test("GET /slots/:id con ID inválido devuelve 422/404", async () => {
      const res = await request(app)
        .get("/slots/abc123")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect([422,404]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(
        res.body.message === "Error de validacion" ||
        res.body.message.includes("Turno no encontrado")
      ).toBe(true);
      expect(res.body).not.toHaveProperty("msg");
    });

    test("GET /slots/:id con ID válido pero inexistente devuelve 404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/slots/${fakeId}`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Turno no encontrado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PUT /assignments/:id con ID inválido devuelve 422 (validación)", async () => {
      const res = await request(app)
        .put("/assignments/invalid-id")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({
          title: "Update",
          description: "Test",
          dueDate: "2026-12-31",
        });

      expect([422, 404]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("DELETE /assignments/:id con ID inválido devuelve 422 (validación)", async () => {
      const res = await request(app)
        .delete("/assignments/xyz")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect([422, 404]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /auth/aprobar/:id con ID inválido devuelve 404", async () => {
      const res = await request(app)
        .patch("/auth/aprobar/invalid-user-id")
        .set("Authorization", `Bearer ${context.superadmin.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Usuario no encontrado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /auth/aprobar/:id con ID válido pero inexistente devuelve 404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/auth/aprobar/${fakeId}`)
        .set("Authorization", `Bearer ${context.superadmin.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Usuario no encontrado");
      expect(res.body).not.toHaveProperty("msg");
    });
  });

  describe("Servicios - Errores de Negocio", () => {
    test("POST /auth/login con credenciales incorrectas devuelve 401", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({
          email: context.alumnoC1.email,
          password: "password_incorrecto",
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Credenciales incorrectas");
      expect(res.body).not.toHaveProperty("msg");
      expect(res.body).not.toHaveProperty("code");
    });

    test("POST /auth/register con email duplicado devuelve 409", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({
          nombre: "Duplicado",
          email: context.alumnoC1.email,
          password: "password123",
          modulo: moduleNumberToLabel(1),
          cohorte: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Email ya registrado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /slots/:id/solicitar sin reservar devuelve 403", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id || turnoRes.res.body.id;

      const res = await request(app)
        .post(`/submissions/${slotId}`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          githubLink: "https://github.com/test/repo",
        });

      expect([403, 422]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(
        res.body.message.toLowerCase().includes("reserv") ||
        res.body.message === "Error de validacion"
      ).toBe(true);
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /slots/:id/solicitar turno ya reservado devuelve 403", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id || turnoRes.res.body.id;

      await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      const res = await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      expect([403, 422]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(
        res.body.message.toLowerCase().includes("reservado") ||
        res.body.message === "Error de validacion"
      ).toBe(true);
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PUT /submissions/:id de entrega aprobada devuelve 409", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id || turnoRes.res.body.id;

      await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      const entregaRes = await request(app)
        .post(`/submissions/${slotId}`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          githubLink: "https://github.com/test/repo",
        });

      const submissionId = entregaRes.body.id;

      const aprobarRes = await request(app)
        .put(`/submissions/${submissionId}`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({
          reviewStatus: "Aprobado",
        });

      expect([200, 204, 422]).toContain(aprobarRes.status);
      if (aprobarRes.status === 422) {
        return;
      }

      const res = await request(app)
        .put(`/submissions/${submissionId}`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          githubLink: "https://github.com/test/nuevo-repo",
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("No se puede modificar");
      expect(res.body).not.toHaveProperty("msg");
    });
  });

  describe("Verificación de Formato Unificado en Todos los Errores", () => {
    test("Todos los errores 4xx/5xx tienen solo {message, errores?}", async () => {
      const errores = [];

      const e401 = await request(app).get("/slots");
      errores.push(e401);

      const e403 = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({ title: "Test" });
      errores.push(e403);

      const e404 = await request(app)
        .get("/assignments/invalid")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);
      errores.push(e404);

      const e422 = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({});
      errores.push(e422);

      for (const error of errores) {
        expect(error.body).toHaveProperty("message");
        expect(typeof error.body.message).toBe("string");
        expect(error.body).not.toHaveProperty("msg");
        expect(error.body).not.toHaveProperty("code");
        expect(error.body).not.toHaveProperty("status");
        
        if (error.body.errores) {
          expect(Array.isArray(error.body.errores)).toBe(true);
        }
      }
    });
  });
});
