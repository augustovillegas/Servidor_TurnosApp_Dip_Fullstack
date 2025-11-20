import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import {
  disconnectTestDB,
  ensureDatabaseInitialized,
  ensureSuperadmin,
  registerAndLogin,
  uniqueValue,
  password,
  getApp,
  seedAllScriptUsers,
} from "./helpers/testUtils.mjs";

describe.sequential("Auth", () => {
  let app;
  let superadmin;

  beforeAll(async () => {
    app = await getApp();
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    superadmin = await ensureSuperadmin();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  test("Credenciales del seed permiten login y conservan datos de modulo", async () => {
    const { credentials } = await seedAllScriptUsers({ reset: true });
    const batchSize = 12;
    const logins = [];

    for (let start = 0; start < credentials.length; start += batchSize) {
      const batch = credentials.slice(start, start + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (cred) => {
          const res = await request(app).post("/auth/login").send({
            email: cred.email,
            password: cred.password,
          });

          expect(res.status).toBe(200);
          expect(res.body.token).toBeTruthy();
          const user = res.body.user;
          expect(user).toBeTruthy();
          expect(user.email).toBe(cred.email.toLowerCase());
          expect(user.role).toBe(cred.role);
          if (cred.modulo !== undefined) {
            expect(user.modulo).toBe(cred.modulo);
          }
          if (cred.moduloSlug) {
            expect(user.moduloSlug).toBe(cred.moduloSlug);
          }
          if (cred.cohortLabel !== undefined) {
            expect(user.cohortLabel).toBe(cred.cohortLabel);
          }
          expect(Boolean(user.isRecursante)).toBe(Boolean(cred.isRecursante));

          return {
            cred,
            token: res.body.token,
            user,
          };
        })
      );

      logins.push(...batchResults);
    }

    const superadminLogin = logins.find((entry) => entry.cred.role === "superadmin");
    expect(superadminLogin).toBeDefined();

    const listado = await request(app)
      .get("/auth/usuarios")
      .set("Authorization", `Bearer ${superadminLogin.token}`);

    expect(listado.status).toBe(200);
    expect(listado.body.length).toBe(credentials.length);
    const slugs = new Set(listado.body.map((u) => u.moduloSlug).filter(Boolean));
    expect(slugs.has("htmlcss")).toBe(true);
    expect(slugs.has("javascript")).toBe(true);
    expect(slugs.has("node")).toBe(true);
    expect(slugs.has("react")).toBe(true);
  }, 120_000);

  test("Registro de alumno valido deja pendiente la aprobacion", async () => {
    const email = `${uniqueValue("alumno")}@test.com`;

    const res = await request(app).post("/auth/register").send({
      name: "Alumno Test",
      email,
      password,
      cohort: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.role).toBe("alumno");
    expect(res.body.user.isApproved).toBe(false);
  });

  test("Registro duplicado responde error de email ya registrado", async () => {
    const email = `${uniqueValue("duplicado")}@test.com`;

    const first = await request(app).post("/auth/register").send({
      name: "Original",
      email,
      password,
      cohort: 2,
    });
    expect(first.status).toBe(201);
    expect(first.body.user.passwordHash).toBeUndefined();

    const duplicate = await request(app).post("/auth/register").send({
      name: "Duplicado",
      email,
      password,
      cohort: 2,
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.msg).toContain("Email ya registrado");
  });

  test("Login exitoso no expone passwordHash", async () => {
    const email = `${uniqueValue("login-ok")}@test.com`;

    const registro = await request(app).post("/auth/register").send({
      name: "Login Ok",
      email,
      password,
      cohort: 1,
    });

    expect(registro.status).toBe(201);

    const loginOk = await request(app).post("/auth/login").send({ email, password });

    expect(loginOk.status).toBe(200);
    expect(loginOk.body.user).toBeTruthy();
    expect(loginOk.body.user.passwordHash).toBeUndefined();
  });

  test("Login con contrasena incorrecta devuelve error", async () => {
    const email = `${uniqueValue("login")}@test.com`;
    const registro = await request(app).post("/auth/register").send({
      name: "Login Test",
      email,
      password,
      cohort: 1,
    });

    expect(registro.status).toBe(201);

    const login = await request(app).post("/auth/login").send({
      email,
      password: "incorrecta",
    });

    expect(login.status).toBe(401);
    expect(login.body.msg).toBe("Credenciales incorrectas");
  });

  test("Superadmin aprueba profesor y queda visible en el listado", async () => {
    const profesor = await registerAndLogin({
      prefix: "prof-aprobar",
      role: "profesor",
      cohort: 1,
    });

    const approveRes = await request(app)
      .patch(`/auth/aprobar/${profesor.id}`)
      .set("Authorization", `Bearer ${superadmin.token}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body?.isApproved ?? approveRes.body?.user?.isApproved).toBe(true);

    const listado = await request(app)
      .get("/auth/usuarios")
      .set("Authorization", `Bearer ${superadmin.token}`);

    expect(listado.status).toBe(200);
    const encontrado = listado.body.find((u) => u.email === profesor.email);
    expect(encontrado).toBeTruthy();
    expect(encontrado.isApproved).toBe(true);
  });

  test("Alumno no autorizado recibe 403 al listar usuarios", async () => {
    const alumno = await registerAndLogin({
      prefix: "alumno-403",
      cohort: 1,
      approvedByToken: superadmin.token,
    });

    const res = await request(app)
      .get("/auth/usuarios")
      .set("Authorization", `Bearer ${alumno.token}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toContain("Acceso denegado");
  });
});



