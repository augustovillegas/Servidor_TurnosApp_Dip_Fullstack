/**
 * SEED DATA FILTERING TESTS
 * 
 * Verifica que profesores y alumnos reciban únicamente los datos filtrados
 * correspondientes a su módulo, usando las credenciales reales del seed completo.
 * 
 * Casos validados:
 * - Profesores ven solo asignaciones, entregas y turnos de su módulo
 * - Profesores ven todos los alumnos de su módulo
 * - Alumnos ven solo asignaciones y turnos de su módulo
 * - Alumnos solo ven sus propias entregas
 * - Superadmin ve todo sin restricciones
 */

import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import { getApp, ensureDatabaseInitialized } from "./helpers/testUtils.mjs";
import { execSync } from "child_process";

// Credenciales reales del SEED_USERS.md
const SEED_CREDENTIALS = {
  superadmin: {
    email: "superadmin.diplomatura@gmail.com",
    password: "Superadmin#2025",
    moduleLabel: null,
    moduleNumber: null,
  },
  profesores: {
    htmlcss: {
      email: "laura.silva.htmlcss@gmail.com",
      password: "Prof-HTML-CSS-2025",
      moduleLabel: "HTML-CSS",
      moduleNumber: 1,
    },
    javascript: {
      email: "gabriel.martinez.javascript@gmail.com",
      password: "Prof-JAVASCRIPT-2025",
      moduleLabel: "JAVASCRIPT",
      moduleNumber: 2,
    },
    node: {
      email: "paula.costa.node@gmail.com",
      password: "Prof-BACKEND-NODE-JS-2025",
      moduleLabel: "BACKEND - NODE JS",
      moduleNumber: 3,
    },
    react: {
      email: "sergio.ledesma.react@gmail.com",
      password: "Prof-FRONTEND-REACT-2025",
      moduleLabel: "FRONTEND - REACT",
      moduleNumber: 4,
    },
  },
  alumnos: {
    htmlcss: [
      {
        email: "mateo.alvarez.htmlcss.01@gmail.com",
        password: "Alumno-HTML-CSS-01",
        name: "Mateo Alvarez",
        moduleNumber: 1,
      },
      {
        email: "camila.herrera.htmlcss.02@gmail.com",
        password: "Alumno-HTML-CSS-02",
        name: "Camila Herrera",
        moduleNumber: 1,
      },
    ],
    javascript: [
      {
        email: "diego.suarez.javascript.01@gmail.com",
        password: "Alumno-JAVASCRIPT-01",
        name: "Diego Suarez",
        moduleNumber: 2,
      },
      {
        email: "marina.bustos.javascript.02@gmail.com",
        password: "Alumno-JAVASCRIPT-02",
        name: "Marina Bustos",
        moduleNumber: 2,
      },
    ],
    node: [
      {
        email: "carla.mansilla.node.01@gmail.com",
        password: "Alumno-BACKEND-NODE-JS-01",
        name: "Carla Mansilla",
        moduleNumber: 3,
      },
      {
        email: "ivan.robles.node.02@gmail.com",
        password: "Alumno-BACKEND-NODE-JS-02",
        name: "Ivan Robles",
        moduleNumber: 3,
      },
    ],
    react: [
      {
        email: "hernan.toledo.react.01@gmail.com",
        password: "Alumno-FRONTEND-REACT-01",
        name: "Hernan Toledo",
        moduleNumber: 4,
      },
      {
        email: "micaela.pinto.react.02@gmail.com",
        password: "Alumno-FRONTEND-REACT-02",
        name: "Micaela Pinto",
        moduleNumber: 4,
      },
    ],
  },
};

let app;
let tokens = {};

async function loginUser(email, password) {
  const res = await request(app).post("/auth/login").send({ email, password });
  
  if (res.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`
    );
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

    // Asegurar que existan asignaciones y turnos para todos los módulos
    try {
      console.log("\n📦 Generando datos para todos los módulos...");
      execSync("node scripts/crearAsignacionesYEntregas_v2.mjs", { 
        stdio: "inherit",
        cwd: process.cwd()
      });
      console.log("✅ Asignaciones y entregas generadas");
      
      execSync("node scripts/crearTurnosReviews.mjs", { 
        stdio: "inherit",
        cwd: process.cwd()
      });
      console.log("✅ Turnos de revisión generados\n");
    } catch (error) {
      console.error("❌ Error generando datos:", error.message);
    }

    // Login all test users
    tokens.superadmin = await loginUser(
      SEED_CREDENTIALS.superadmin.email,
      SEED_CREDENTIALS.superadmin.password
    );

    tokens.profHtmlCss = await loginUser(
      SEED_CREDENTIALS.profesores.htmlcss.email,
      SEED_CREDENTIALS.profesores.htmlcss.password
    );

    tokens.profJavascript = await loginUser(
      SEED_CREDENTIALS.profesores.javascript.email,
      SEED_CREDENTIALS.profesores.javascript.password
    );

    tokens.profNode = await loginUser(
      SEED_CREDENTIALS.profesores.node.email,
      SEED_CREDENTIALS.profesores.node.password
    );

    tokens.profReact = await loginUser(
      SEED_CREDENTIALS.profesores.react.email,
      SEED_CREDENTIALS.profesores.react.password
    );

    tokens.alumnoHtmlCss1 = await loginUser(
      SEED_CREDENTIALS.alumnos.htmlcss[0].email,
      SEED_CREDENTIALS.alumnos.htmlcss[0].password
    );

    tokens.alumnoJavascript1 = await loginUser(
      SEED_CREDENTIALS.alumnos.javascript[0].email,
      SEED_CREDENTIALS.alumnos.javascript[0].password
    );

    tokens.alumnoNode1 = await loginUser(
      SEED_CREDENTIALS.alumnos.node[0].email,
      SEED_CREDENTIALS.alumnos.node[0].password
    );

    tokens.alumnoReact1 = await loginUser(
      SEED_CREDENTIALS.alumnos.react[0].email,
      SEED_CREDENTIALS.alumnos.react[0].password
    );
  });

  test("Profesor HTML-CSS solo ve asignaciones de módulo 1 (HTML-CSS)", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Todas las asignaciones deben ser del módulo 1
    res.body.forEach((assignment) => {
      expect(assignment.cohorte).toBe(1);
      expect(assignment.module).toBe(1);
    });

    // No debe haber asignaciones de otros módulos
    const otherModules = res.body.filter((a) => a.cohorte !== 1);
    expect(otherModules.length).toBe(0);
  });

  test("Profesor JAVASCRIPT solo ve asignaciones de módulo 2 (JAVASCRIPT)", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profJavascript.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    res.body.forEach((assignment) => {
      expect(assignment.cohorte).toBe(2);
      expect(assignment.module).toBe(2);
    });
  });

  test("Profesor BACKEND-NODE JS solo ve asignaciones de módulo 3", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profNode.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    res.body.forEach((assignment) => {
      expect(assignment.cohorte).toBe(3);
      expect(assignment.module).toBe(3);
    });
  });

  test("Profesor REACT solo ve asignaciones de módulo 4", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profReact.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    res.body.forEach((assignment) => {
      expect(assignment.cohorte).toBe(4);
      expect(assignment.module).toBe(4);
    });
  });

  test("Profesor HTML-CSS solo ve turnos de su módulo (moduleNumber=1)", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohort || slot.moduleNumber).toBe(1);
      });
    }
  });

  test("Profesor HTML-CSS ve entregas de alumnos de su módulo aunque cohorte difiera", async () => {
    // Listado general de entregas
    const res = await request(app)
      .get("/submissions")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Debe haber al menos una entrega de alumnos del módulo 1
    expect(res.body.length).toBeGreaterThan(0);

    // Validar estructura mínima
    const first = res.body[0];
    expect(first).toHaveProperty("student");
    expect(first).toHaveProperty("githubLink");
    expect(first).toHaveProperty("reviewStatus");
  });

  test("Profesor JAVASCRIPT solo ve turnos de su módulo (moduleNumber=2)", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${tokens.profJavascript.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohort || slot.moduleNumber).toBe(2);
      });
    }
  });

  test("Profesor HTML-CSS solo ve alumnos de su módulo", async () => {
    const res = await request(app)
      .get("/usuarios?role=alumno")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Todos los alumnos deben ser del módulo 1
    res.body.forEach((user) => {
      expect(user.role).toBe("alumno");
      expect(user.moduleNumber).toBe(1);
    });

    // Verificar que incluye alumnos esperados del seed
    const emails = res.body.map((u) => u.email);
    expect(emails).toContain("mateo.alvarez.htmlcss.01@gmail.com");
    expect(emails).toContain("camila.herrera.htmlcss.02@gmail.com");
    
    // No debe incluir alumnos de otros módulos
    expect(emails).not.toContain("diego.suarez.javascript.01@gmail.com");
    expect(emails).not.toContain("carla.mansilla.node.01@gmail.com");
  });

  test("Profesor JAVASCRIPT solo ve alumnos de su módulo", async () => {
    const res = await request(app)
      .get("/usuarios?role=alumno")
      .set("Authorization", `Bearer ${tokens.profJavascript.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    res.body.forEach((user) => {
      expect(user.role).toBe("alumno");
      expect(user.moduleNumber).toBe(2);
    });

    const emails = res.body.map((u) => u.email);
    expect(emails).toContain("diego.suarez.javascript.01@gmail.com");
    expect(emails).toContain("marina.bustos.javascript.02@gmail.com");
    
    // No debe incluir alumnos de otros módulos
    expect(emails).not.toContain("mateo.alvarez.htmlcss.01@gmail.com");
    expect(emails).not.toContain("carla.mansilla.node.01@gmail.com");
  });

  test("Profesor HTML-CSS solo ve entregas de alumnos de su módulo", async () => {
    const res = await request(app)
      .get("/submissions")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      // Todas las entregas deben ser de alumnos del módulo 1
      res.body.forEach((submission) => {
        expect(submission.moduleNumber || submission.cohorte).toBe(1);
      });
    }
  });

  test("Superadmin ve asignaciones de TODOS los módulos", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Debe haber asignaciones de múltiples módulos
    const modules = new Set(res.body.map((a) => a.cohorte));
    expect(modules.size).toBeGreaterThan(1);
    
    // Verificar que hay asignaciones de los 4 módulos
    expect(modules.has(1)).toBe(true); // HTML-CSS
    expect(modules.has(2)).toBe(true); // JAVASCRIPT
    expect(modules.has(3)).toBe(true); // BACKEND-NODE
    expect(modules.has(4)).toBe(true); // FRONTEND-REACT
  });

  test("Superadmin ve alumnos de TODOS los módulos", async () => {
    const res = await request(app)
      .get("/usuarios?role=alumno")
      .set("Authorization", `Bearer ${tokens.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Debe haber alumnos de múltiples módulos
    const modules = new Set(res.body.map((u) => u.moduleNumber));
    expect(modules.size).toBe(4); // Todos los módulos

    // Verificar presencia de alumnos de diferentes módulos
    const emails = res.body.map((u) => u.email);
    expect(emails).toContain("mateo.alvarez.htmlcss.01@gmail.com");
    expect(emails).toContain("diego.suarez.javascript.01@gmail.com");
    expect(emails).toContain("carla.mansilla.node.01@gmail.com");
    expect(emails).toContain("hernan.toledo.react.01@gmail.com");
  });
});

describe.sequential("Seed Data Filtering - Students", () => {
  beforeAll(async () => {
    if (!app) {
      app = await getApp();
      await ensureDatabaseInitialized();
    }

    if (!tokens.alumnoHtmlCss1) {
      tokens.alumnoHtmlCss1 = await loginUser(
        SEED_CREDENTIALS.alumnos.htmlcss[0].email,
        SEED_CREDENTIALS.alumnos.htmlcss[0].password
      );
    }

    if (!tokens.alumnoHtmlCss2) {
      tokens.alumnoHtmlCss2 = await loginUser(
        SEED_CREDENTIALS.alumnos.htmlcss[1].email,
        SEED_CREDENTIALS.alumnos.htmlcss[1].password
      );
    }

    if (!tokens.alumnoJavascript1) {
      tokens.alumnoJavascript1 = await loginUser(
        SEED_CREDENTIALS.alumnos.javascript[0].email,
        SEED_CREDENTIALS.alumnos.javascript[0].password
      );
    }
  });

  test("Alumno HTML-CSS solo ve asignaciones de su módulo (moduleNumber=1)", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      res.body.forEach((assignment) => {
        expect(assignment.cohorte).toBe(1);
        expect(assignment.module).toBe(1);
      });
    }
  });

  test("Alumno JAVASCRIPT solo ve asignaciones de su módulo (moduleNumber=2)", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.alumnoJavascript1.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      res.body.forEach((assignment) => {
        expect(assignment.cohorte).toBe(2);
        expect(assignment.module).toBe(2);
      });
    }
  });

  test("Alumno HTML-CSS solo ve turnos de su módulo", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohort).toBe(1);
      });
    }
  });

  test("Alumno JAVASCRIPT solo ve turnos de su módulo", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${tokens.alumnoJavascript1.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      res.body.forEach((slot) => {
        expect(slot.cohort).toBe(2);
      });
    }
  });

  test("Alumno solo ve sus propias entregas, no las de otros alumnos del mismo módulo", async () => {
    const res = await request(app)
      .get(`/submissions/${tokens.alumnoHtmlCss1.id}`)
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Si hay entregas, todas deben pertenecer al alumno que hace la consulta
    if (res.body.length > 0) {
      res.body.forEach((submission) => {
        // The submission DTO uses 'alumnoId' field
        expect(String(submission.alumnoId)).toBe(
          String(tokens.alumnoHtmlCss1.id)
        );
      });
    }
  });

  test("Alumno recibe 403 al intentar ver entregas de otro alumno", async () => {
    const res = await request(app)
      .get(`/submissions/${tokens.alumnoHtmlCss2.id}`)
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("No autorizado");
  });

  test("Alumno recibe 403 al listar usuarios", async () => {
    const res = await request(app)
      .get("/usuarios")
      .set("Authorization", `Bearer ${tokens.alumnoHtmlCss1.token}`);

    expect(res.status).toBe(403);
  });
});

describe.sequential("Seed Data Completeness Verification", () => {
  beforeAll(async () => {
    if (!tokens.profHtmlCss) {
      app = await getApp();
      await ensureDatabaseInitialized();

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

  test("Seed completo generó asignaciones para todos los módulos", async () => {
    const res = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Debe haber al menos 4 asignaciones (1 por módulo mínimo)
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // Verificar que hay asignaciones para cada módulo
    const modules = new Set(res.body.map((a) => a.cohorte));
    expect(modules.has(1)).toBe(true);
    expect(modules.has(2)).toBe(true);
    expect(modules.has(3)).toBe(true);
    expect(modules.has(4)).toBe(true);
  });

  test("Seed completo generó turnos de revisión", async () => {
    const res = await request(app)
      .get("/slots")
      .set("Authorization", `Bearer ${tokens.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Debe haber turnos generados
    expect(res.body.length).toBeGreaterThan(0);

    // Verificar que hay turnos para múltiples módulos
    const modules = new Set(res.body.map((s) => s.cohort));
    expect(modules.size).toBeGreaterThan(1);
  });

  test("Seed completo generó entregas con estados variados", async () => {
    const res = await request(app)
      .get("/submissions")
      .set("Authorization", `Bearer ${tokens.superadmin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      // Verificar que hay diferentes estados de revisión
      const statuses = new Set(res.body.map((s) => s.reviewStatus));
      
      // Debe haber al menos 2 estados diferentes
      expect(statuses.size).toBeGreaterThanOrEqual(2);

      // Verificar que existen entregas con links GitHub
      const conGithub = res.body.filter((s) => s.githubLink && s.githubLink.includes("github.com"));
      expect(conGithub.length).toBeGreaterThan(0);
    }
  });

  test("Profesor ve cantidad correcta de alumnos de su módulo", async () => {
    const res = await request(app)
      .get("/usuarios?role=alumno")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Según SEED_USERS.md, hay 20 alumnos de HTML-CSS (más los 4 generales = 21 total módulo 1)
    // Pero el seedCompleto genera 20 alumnos por módulo específicamente
    expect(res.body.length).toBeGreaterThanOrEqual(20);

    // Todos deben ser del módulo 1
    res.body.forEach((user) => {
      expect(user.moduleNumber).toBe(1);
    });
  });

  test("Profesor puede acceder a detalles de asignación de su módulo", async () => {
    // Primero obtener lista de asignaciones
    const listRes = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);

    // Intentar acceder a una asignación específica
    const assignmentId = listRes.body[0]._id || listRes.body[0].id;
    const detailRes = await request(app)
      .get(`/assignments/${assignmentId}`)
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.cohorte).toBe(1);
  });

  test("Profesor NO puede acceder a asignación de otro módulo", async () => {
    // Obtener asignaciones del módulo JavaScript (módulo 2)
    const listRes = await request(app)
      .get("/assignments")
      .set("Authorization", `Bearer ${tokens.profJavascript.token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);

    const assignmentIdModulo2 = listRes.body[0]._id || listRes.body[0].id;

    // Intentar acceder con profesor de HTML-CSS (módulo 1)
    const detailRes = await request(app)
      .get(`/assignments/${assignmentIdModulo2}`)
      .set("Authorization", `Bearer ${tokens.profHtmlCss.token}`);

    // Debe retornar 404 o 403 porque no pertenece a su módulo
    expect(detailRes.status).toBeOneOf([403, 404]);
  });
});
