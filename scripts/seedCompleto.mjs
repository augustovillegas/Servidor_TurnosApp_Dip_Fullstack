/**
 * SEED COMPLETO - Entorno realista persistido en base de datos
 * 
 * Genera:
 * - 1 Superadmin + 4 Profesores (uno por módulo)
 * - 20 Alumnos por módulo (distribuidos en cohortes)
 * - Asignaciones por Sprint (1-5) para cada módulo
 * - Turnos de revisión (5 sprints x 5 turnos = 25 por módulo)
 * - Entregas con estados variados (A revisar, Pendiente, Aprobado, Desaprobado)
 * 
 * Datos realistas:
 * - Nombres y apellidos argentinos
 * - Emails profesionales (@gmail.com)
 * - Estados mezclados (algunos pendientes de aprobación)
 * - Links GitHub y Render funcionales
 */

import mongoose from "mongoose";
import fs from "fs-extra";
import {
  MODULES,
  connectMongo,
  disconnectMongo,
  queueUser,
  hashPasswords,
} from "./lib/seedUtils.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { User } from "../models/User.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
import { Assignment } from "../models/Assignment.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Submission } from "../models/Submission.mjs";

// ============================================================================
// CONFIGURACIÓN DE DATOS REALISTAS
// ============================================================================

const SPRINTS = [1, 2, 3, 4, 5];

// Profesores (uno por módulo)
const PROFESORES = [
  { nombre: "Laura", apellido: "Silva", modulo: "htmlcss" },
  { nombre: "Gabriel", apellido: "Martinez", modulo: "javascript" },
  { nombre: "Paula", apellido: "Costa", modulo: "node" },
  { nombre: "Sergio", apellido: "Ledesma", modulo: "react" },
];

// Alumnos por módulo (nombres argentinos realistas)
const ALUMNOS_POR_MODULO = {
  htmlcss: [
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
  javascript: [
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
  node: [
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
  react: [
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

// Estados de submission rotando
const ESTADOS_SUBMISSION = [
  { reviewStatus: "A revisar", estado: "A revisar", comentario: "Entrega lista para revisión del profesor." },
  { reviewStatus: "Pendiente", estado: "Pendiente", comentario: "Pendiente de correcciones solicitadas." },
  { reviewStatus: "Aprobado", estado: "Aprobado", comentario: "Trabajo aprobado satisfactoriamente." },
  { reviewStatus: "Desaprobado", estado: "Desaprobado", comentario: "Requiere rehacer aspectos fundamentales." },
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".");
}

// ============================================================================
// LIMPIEZA TOTAL
// ============================================================================

async function limpiarBaseDatos() {
  console.log("\n🧹 Limpiando base de datos...");
  await User.deleteMany({});
  await Assignment.deleteMany({});
  await ReviewSlot.deleteMany({});
  await Submission.deleteMany({});
  console.log("✅ Base de datos limpia\n");
}

// ============================================================================
// CREACIÓN DE USUARIOS
// ============================================================================

async function crearUsuarios() {
  console.log("👥 Creando usuarios...");
  const seedUsers = [];

  // 1. SUPERADMIN
  queueUser(seedUsers, {
    role: "superadmin",
    nombre: "Admin",
    apellido: "Sistema",
    email: "admin@gmail.com",
    plainPassword: "admin123",
    moduloName: "HTML-CSS",
    moduloSlug: "",
    moduleCode: 1, // Mínimo 1 requerido por schema
    cohorte: 1,
    cohort: 1,
    cohortLabel: "-",
    estado: "Aprobado",
    source: "base",
  });

  // 2. PROFESORES (uno por módulo)
  for (const profData of PROFESORES) {
    const modulo = MODULES.find((m) => m.slug === profData.modulo);
    const email = `${slugify(profData.nombre)}.${slugify(profData.apellido)}@gmail.com`;
    
    queueUser(seedUsers, {
      role: "profesor",
      nombre: profData.nombre,
      apellido: profData.apellido,
      email,
      plainPassword: `Profesor${modulo.code}2025`,
      moduloName: modulo.name,
      moduloSlug: modulo.slug,
      moduleCode: modulo.code,
      cohorte: modulo.code,
      cohort: modulo.code,
      cohortLabel: "2025-Q4",
      estado: "Aprobado",
      source: "module",
    });
  }

  // 3. ALUMNOS (20 por módulo con estados variados)
  for (const modulo of MODULES) {
    const alumnos = ALUMNOS_POR_MODULO[modulo.slug];
    
    for (let i = 0; i < alumnos.length; i++) {
      const alumno = alumnos[i];
      const index = String(i + 1).padStart(2, "0");
      const email = `${slugify(alumno.nombre)}.${slugify(alumno.apellido)}.${index}@gmail.com`;
      
      // Algunos pendientes de aprobación (índices 5, 10, 15, 20)
      const esPendiente = (i + 1) % 5 === 0;
      
      queueUser(seedUsers, {
        role: "alumno",
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        email,
        plainPassword: `Alumno${index}`,
        moduloName: modulo.name,
        moduloSlug: modulo.slug,
        moduleCode: modulo.code,
        cohorte: modulo.code,
        cohort: modulo.code,
        cohortLabel: "2025-Q4",
        estado: esPendiente ? "Pendiente" : "Aprobado",
        source: "module",
      });
    }
  }

  // Hash de contraseñas
  await hashPasswords(seedUsers);
  
  // Insertar en BD
  const documents = seedUsers.map((s) => s.document);
  await User.insertMany(documents);
  
  console.log(`✅ ${documents.length} usuarios creados (1 superadmin + 4 profesores + 80 alumnos)\n`);
  
  return seedUsers;
}

// ============================================================================
// CREACIÓN DE ASIGNACIONES (5 SPRINTS POR MÓDULO)
// ============================================================================

async function crearAsignaciones() {
  console.log("📋 Creando asignaciones...");
  const asignaciones = [];
  const asignacionesPorModulo = new Map();

  for (const modulo of MODULES) {
    const profesor = await User.findOne({ role: "profesor", cohorte: modulo.code });
    if (!profesor) throw new Error(`No se encontró profesor para ${modulo.name}`);

    const asignacionesModulo = [];
    
    for (const sprint of SPRINTS) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (sprint * 14)); // 2 semanas por sprint

      const asignacion = {
        cohorte: modulo.code,
        modulo: modulo.name,
        title: `Sprint ${sprint} - ${modulo.name}`,
        description: `Trabajo práctico integrador del Sprint ${sprint}. Desarrollo de proyecto completo aplicando conceptos del módulo ${modulo.name}.`,
        dueDate,
        createdBy: profesor._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asignaciones.push(asignacion);
      asignacionesModulo.push(asignacion);
    }

    asignacionesPorModulo.set(modulo.slug, asignacionesModulo);
  }

  const insertadas = await Assignment.insertMany(asignaciones);
  
  // Actualizar referencias con IDs reales
  for (const modulo of MODULES) {
    const asignacionesDB = await Assignment.find({ cohorte: modulo.code }).sort({ title: 1 });
    asignacionesPorModulo.set(modulo.slug, asignacionesDB);
  }

  console.log(`✅ ${insertadas.length} asignaciones creadas (5 sprints x 4 módulos)\n`);
  
  return asignacionesPorModulo;
}

// ============================================================================
// CREACIÓN DE TURNOS DE REVISIÓN (5 SPRINTS x 5 TURNOS = 25 POR MÓDULO)
// ============================================================================

async function crearTurnos() {
  console.log("⏰ Creando turnos de revisión...");
  const turnos = [];
  const baseDate = new Date();

  for (const modulo of MODULES) {
    for (const sprint of SPRINTS) {
      for (let turno = 1; turno <= 5; turno++) {
        const slotDate = new Date(baseDate);
        slotDate.setDate(slotDate.getDate() + (sprint * 14) + turno);
        slotDate.setHours(10 + Math.floor((turno - 1) * 0.5), ((turno - 1) % 2) * 30, 0, 0);

        const endDate = new Date(slotDate);
        endDate.setMinutes(endDate.getMinutes() + 30);

        const startTime = `${String(slotDate.getHours()).padStart(2, "0")}:${String(slotDate.getMinutes()).padStart(2, "0")}`;
        const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

        turnos.push({
          cohorte: modulo.code,
          cohort: modulo.code,
          reviewNumber: sprint,
          date: slotDate,
          startTime,
          endTime,
          start: slotDate,
          end: endDate,
          room: turno,
          zoomLink: `https://zoom.us/j/${modulo.code}${String(sprint).padStart(2, "0")}${String(turno).padStart(2, "0")}`,
          estado: "Disponible",
          reviewStatus: "A revisar",
          comentarios: `Turno disponible para Sprint ${sprint} - ${modulo.name}`,
          assignment: null,
          student: null,
          approvedByProfessor: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  const insertados = await ReviewSlot.insertMany(turnos);
  console.log(`✅ ${insertados.length} turnos creados (5 sprints x 5 turnos x 4 módulos)\n`);
  
  return insertados;
}

// ============================================================================
// CREACIÓN DE ENTREGAS (CON ESTADOS VARIADOS)
// ============================================================================

async function crearEntregas(asignacionesPorModulo) {
  console.log("📤 Creando entregas de alumnos...");
  const entregas = [];

  for (const modulo of MODULES) {
    const alumnos = await User.find({ 
      role: "alumno", 
      cohorte: modulo.code,
      isApproved: true // Solo alumnos aprobados tienen entregas
    }).sort({ email: 1 });

    const asignaciones = asignacionesPorModulo.get(modulo.slug);
    if (!asignaciones || asignaciones.length !== SPRINTS.length) {
      throw new Error(`Faltan asignaciones para ${modulo.slug}`);
    }

    for (let i = 0; i < alumnos.length; i++) {
      const alumno = alumnos[i];
      const emailLocal = alumno.email.split("@")[0];

      // Cada alumno tiene entregas para diferentes sprints (no todos completos)
      const sprintsConEntrega = i % 2 === 0 
        ? [1, 2, 3, 4, 5] // Pares: todos los sprints
        : [1, 2, 3]; // Impares: solo primeros 3 sprints

      for (const sprintNum of sprintsConEntrega) {
        const asignacion = asignaciones[sprintNum - 1];
        const estadoIndex = (i + sprintNum) % ESTADOS_SUBMISSION.length;
        const estado = ESTADOS_SUBMISSION[estadoIndex];

        entregas.push({
          assignment: asignacion._id,
          student: alumno._id,
          alumnoNombre: `${alumno.nombre} ${alumno.apellido}`,
          sprint: sprintNum,
          modulo: modulo.name,
          githubLink: `https://github.com/${emailLocal}/sprint-${String(sprintNum).padStart(2, "0")}`,
          renderLink: `https://${emailLocal}-sprint${sprintNum}.netlify.app`,
          comentarios: `Sprint ${sprintNum} - ${estado.comentario}`,
          reviewStatus: estado.reviewStatus,
          estado: estado.estado,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  const insertadas = await Submission.insertMany(entregas);
  console.log(`✅ ${insertadas.length} entregas creadas con estados variados\n`);
  
  return insertadas;
}

// ============================================================================
// GENERACIÓN DE SEED_USERS.md
// ============================================================================

async function generarSeedUsers() {
  console.log("📝 Generando SEED_USERS.md...");
  
  const usuarios = await User.find({}).sort({ role: 1, cohort: 1, email: 1 });
  
  let markdown = `# 🔐 CREDENCIALES DE ACCESO - Diplomatura Full Stack\n\n`;
  markdown += `**Fecha de generación**: ${new Date().toLocaleString("es-AR")}\n\n`;
  markdown += `> Utiliza el **email** como usuario y la **contraseña** correspondiente para iniciar sesión.\n\n`;
  markdown += `---\n\n`;

  // SUPERADMIN
  markdown += `## 👑 SUPERADMIN\n\n`;
  markdown += `| Nombre | Email | Contraseña | Estado |\n`;
  markdown += `|--------|-------|------------|--------|\n`;
  const superadmin = usuarios.find(u => u.role === "superadmin");
  if (superadmin) {
    markdown += `| ${superadmin.nombre} ${superadmin.apellido} | ${superadmin.email} | admin123 | ${superadmin.status} |\n\n`;
  }

  // PROFESORES
  markdown += `## 👨‍🏫 PROFESORES (por módulo)\n\n`;
  markdown += `| Módulo | Nombre | Email | Contraseña | Estado |\n`;
  markdown += `|--------|--------|-------|------------|--------|\n`;
  
  for (const modulo of MODULES) {
    const profesor = usuarios.find(u => u.role === "profesor" && u.cohort === modulo.code);
    if (profesor) {
      markdown += `| ${modulo.name} | ${profesor.nombre} ${profesor.apellido} | ${profesor.email} | Profesor${modulo.code}2025 | ${profesor.status} |\n`;
    }
  }
  markdown += `\n`;

  // ALUMNOS POR MÓDULO
  for (const modulo of MODULES) {
    markdown += `## 👨‍🎓 ALUMNOS - ${modulo.name}\n\n`;
    markdown += `| # | Nombre | Email | Contraseña | Estado |\n`;
    markdown += `|---|--------|-------|------------|--------|\n`;
    
    const alumnos = usuarios.filter(u => u.role === "alumno" && u.cohort === modulo.code);
    alumnos.forEach((alumno, index) => {
      const num = String(index + 1).padStart(2, "0");
      const pass = `Alumno${num}`;
      markdown += `| ${num} | ${alumno.nombre} ${alumno.apellido} | ${alumno.email} | ${pass} | ${alumno.status} |\n`;
    });
    markdown += `\n`;
  }

  // Resumen
  markdown += `---\n\n`;
  markdown += `## 📊 RESUMEN\n\n`;
  markdown += `- **Total usuarios**: ${usuarios.length}\n`;
  markdown += `- **Superadmins**: 1\n`;
  markdown += `- **Profesores**: 4 (uno por módulo)\n`;
  markdown += `- **Alumnos**: 80 (20 por módulo)\n`;
  markdown += `- **Usuarios aprobados**: ${usuarios.filter(u => u.isApproved).length}\n`;
  markdown += `- **Usuarios pendientes**: ${usuarios.filter(u => !u.isApproved).length}\n\n`;

  const seedPath = path.join(projectRoot, "logs", "docs", "SEED_USERS.md");
  await fs.outputFile(seedPath, markdown, "utf-8");
  console.log("✅ SEED_USERS.md generado en logs/docs/\n");
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function ejecutarSeedCompleto() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 INICIANDO SEED COMPLETO - Entorno Realista Persistido");
  console.log("=".repeat(70) + "\n");

  try {
    await connectMongo();
    console.log("✅ Conectado a MongoDB\n");

    await limpiarBaseDatos();
    await crearUsuarios();
    const asignacionesPorModulo = await crearAsignaciones();
    await crearTurnos();
    await crearEntregas(asignacionesPorModulo);
    await generarSeedUsers();

    console.log("=".repeat(70));
    console.log("✅ SEED COMPLETO FINALIZADO EXITOSAMENTE");
    console.log("=".repeat(70) + "\n");

    // Resumen final
    const stats = {
      usuarios: await User.countDocuments(),
      asignaciones: await Assignment.countDocuments(),
      turnos: await ReviewSlot.countDocuments(),
      entregas: await Submission.countDocuments(),
    };

    console.log("📊 DATOS PERSISTIDOS EN BASE DE DATOS:");
    console.log(`   - Usuarios: ${stats.usuarios}`);
    console.log(`   - Asignaciones: ${stats.asignaciones}`);
    console.log(`   - Turnos: ${stats.turnos}`);
    console.log(`   - Entregas: ${stats.entregas}\n`);

    await disconnectMongo();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR EN SEED:", error);
    await disconnectMongo();
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarSeedCompleto();
}

export { ejecutarSeedCompleto };
