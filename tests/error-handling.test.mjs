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
        .get("/auth/usuarios")
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
          date: "2026-12-31",
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

      // El profesor tiene permisos pero el servicio lanza 404 al no encontrar el usuario
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
        moduleNumber: 1,
      });

      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id, { moduleNumber: 1 });
      const slotId = turnoRes.res.body._id;

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

  describe("Middleware de Validación (400)", () => {
    test("POST /assignments con dueDate inválido devuelve 400 con errores array", async () => {
      const res = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({
          title: "Test",
          description: "Test",
          dueDate: "fecha-invalida",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(Array.isArray(res.body.errores)).toBe(true);
      expect(res.body.errores.length).toBeGreaterThan(0);
      expect(res.body).not.toHaveProperty("msg");
      expect(res.body).not.toHaveProperty("code");
    });

    test("POST /assignments sin campos requeridos devuelve 400", async () => {
      const res = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(Array.isArray(res.body.errores)).toBe(true);
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /slots/:id/estado con estado inválido devuelve 400", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id;

      const res = await request(app)
        .patch(`/slots/${slotId}/estado`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({ estado: "estado_invalido_xyz" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("POST /auth/register sin password devuelve 400", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({
          name: "Test",
          email: "test@example.com",
          moduleNumber: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toBe("Error de validacion");
      expect(res.body).toHaveProperty("errores");
      expect(res.body).not.toHaveProperty("msg");
    });
  });

  describe("Servicios - Errores 404 (ID Inválido/No Existe)", () => {
    test("GET /assignments/:id con ID inválido devuelve 400 (validación de parámetro)", async () => {
      const res = await request(app)
        .get("/assignments/id-invalido-123")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      // Los validadores pueden devolver 400 si el ID no es válido antes de llegar al servicio
      expect([400, 404]).toContain(res.status);
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
      expect(res.body.message).toContain("Asignación no encontrada");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("GET /turnos/:id con ID inválido devuelve 404", async () => {
      const res = await request(app)
        .get("/turnos/abc123")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Turno no encontrado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("GET /turnos/:id con ID válido pero inexistente devuelve 404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/turnos/${fakeId}`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Turno no encontrado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PUT /assignments/:id con ID inválido devuelve 400 (validación)", async () => {
      const res = await request(app)
        .put("/assignments/invalid-id")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({
          title: "Update",
          description: "Test",
          dueDate: "2026-12-31",
        });

      // El validador detecta ID inválido y devuelve 400 antes de llegar al servicio
      expect([400, 404]).toContain(res.status);
      expect(res.body).toHaveProperty("message");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("DELETE /assignments/:id con ID inválido devuelve 400 (validación)", async () => {
      const res = await request(app)
        .delete("/assignments/xyz")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);

      // El validador detecta ID inválido y devuelve 400
      expect([400, 404]).toContain(res.status);
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
          name: "Duplicado",
          email: context.alumnoC1.email,
          password: "password123",
          moduleNumber: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Email ya registrado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /slots/:id/solicitar sin reservar devuelve 403", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id;

      // Crear entrega sin reservar
      const res = await request(app)
        .post(`/submissions/${slotId}`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          githubLink: "https://github.com/test/repo",
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("reservar");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PATCH /slots/:id/solicitar turno ya reservado devuelve 403", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id;

      // Primera reserva exitosa
      await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      // Segunda reserva del mismo alumno
      const res = await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toContain("Turno ya reservado");
      expect(res.body).not.toHaveProperty("msg");
    });

    test("PUT /submissions/:id de entrega aprobada devuelve 409", async () => {
      const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
      const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
      const slotId = turnoRes.res.body._id;

      // Reservar
      await request(app)
        .patch(`/slots/${slotId}/solicitar`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`);

      // Crear entrega
      const entregaRes = await request(app)
        .post(`/submissions/${slotId}`)
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({
          githubLink: "https://github.com/test/repo",
        });

      const submissionId = entregaRes.body.id;

      // Aprobar entrega como profesor
      const aprobarRes = await request(app)
        .put(`/submissions/${submissionId}`)
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({
          reviewStatus: "Aprobado",
        });

      // Verificar que se aprobó correctamente (puede ser 200 o 204)
      expect([200, 204]).toContain(aprobarRes.status);

      // Intentar modificar entrega aprobada como alumno
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
      // Recopilar varios errores
      const errores = [];

      // 401
      const e401 = await request(app).get("/slots");
      errores.push(e401);

      // 403
      const e403 = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.alumnoC1.token}`)
        .send({ title: "Test" });
      errores.push(e403);

      // 404
      const e404 = await request(app)
        .get("/assignments/invalid")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`);
      errores.push(e404);

      // 400
      const e400 = await request(app)
        .post("/assignments")
        .set("Authorization", `Bearer ${context.profesorOwner.token}`)
        .send({});
      errores.push(e400);

      // Verificar formato unificado
      for (const error of errores) {
        expect(error.body).toHaveProperty("message");
        expect(typeof error.body.message).toBe("string");
        expect(error.body).not.toHaveProperty("msg");
        expect(error.body).not.toHaveProperty("code");
        expect(error.body).not.toHaveProperty("status");
        
        // Si tiene errores, debe ser array
        if (error.body.errores) {
          expect(Array.isArray(error.body.errores)).toBe(true);
        }
      }
    });
  });
});
