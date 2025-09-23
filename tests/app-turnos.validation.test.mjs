import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server.mjs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { limpiarDB } from "../scripts/limpiarDB.mjs";
import { crearSuperadmin } from "../scripts/crearSuperadmin.mjs";

dotenv.config();

let tokenSuperadmin, tokenProfesor, tokenAlumno, tokenAlumnoCohorte2;
let idProfesor, idAlumno, idAssignment, idTurno;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  await limpiarDB();
  await crearSuperadmin();

  const superadmin = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@app.com", password: "admin123" });
  tokenSuperadmin = superadmin.body.token;

  await request(app)
    .patch(`/api/auth/aprobar/${superadmin.body.user._id}`)
    .set("Authorization", `Bearer ${tokenSuperadmin}`);

  const resProfesor = await request(app).post("/api/auth/register").send({
    nombre: "Profesor",
    apellido: "Test",
    email: "profesor@test.com",
    password: "test123",
    role: "profesor",
    cohort: 1,
  });
  idProfesor = resProfesor.body.user._id;

  const loginProfesor = await request(app)
    .post("/api/auth/login")
    .send({ email: "profesor@test.com", password: "test123" });
  tokenProfesor = loginProfesor.body.token;

  const resAlumno = await request(app).post("/api/auth/register").send({
    nombre: "Alumno",
    apellido: "Test",
    email: "alumno@test.com",
    password: "test123",
    cohort: 1,
  });
  idAlumno = resAlumno.body.user._id;

  const loginAlumno = await request(app)
    .post("/api/auth/login")
    .send({ email: "alumno@test.com", password: "test123" });
  tokenAlumno = loginAlumno.body.token;

  await request(app)
    .patch(`/api/auth/aprobar/${idAlumno}`)
    .set("Authorization", `Bearer ${tokenProfesor}`);

  const resAlumno2 = await request(app).post("/api/auth/register").send({
    nombre: "Alumno Dos",
    apellido: "Test",
    email: "alumno2@test.com",
    password: "test123",
    cohort: 2,
  });
  const loginAlumno2 = await request(app)
    .post("/api/auth/login")
    .send({ email: "alumno2@test.com", password: "test123" });
  tokenAlumnoCohorte2 = loginAlumno2.body.token;

  await request(app)
    .patch(`/api/auth/aprobar/${resAlumno2.body.user._id}`)
    .set("Authorization", `Bearer ${tokenProfesor}`);

  await request(app)
    .patch(`/api/auth/aprobar/${idProfesor}`)
    .set("Authorization", `Bearer ${tokenSuperadmin}`);

  const resAsignacion = await request(app)
    .post("/api/assignments")
    .set("Authorization", `Bearer ${tokenProfesor}`)
    .send({
      title: "TP Integrador",
      description: "Desarrollar un CRUD",
      deadline: "2025-12-31",
      module: 1,
      cohort: 1,
    });
  idAssignment = resAsignacion.body._id;

  const resTurno = await request(app)
    .post("/api/slots")
    .set("Authorization", `Bearer ${tokenProfesor}`)
    .send({
      assignment: idAssignment,
      cohort: 1,
      date: "2025-10-10",
      startTime: "10:00",
      endTime: "11:00",
    });
  idTurno = resTurno.body._id;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("✅ Flujo de registros y aprobaciones", () => {
  test("Superadmin registra y aprueba profesor", async () => {
    const resProfesor = await request(app).post("/api/auth/register").send({
      nombre: "Nuevo",
      apellido: "Profesor",
      email: "nuevo.profesor@test.com",
      password: "test123",
      role: "profesor",
    });
    expect(resProfesor.status).toBe(201);

    const idNuevo = resProfesor.body.user._id;
    const resAprobar = await request(app)
      .patch(`/api/auth/aprobar/${idNuevo}`)
      .set("Authorization", `Bearer ${tokenSuperadmin}`);

    expect(resAprobar.status).toBe(200);
    expect(resAprobar.body?.user?.isApproved ?? true).toBe(true);
  });
});

describe("❌ Validaciones de flujos de usuario", () => {
  test("Profesor no puede crear asignación sin token", async () => {
    const res = await request(app).post("/api/assignments").send({
      title: "Sin token",
      description: "Debe fallar",
      deadline: "2025-12-31",
    });
    expect(res.status).toBe(401);
  });

  test("Login incorrecto", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "profesor@test.com",
      password: "mala",
    });
    expect(res.status).toBe(401);
  });

  test("Registro duplicado", async () => {
    const res = await request(app).post("/api/auth/register").send({
      nombre: "Profesor",
      apellido: "Test",
      email: "profesor@test.com",
      password: "test123",
      role: "profesor",
    });
    expect(res.status).toBe(400);
  });

  test("Alumno no puede crear asignación", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({
        title: "TP alumno",
        description: "No puede",
        deadline: "2025-12-31",
      });
    expect(res.status).toBe(403);
  });

  test("Profesor no puede solicitar turno", async () => {
    const res = await request(app)
      .patch(`/api/slots/${idTurno}/solicitar`)
      .set("Authorization", `Bearer ${tokenProfesor}`);
    expect(res.status).toBe(403);
  });

  test("Alumno crea entrega con link inválido", async () => {
    const res = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ link: "no-es-un-link" });
    expect(res.status).toBe(400);
  });

  test("Alumno crea entrega sin link", async () => {
    const res = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ comentarios: "Sin link" });
    expect(res.status).toBe(400);
  });

  test("Alumno cohorte 2 no puede solicitar turno de cohorte 1", async () => {
    const res = await request(app)
      .patch(`/api/slots/${idTurno}/solicitar`)
      .set("Authorization", `Bearer ${tokenAlumnoCohorte2}`);
    expect(res.status).toBe(403);
  });

  test("Registro sin email falla", async () => {
    const res = await request(app).post("/api/auth/register").send({
      nombre: "Sin Email",
      apellido: "Test",
      password: "123456",
      role: "profesor",
    });
    expect(res.status).toBe(400);
  });

  test("Registro con contraseña corta falla", async () => {
    const res = await request(app).post("/api/auth/register").send({
      nombre: "Corto",
      apellido: "Test",
      email: "corto@test.com",
      password: "123",
      role: "alumno",
    });
    expect(res.status).toBe(400);
  });

  test("Token inválido bloquea asignación", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer tokenInvalido`)
      .send({ title: "Invalido", description: "xxx", deadline: "2025-12-31" });
    expect([401, 403]).toContain(res.status);
  });

  test("Solicitar turno sin token falla", async () => {
    const res = await request(app).patch(`/api/slots/${idTurno}/solicitar`);
    expect(res.status).toBe(401);
  });

  test("Entrega con renderLink inválido falla", async () => {
    const res = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({
        link: "https://github.com/alumno/test",
        renderLink: "no-es-un-link",
      });
    expect(res.status).toBe(400);
  });

  test("Profesor no puede aprobar usuarios sin token", async () => {
    const res = await request(app).patch(`/api/auth/aprobar/${idAlumno}`);
    expect(res.status).toBe(401);
  });

  test("Solicitud de turno con ID inexistente", async () => {
    const res = await request(app)
      .patch(`/api/slots/000000000000000000000000/solicitar`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect([404, 500]).toContain(res.status);
  });

  test("Entrega con GitHub correcto y render opcional", async () => {
    const res = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({
        link: "https://github.com/alumno/test",
      });
    expect([200, 201]).toContain(res.status);
  });

  test("Profesor puede eliminar entrega", async () => {
    const res = await request(app)
      .delete(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenProfesor}`);
    expect(res.status).toBe(204);
  });

  test("Alumno no puede crear asignación con token inválido", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer 123456`)
      .send({
        title: "TP inválido",
        description: "Debe fallar",
        deadline: "2025-12-31",
      });
    expect([401, 403]).toContain(res.status);
  });

  test("Login sin contraseña falla", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "profesor@test.com",
    });
    expect(res.status).toBe(400);
  });

  test("Login sin email falla", async () => {
    const res = await request(app).post("/api/auth/login").send({
      password: "test123",
    });
    expect(res.status).toBe(400);
  });

  test("Crear entrega sin auth falla", async () => {
    const res = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .send({ link: "https://github.com/test" });
    expect(res.status).toBe(401);
  });

  test("Crear entrega con email en vez de link falla", async () => {
    const res = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ link: "test@email.com" });
    expect(res.status).toBe(400);
  });

  test("Crear asignación sin título falla", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({ description: "Sin título", deadline: "2025-12-31" });
    expect(res.status).toBe(400);
  });

  test("Crear asignación sin fecha falla", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({ title: "Sin fecha", description: "Falla" });
    expect(res.status).toBe(400);
  });

  test("Crear asignación con fecha inválida falla", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({ title: "Fecha inválida", description: "x", deadline: "ayer" });
    expect(res.status).toBe(400);
  });

  test("Alumno no puede cancelar turno que no pidió", async () => {
    const res = await request(app)
      .patch(`/api/slots/${idTurno}/cancelar`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect([403, 404]).toContain(res.status);
  });

  test("Superadmin no puede solicitar turno", async () => {
    const res = await request(app)
      .patch(`/api/slots/${idTurno}/solicitar`)
      .set("Authorization", `Bearer ${tokenSuperadmin}`);
    expect(res.status).toBe(403);
  });

  test("Crear asignación con módulo inválido falla", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        title: "Módulo mal",
        description: "xx",
        deadline: "2025-12-31",
        module: "texto",
      });
    expect(res.status).toBe(400);
  });

  test("Obtener entregas sin auth falla", async () => {
    const res = await request(app).get(`/api/submissions/${idAlumno}`);
    expect(res.status).toBe(401);
  });

  // 🔽 TESTS FUNCIONALES DE ÉXITO ADICIONALES 🔽

  test("❌ Validaciones de flujos de usuario > Profesor obtiene lista de sus asignaciones", async () => {
    // Creamos una asignación válida primero
    await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        title: "Tarea para listar",
        description: "Esta tarea es visible para el profesor",
        module: 1, 
        deadline: "2025-12-31T23:59:59Z",
        cohort: 1,
      });

    // Luego hacemos la petición
    const res = await request(app)
      .get("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("❌ Validaciones de flujos de usuario > Alumno solicita turno correctamente", async () => {
    const resAsignacion = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        title: "Tarea para solicitar turno",
        description: "Turno asignable",
        module: 1,
        deadline: "2025-12-31T23:59:59Z",
        cohort: 1,
      });
    expect(resAsignacion.status).toBe(201);
    const idAssignment = resAsignacion.body._id;

    const resTurno = await request(app)
      .post("/api/slots")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        assignment: idAssignment,
        date: "2025-10-15T14:00:00Z",
        cohort: 1,
      });
    expect(resTurno.status).toBe(201);
    const idTurno = resTurno.body._id;

    const resSolicitar = await request(app)
      .patch(`/api/slots/${idTurno}/solicitar`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(resSolicitar.status).toBe(200);
  });

  test("Alumno edita entrega agregando renderLink", async () => {
    // Create a new slot and an assignment to associate the submission with
    const resSlot = await request(app)
      .post("/api/slots")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        assignment: idAssignment,
        date: "2025-11-20T10:00:00Z",
        cohort: 1,
      });
    const idTurno = resSlot.body._id;

    // Create the submission and get the ID
    const resEntrega = await request(app)
      .post(`/api/submissions/${idTurno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({
        link: "https://github.com/alumno/proyecto-test",
      });

    const entregaId = resEntrega.body._id;

    // Now, the PUT request will work correctly
    const res = await request(app)
      .put(`/api/submissions/${entregaId}`)
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({
        renderLink: "https://vercel.app/alumno/test",
      });

    expect(res.status).toBe(200);
  });

  test("Alumno puede ver sus entregas", async () => {
    const res = await request(app)
      .get(`/api/submissions/${idAlumno}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("Profesor obtiene entregas del alumno", async () => {
    const res = await request(app)
      .get(`/api/submissions/${idAlumno}`)
      .set("Authorization", `Bearer ${tokenProfesor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("❌ Validaciones de flujos de usuario > Alumno cancela turno solicitado", async () => {
    const resAsignacion = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        title: "Asignación para cancelar turno",
        description: "El alumno pedirá y luego cancelará",
        module: 1,
        deadline: "2025-12-31T23:59:59Z",
        cohort: 1,
      });
    expect(resAsignacion.status).toBe(201);
    const idAsignacion = resAsignacion.body._id;

    const resTurno = await request(app)
      .post("/api/slots")
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({
        assignment: idAsignacion,
        date: "2025-11-01T10:00:00Z",
        cohort: 1,
      });
    expect(resTurno.status).toBe(201);
    const idTurnoNuevo = resTurno.body._id;

    const resSolicitar = await request(app)
      .patch(`/api/slots/${idTurnoNuevo}/solicitar`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(resSolicitar.status).toBe(200);

    const resCancelar = await request(app)
      .patch(`/api/slots/${idTurnoNuevo}/cancelar`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(resCancelar.status).toBe(200);
  });

  test("Filtro de turnos por cohorte devuelve resultados coherentes", async () => {
    const res = await request(app)
      .get(`/api/slots?cohort=1`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(res.status).toBe(200);
    expect(res.body[0]?.cohort).toBe(1);
  });

  test("Superadmin puede listar todos los usuarios", async () => {
    const res = await request(app)
      .get(`/api/auth/usuarios`)
      .set("Authorization", `Bearer ${tokenSuperadmin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("Profesor puede buscar alumnos registrados", async () => {
    const res = await request(app)
      .get(`/api/auth/usuarios?role=alumno`)
      .set("Authorization", `Bearer ${tokenProfesor}`);
    expect(res.status).toBe(200);
    expect(res.body.some((u) => u.role === "alumno")).toBe(true);
  });
});
