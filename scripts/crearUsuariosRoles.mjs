/**
 * Genera un profesor y veinte alumnos por cada modulo definido.
 * Los emails se normalizan al dominio gmail.com y mantienen la logica existente.
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
  slugifyLocal,
} from "./lib/seedUtils.mjs";
import { User } from "../models/User.mjs";

const MODULE_PROFESSORS = {
  frontend: { nombre: "Laura", apellido: "Silva" },
  backend: { nombre: "Gabriel", apellido: "Martinez" },
  uxui: { nombre: "Paula", apellido: "Costa" },
  devops: { nombre: "Sergio", apellido: "Ledesma" },
};

const MODULE_STUDENTS = {
  frontend: [
    { nombre: "Mateo", apellido: "Alvarez" },
    { nombre: "Camila", apellido: "Herrera" },
    { nombre: "Santiago", apellido: "Diaz" },
    { nombre: "Valentina", apellido: "Lopez" },
    { nombre: "Lucas", apellido: "Romero" },
    { nombre: "Catalina", apellido: "Morales" },
    { nombre: "Joaquin", apellido: "Vargas" },
    { nombre: "Milagros", apellido: "Ponce" },
    { nombre: "Bruno", apellido: "Navarro" },
    { nombre: "Florencia", apellido: "Castro" },
    { nombre: "Agustin", apellido: "Serrano" },
    { nombre: "Martina", apellido: "Campos" },
    { nombre: "Renzo", apellido: "Cabrera" },
    { nombre: "Abril", apellido: "Figueroa" },
    { nombre: "Tomas", apellido: "Roldan" },
    { nombre: "Julieta", apellido: "Salas" },
    { nombre: "Franco", apellido: "Molina" },
    { nombre: "Bianca", apellido: "Duarte" },
    { nombre: "Nicolas", apellido: "Benitez" },
    { nombre: "Malena", apellido: "Palacios" },
  ],
  backend: [
    { nombre: "Diego", apellido: "Suarez" },
    { nombre: "Marina", apellido: "Bustos" },
    { nombre: "Ezequiel", apellido: "Gil" },
    { nombre: "Carolina", apellido: "Peralta" },
    { nombre: "Ivan", apellido: "Correa" },
    { nombre: "Rocio", apellido: "Miranda" },
    { nombre: "Leandro", apellido: "Paredes" },
    { nombre: "Victoria", apellido: "Ramos" },
    { nombre: "Pablo", apellido: "Arce" },
    { nombre: "Lara", apellido: "Medina" },
    { nombre: "Gaston", apellido: "Villalba" },
    { nombre: "Ludmila", apellido: "Cabrera" },
    { nombre: "Matias", apellido: "Silva" },
    { nombre: "Noelia", apellido: "Acosta" },
    { nombre: "Ramiro", apellido: "Ortega" },
    { nombre: "Sofia", apellido: "Luna" },
    { nombre: "Federico", apellido: "Sosa" },
    { nombre: "Azul", apellido: "Nunez" },
    { nombre: "Marcos", apellido: "Quiroga" },
    { nombre: "Belen", apellido: "Ortiz" },
  ],
  uxui: [
    { nombre: "Carla", apellido: "Mansilla" },
    { nombre: "Ivan", apellido: "Robles" },
    { nombre: "Emilia", apellido: "Paredes" },
    { nombre: "Julian", apellido: "Santoro" },
    { nombre: "Pilar", apellido: "Dominguez" },
    { nombre: "Marcos", apellido: "Varela" },
    { nombre: "Tamara", apellido: "Blanco" },
    { nombre: "Ignacio", apellido: "Farias" },
    { nombre: "Daniela", apellido: "Lugo" },
    { nombre: "Martin", apellido: "Funes" },
    { nombre: "Selena", apellido: "Bravo" },
    { nombre: "Lucio", apellido: "Gimenez" },
    { nombre: "Candela", apellido: "Rojo" },
    { nombre: "Nahir", apellido: "Duarte" },
    { nombre: "Santino", apellido: "Mayo" },
    { nombre: "Belen", apellido: "Rios" },
    { nombre: "Valeria", apellido: "Molina" },
    { nombre: "Julieta", apellido: "Pardo" },
    { nombre: "Mauricio", apellido: "Godoy" },
    { nombre: "Ailin", apellido: "Ferreyra" },
  ],
  devops: [
    { nombre: "Hernan", apellido: "Toledo" },
    { nombre: "Micaela", apellido: "Pinto" },
    { nombre: "Cristian", apellido: "Olivera" },
    { nombre: "Daiana", apellido: "Franco" },
    { nombre: "Sebastian", apellido: "Monzon" },
    { nombre: "Antonella", apellido: "Vega" },
    { nombre: "Gonzalo", apellido: "Cabrera" },
    { nombre: "Nadia", apellido: "Portillo" },
    { nombre: "Maximo", apellido: "Avalos" },
    { nombre: "Jimena", apellido: "Ruiz" },
    { nombre: "Rodrigo", apellido: "Rivas" },
    { nombre: "Agustina", apellido: "Ibarra" },
    { nombre: "Lisandro", apellido: "Pereyra" },
    { nombre: "Magali", apellido: "Corbalan" },
    { nombre: "Emmanuel", apellido: "Bustamante" },
    { nombre: "Melina", apellido: "Godoy" },
    { nombre: "Franco", apellido: "Gimenez" },
    { nombre: "Ariadna", apellido: "Cabrera" },
    { nombre: "Ulises", apellido: "Luna" },
    { nombre: "Priscila", apellido: "Herrera" },
  ],
};

const TOTAL_STUDENTS_PER_MODULE = COHORTS.reduce((acc, cohort) => acc + cohort.count, 0);

function buildEmail(nombre, apellido, moduloSlug, usedEmails, suffix = "") {
  const baseParts = [slugifyLocal(nombre), slugifyLocal(apellido), moduloSlug].filter(Boolean);
  let candidate = baseParts.join(".");
  if (suffix) {
    candidate = `${candidate}.${suffix}`;
  }
  let attempt = 1;
  let currentLocal = candidate;
  let finalEmail = `${currentLocal}@gmail.com`;
  while (usedEmails.has(finalEmail)) {
    attempt += 1;
    currentLocal = `${candidate}.${pad2(attempt)}`;
    finalEmail = `${currentLocal}@gmail.com`;
  }
  usedEmails.add(finalEmail);
  return finalEmail;
}

export async function crearUsuariosRoles(options = {}) {
  const { persist = true } = options;
  const seedUsers = [];
  const usedEmails = new Set();

  for (const mod of MODULES) {
    const token = toPasswordToken(mod.name);
    const profesorConfig = MODULE_PROFESSORS[mod.slug];
    const students = MODULE_STUDENTS[mod.slug];

    if (!profesorConfig) {
      throw new Error(`No hay datos de profesor configurados para el modulo ${mod.slug}`);
    }
    if (!students || students.length !== TOTAL_STUDENTS_PER_MODULE) {
      throw new Error(
        `Se esperaban ${TOTAL_STUDENTS_PER_MODULE} alumnos para ${mod.slug} y hay ${students?.length ?? 0}`
      );
    }

    const profesorEmail = buildEmail(
      profesorConfig.nombre,
      profesorConfig.apellido,
      mod.slug,
      usedEmails
    );

    queueUser(seedUsers, {
      role: "profesor",
      nombre: profesorConfig.nombre,
      apellido: profesorConfig.apellido,
      email: profesorEmail,
      plainPassword: `Prof-${token}-2025`,
      moduloName: mod.name,
      moduloSlug: mod.slug,
      moduleCode: mod.code,
      estado: "Aprobado",
      cohortLabel: "2025-Q4",
      source: "module",
    });

    let studentIndex = 0;
    for (const cohort of COHORTS) {
      for (let i = 0; i < cohort.count; i++) {
        const data = students[studentIndex];
        if (!data) {
          throw new Error(`Faltan alumnos configurados para ${mod.slug}`);
        }
        const suffix = pad2(studentIndex + 1);
        const email = buildEmail(data.nombre, data.apellido, mod.slug, usedEmails, suffix);

        queueUser(seedUsers, {
          role: "alumno",
          nombre: data.nombre,
          apellido: data.apellido,
          email,
          plainPassword: `Alumno-${token}-${suffix}`,
          moduloName: mod.name,
          moduloSlug: mod.slug,
          moduleCode: mod.code,
          estado: "Aprobado",
          cohortLabel: cohort.label,
          isRecursante: cohort.isRecursante,
          source: "module",
        });
        studentIndex += 1;
      }
    }
  }

  const invalid = validateEmailsCom(seedUsers);
  if (invalid.length) {
    const list = invalid.map((i) => i.document.email).join(", ");
    throw new Error(`Emails invalidos (.com requerido): ${list}`);
  }

  if (persist) {
    await connectMongo();
    await hashPasswords(seedUsers);
    await User.collection.insertMany(seedUsers.map((s) => s.document), { ordered: true });
    await disconnectMongo();
  }

  return seedUsers;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearUsuariosRoles()
    .then(() => console.log("Usuarios por modulo creados."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
