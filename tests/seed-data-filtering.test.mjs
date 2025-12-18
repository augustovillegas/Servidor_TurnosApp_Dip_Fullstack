/**
 * SEED DATA FILTERING TESTS
 *
 * Verifica que profesores y alumnos reciban solo los datos filtrados por su modulo,
 * usando las credenciales reales del seed completo.
 */
import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import { getApp, ensureDatabaseInitialized } from "./helpers/testUtils.mjs";
import { execSync } from "child_process";

const SEED_CREDENTIALS = {
  superadmin: {
    email: "superadmin.diplomatura@gmail.com",
    password: "Superadmin#2025",
  },
  profesores: {
    htmlcss: {
      email: "laura.silva.htmlcss.prof.01@gmail.com",
      password: "Profesor-htmlcss-2025",
      modulo: "HTML-CSS",
      cohorte: 1,
    },
    javascript: {
      email: "gabriel.martinez.javascript.prof.01@gmail.com",
      password: "Profesor-javascript-2025",
      modulo: "JAVASCRIPT",
      cohorte: 2,
    },
  },
  alumnos: {
    htmlcss: [
      {
        email: "mateo.alvarez.htmlcss.alumno.01@gmail.com",
        password: "Alumno-htmlcss-01",
        cohorte: 1,
      },
      {
        email: "camila.herrera.htmlcss.alumno.02@gmail.com",
        password: "Alumno-htmlcss-02",
        cohorte: 1,
      },
    ],
    javascript: [
      {
        email: "diego.suarez.javascript.alumno.01@gmail.com",
        password: "Alumno-javascript-01",
        cohorte: 2,
      },
    ],
  },
};

let app;
let tokens = {};

async function loginUser(email, password) {
  const res = await request(app).post("/auth/login").send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.token,
    user: res.body.user,
    id: res.body.user?.id || res.body.id,
  };
}

describe.sequential("Seed Data Filtering - Professors", () => {
  beforeAll(async () => {
    app = await getApp();
    await ensureDatabaseInitialized();

    try {
      execSync("node scripts/seedCompleto.mjs", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error("Error generando datos:", error.message);
    }

    tokens.superadmin = await loginUser(SEED_CREDENTIALS.superadmin.email, SEED_CREDENTIALS.superadmin.password);
    tokens.profHtmlCss = await loginUser(
      SEED_CREDENTIALS.profesores.htmlcss.email,
      SEED_CREDENTIALS.profesores.htmlcss.password
    );
    tokens.profJavascript = await loginUser(
      SEED_CREDENTIALS.profesores.javascript.email,
      SEED_CREDENTIALS.profesores.javascript.password
    );
    tokens.alumnoHtmlCss1 = await loginUser(
      SEED_CREDENTIALS.alumnos.htmlcss[0].email,
      SEED_CREDENTIALS.alumnos.htmlcss[0].password
    );
    tokens.alumnoJavascript1 = await loginUser(
      SEED_CREDENTIALS.alumnos.javascript[0].email,
      SEED_CREDENTIALS.alumnos.javascript[0].password
    );
  });

  test("Profesor HTML-CSS solo ve asignaciones de su modulo", async () => {
    const res = await request(app).get("/assignments").set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    res.body.forEach((assignment) => {
      expect(assignment.modulo).toBe("HTML-CSS");
      expect(assignment.cohorte).toBe(1);
    });
  });

  test("Profesor JAVASCRIPT solo ve asignaciones de su modulo", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profJavascript.token}`);

    expect(res.status).toBe(200);
    res.body.forEach((assignment) => {
      expect(assignment.modulo).toBe("JAVASCRIPT");
      expect(assignment.cohorte).toBe(2);
    });
  });

  test("Profesor HTML-CSS solo ve turnos de su modulo", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohorte).toBe(1);
      });
    }
  });

  test("Profesor JAVASCRIPT solo ve turnos de su modulo", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${tokens.profJavascript.token}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohorte).toBe(2);
      });
    }
  });

  test("Profesor HTML-CSS solo ve alumnos de su modulo", async () => {
    const res = await request(app)
      .get("/usuarios?rol=alumno")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    res.body.forEach((user) => {
      expect(user.rol).toBe("alumno");
      expect(user.modulo).toBe("HTML-CSS");
      expect(user.cohorte).toBe(1);
    });
  });
});

describe.sequential("Seed Data Filtering - Students", () => {
  beforeAll(async () => {
    if (!tokens.alumnoHtmlCss1) {
      tokens.alumnoHtmlCss1 = await loginUser(
        SEED_CREDENTIALS.alumnos.htmlcss[0].email,
        SEED_CREDENTIALS.alumnos.htmlcss[0].password
      );
    }
    if (!tokens.alumnoJavascript1) {
      tokens.alumnoJavascript1 = await loginUser(
        SEED_CREDENTIALS.alumnos.javascript[0].email,
        SEED_CREDENTIALS.alumnos.javascript[0].password
      );
    }
  });

  test("Alumno HTML-CSS solo ve asignaciones de su modulo", async () => {
    const res = await request(app).get("/assignments").set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((assignment) => {
        expect(assignment.cohorte).toBe(1);
      });
    }
  });

  test("Alumno HTML-CSS solo ve turnos de su modulo", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohorte).toBe(1);
      });
    }
  });

  test("Alumno solo ve sus propias entregas", async () => {
    const res = await request(app)
      .get(`/submissions/${tokens.alumnoHtmlCss1.id}`)
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      res.body.forEach((submission) => {
        expect(String(submission.alumnoId)).toBe(String(tokens.alumnoHtmlCss1.id));
      });
    }
  });

  test("Alumno recibe 403 al intentar ver entregas de otro alumno", async () => {
    const res = await request(app)
      .get(`/submissions/${tokens.alumnoJavascript1.id}`)
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(403);
  });
});

describe.sequential("Seed Data Completeness Verification", () => {
  beforeAll(async () => {
    if (!tokens.profHtmlCss) {
      tokens.profHtmlCss = await loginUser(
        SEED_CREDENTIALS.profesores.htmlcss.email,
        SEED_CREDENTIALS.profesores.htmlcss.password
      );
      tokens.profJavascript = await loginUser(
        SEED_CREDENTIALS.profesores.javascript.email,
        SEED_CREDENTIALS.profesores.javascript.password
      );
    }
  });

  test("Seed completo genero asignaciones para todos los modulos", async () => {
    const res = await request(app).get("/assignments").set("Authorization", `Bearer ${tokens.superadmin.token}`);
    expect(res.status).toBe(200);
    const modules = new Set(res.body.map((a) => a.cohorte));
    expect(modules.has(1)).toBe(true);
    expect(modules.has(2)).toBe(true);
    expect(modules.has(3)).toBe(true);
    expect(modules.has(4)).toBe(true);
  });

  test("Seed completo genero turnos de revision", async () => {
    const res = await request(app).get("/slots").set("Authorization", `Bearer ${tokens.superadmin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const modules = new Set(res.body.map((s) => s.cohorte));
    expect(modules.size).toBeGreaterThan(1);
  });
});
