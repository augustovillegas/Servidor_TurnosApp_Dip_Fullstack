import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import {
  disconnectTestDB,
  ensureDatabaseInitialized,
  createBaseUsers,
  registerAndLogin,
  uniqueValue,
  getApp,
} from "./helpers/testUtils.mjs";

describe.sequential("Users", () => {
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

  test("Superadmin puede listar usuarios y los datos sensibles no se exponen", async () => {
    const res = await request(app)
      .get("/usuarios")
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const tieneCamposSensibles = res.body.some((user) => "passwordHash" in user);
    expect(tieneCamposSensibles).toBe(false);
  });

  test("Profesor puede filtrar usuarios por rol", async () => {
    const res = await request(app)
      .get("/usuarios?role=alumno")
      .set("Authorization", `Bearer ${context.profesorOwner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const roles = new Set(res.body.map((user) => user.role));
    expect(roles.size).toBe(1);
    expect(roles.has("alumno")).toBe(true);
  });

  test("Superadmin puede filtrar usuarios por módulo", async () => {
    const res = await request(app)
            .get("/usuarios?modulo=FRONTEND - REACT")
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const todosDelModulo = res.body.every((user) => user.moduleLabel === "FRONTEND - REACT");
    expect(todosDelModulo).toBe(true);
  });

  test("Alumno recibe 403 al listar usuarios", async () => {
    const res = await request(app)
      .get("/auth/usuarios")
      .set("Authorization", `Bearer ${context.alumnoC1.token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Acceso denegado");
  });

  test("Superadmin aprueba un usuario pendiente", async () => {
    const pendiente = await registerAndLogin({
      prefix: "usuario-pendiente",
      role: "profesor",
      moduleNumber: 1,
    });

    const approveRes = await request(app)
      .patch(`/auth/aprobar/${pendiente.id}`)
      .set("Authorization", `Bearer ${context.superadmin.token}`);

    expect(approveRes.status).toBe(200);
    const body = approveRes.body.user || approveRes.body;
    expect(body.isApproved).toBe(true);
  });
});

