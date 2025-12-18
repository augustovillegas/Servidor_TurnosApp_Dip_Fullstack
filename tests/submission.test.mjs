import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import {
  disconnectTestDB,
  ensureDatabaseInitialized,
  createBaseUsers,
  crearAsignacion,
  crearTurno,
  crearEntrega,
  reservarTurno,
  crearSubmissionCompleta,
  uniqueValue,
  getApp,
} from "./helpers/testUtils.mjs";

describe.sequential("Submissions", () => {
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

  test("Alumno no puede entregar sin reservar turno previamente", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body.id || turnoRes.res.body._id;

    const entrega = await crearEntrega(context.alumnoC1.token, slotId, {
      githubLink: `https://github.com/${uniqueValue("repo")}`,
    });

    expect(entrega.status).toBe(403);
    expect(entrega.body.message).toContain("Debes reservar el turno");
  });

  test("Entrega rechaza links que no son de GitHub", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body.id || turnoRes.res.body._id;

    const reserva = await reservarTurno(context.alumnoC1.token, slotId);
    expect(reserva.status).toBe(200);

    const entrega = await crearEntrega(context.alumnoC1.token, slotId, {
      link: "https://example.com/proyecto",
    });

    expect(entrega.status).toBeGreaterThanOrEqual(400);
    expect(entrega.status).toBeLessThan(500);
    expect(Array.isArray(entrega.body.errores)).toBe(true);
    expect(entrega.body.errores[0].mensaje).toContain("github.com");
  });

test("Entrega valida queda en estado 'A revisar' tras reservar correctamente", async () => {
    const { res: asignacionRes } = await crearAsignacion(context.profesorOwner.token);
    const turnoRes = await crearTurno(context.profesorOwner.token, asignacionRes.body._id);
    const slotId = turnoRes.res.body.id || turnoRes.res.body._id;

    const reserva = await reservarTurno(context.alumnoC1.token, slotId);
    expect(reserva.status).toBe(200);

    const entrega = await crearEntrega(context.alumnoC1.token, slotId, {
      githubLink: `https://github.com/${uniqueValue("repo")}`,
      comentarios: "Primera version",
    });

    expect(entrega.status).toBe(201);
    expect(entrega.body.reviewStatus).toBe("A revisar");
    expect(entrega.body.githubLink).toContain("github.com/");
  });

  test("Alumno no puede ver entregas de otro alumno", async () => {
    const submission = await crearSubmissionCompleta({
      tokenProfesor: context.profesorOwner.token,
      tokenAlumno: context.alumnoC1.token,
    });

    const res = await request(app)
      .get(`/submissions/${context.alumnoC1.id}`)
      .set("Authorization", `Bearer ${context.alumnoC2.token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("No autorizado");
  });

  test("Alumno no puede editar entrega de otro estudiante", async () => {
    const submission = await crearSubmissionCompleta({
      tokenProfesor: context.profesorOwner.token,
      tokenAlumno: context.alumnoC1.token,
    });

    const update = await request(app)
      .put(`/submissions/${submission.submissionId}`)
      .set("Authorization", `Bearer ${context.alumnoC2.token}`)
      .send({ renderLink: "https://example.com/render" });

    expect(update.status).toBe(403);
    expect(update.body.message).toContain("No autorizado");
  });

  test("Superadmin puede consultar entregas de cualquier alumno", async () => {
    const submission = await crearSubmissionCompleta({
      tokenProfesor: context.profesorOwner.token,
      tokenAlumno: context.alumnoC1.token,
    });

    const res = await request(app)
      .get(`/submissions/${context.alumnoC1.id}`)
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Use 'id' instead of '_id' since DTO uses 'id'
    expect(res.body.some((item) => item.id === submission.submissionId)).toBe(true);
  });

  test("Profesor creador puede aprobar una entrega y el alumno ya no puede modificarla", async () => {
    const submission = await crearSubmissionCompleta({
      tokenProfesor: context.profesorOwner.token,
      tokenAlumno: context.alumnoC1.token,
    });

    const aprobacion = await request(app)
      .put(`/submissions/${submission.submissionId}`)
      .set("Authorization", `Bearer ${context.profesorOwner.token}`)
      .send({ reviewStatus: "aprobado" });

    expect(aprobacion.status).toBe(200);
    expect(aprobacion.body.reviewStatus).toBe("Aprobado");

    const intentoAlumno = await request(app)
      .put(`/submissions/${submission.submissionId}`)
      .set("Authorization", `Bearer ${context.alumnoC1.token}`)
      .send({ renderLink: "https://example.com/render" });

    expect(intentoAlumno.status).toBe(409);
    expect(intentoAlumno.body.message).toContain("No se puede modificar una entrega ya evaluada");
  });
});


