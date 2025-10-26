/**
 * Crea profesores por módulo + alumnos por cohorte + pendientes.
 * Emails garantizados en dominio .com (se normaliza cualquier entrada).
 */
import {
  MODULES,
  COHORTS,
  toPasswordToken,
  pad2,
  connectMongo,
  disconnectMongo,
  queueUser,
  hashPasswords,
  validateEmailsCom,
} from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";

export async function crearUsuariosRoles() {
  const seedUsers = [];

  for (const mod of MODULES) {
    const token = toPasswordToken(mod.name);

    // Profesor por módulo
    queueUser(seedUsers, {
      role: "profesor",
      nombre: `Nombre Profesor ${mod.name}`,
      apellido: `Apellido Profesor ${mod.name}`,
      email: `profesor.${mod.slug}@adminapp.com`, // si luego alguien cambia por @local, se re-normaliza
      plainPassword: `Prof-${token}-123`,
      moduloName: mod.name,
      moduloSlug: mod.slug,
      moduleCode: mod.code,
      estado: "Aprobado",
      cohortLabel: "2025-Q4",
    });

    // Alumnos por cohorte
    let studentIndex = 1;
    for (const cohort of COHORTS) {
      for (let i = 0; i < cohort.count; i++) {
        const suffix = pad2(studentIndex++);
        const minor = pad2(i + 1);
        queueUser(seedUsers, {
          role: "alumno",
          nombre: `Alumno ${suffix}`,
          apellido: mod.name,
          email: `alumno.${mod.slug}.${minor}@adminapp.com`,
          plainPassword: `Alumno-${token}-${minor}`,
          moduloName: mod.name,
          moduloSlug: mod.slug,
          moduleCode: mod.code,
          estado: "Aprobado",
          cohortLabel: cohort.label,
          isRecursante: cohort.isRecursante,
        });
      }
    }

    // 2 pendientes por módulo
    for (let idx = 1; idx <= 2; idx++) {
      const n = pad2(idx);
      queueUser(seedUsers, {
        role: "alumno",
        nombre: `Pendiente ${n}`,
        apellido: mod.name,
        email: `pendiente.${mod.slug}.${n}@adminapp.com`,
        plainPassword: `Pendiente-${token}-${n}`,
        moduloName: mod.name,
        moduloSlug: mod.slug,
        moduleCode: mod.code,
        estado: "Pendiente",
        cohortLabel: "2025-Q4",
      });
    }
  }

  // ✅ verificación estricta .com
  const invalid = validateEmailsCom(seedUsers);
  if (invalid.length) {
    const list = invalid.map((i) => i.document.email).join(", ");
    throw new Error(`Emails inválidos (.com requerido): ${list}`);
  }

  await connectMongo();
  await hashPasswords(seedUsers);
  await User.collection.insertMany(seedUsers.map((s) => s.document), { ordered: true });
  await disconnectMongo();

  return seedUsers;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearUsuariosRoles()
    .then(() => console.log("✅ Usuarios por rol/módulo creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
