/**
 * Generadores reutilizables para crear un entorno de seed completo,
 * sin duplicar logica entre scripts.
 */
import mongoose from "mongoose";
import { User } from "../../models/User.mjs";
import { Assignment } from "../../models/Assignment.mjs";
import { ReviewSlot } from "../../models/ReviewSlot.mjs";
import { Submission } from "../../models/Submission.mjs";
import { MODULES, COHORTS, pad2, slugifyLocal, queueUser, hashPasswords, connectMongo, disconnectMongo } from "./seedUtils.mjs";
import {
  MODULE_PROFESSORS,
  MODULE_STUDENTS,
  SPRINTS,
  SUBMISSION_STATUS_ROTATION,
  TURNOS_CONFIG,
} from "./seedData.mjs";

function nextMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function buildEmail(nombre, apellido, modSlug, role, index) {
  const base = `${slugifyLocal(nombre)}.${slugifyLocal(apellido)}`;
  return `${base}.${modSlug}.${role}.${pad2(index)}@gmail.com`;
}

function buildGithubLink(moduloSlug, sprint, emailLocal) {
  const sprintTag = pad2(sprint);
  return `https://github.com/diplomatura-${moduloSlug}/sprint-${sprintTag}-${emailLocal}`;
}

function buildRenderLink(moduloSlug, sprint, emailLocal) {
  const sprintTag = pad2(sprint);
  return `https://app-${moduloSlug}.render.com/demo/sprint-${sprintTag}/${emailLocal}`;
}

export async function crearUsuariosPorModulo({ persist = true } = {}) {
  const seedUsers = [];

  for (const mod of MODULES) {
    const profesor = MODULE_PROFESSORS[mod.slug];
    if (!profesor) {
      throw new Error(`Falta profesor configurado para el modulo ${mod.slug}`);
    }
    queueUser(seedUsers, {
      rol: "profesor",
      nombre: `${profesor.nombre} ${profesor.apellido}`,
      email: buildEmail(profesor.nombre, profesor.apellido, mod.slug, "prof", 1),
      plainPassword: `Profesor-${mod.slug}-2025`,
      moduloName: mod.name,
      moduloSlug: mod.slug,
      cohorte: mod.cohorte,
      estado: "Aprobado",
      source: "module",
    });

    const students = MODULE_STUDENTS[mod.slug] ?? [];
    if (students.length !== 20) {
      throw new Error(`Se requieren 20 alumnos para ${mod.slug}, se encontraron ${students.length}`);
    }

    let studentIndex = 0;
    for (const cohort of COHORTS) {
      for (let i = 0; i < cohort.count; i += 1) {
        const student = students[studentIndex];
        const suffix = pad2(studentIndex + 1);
        queueUser(seedUsers, {
          rol: "alumno",
          nombre: `${student.nombre} ${student.apellido}`,
          email: buildEmail(student.nombre, student.apellido, mod.slug, "alumno", suffix),
          plainPassword: `Alumno-${mod.slug}-${suffix}`,
          moduloName: mod.name,
          moduloSlug: mod.slug,
          cohorte: mod.cohorte,
          estado: "Aprobado",
          source: "module",
        });
        studentIndex += 1;
      }
    }
  }

  if (persist) {
    const hadConnection = mongoose.connection.readyState !== 0;
    await connectMongo();
    await hashPasswords(seedUsers);
    await User.collection.insertMany(seedUsers.map((s) => s.document), { ordered: true });
    if (!hadConnection) {
      await disconnectMongo();
    }
  }

  return seedUsers;
}

export async function crearAsignaciones({ sprints = SPRINTS } = {}) {
  const hadConnection = mongoose.connection.readyState !== 0;
  await connectMongo();

  await Assignment.deleteMany({});
  const assignmentsByModule = new Map();
  const assignmentDocs = [];
  const baseDate = nextMonday();

  for (const mod of MODULES) {
    const profesor = await User.findOne({ rol: "profesor", modulo: mod.name }).lean();
    if (!profesor) {
      throw new Error(`No hay profesor registrado para ${mod.name}`);
    }

    const moduleAssignments = [];
    sprints.forEach((sprint, idx) => {
      const dueDate = new Date(baseDate);
      dueDate.setDate(baseDate.getDate() + idx * 10 + mod.cohorte);
      dueDate.setHours(18, 0, 0, 0);

      moduleAssignments.push({
        modulo: mod.name,
        title: `Sprint ${sprint} - ${mod.name}`,
        description: `Entrega del sprint ${sprint} para el modulo ${mod.name} con criterios funcionales y presentacion lista.`,
        dueDate,
        cohorte: mod.cohorte,
        createdBy: profesor._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const inserted = await Assignment.insertMany(moduleAssignments, { ordered: true });
    assignmentsByModule.set(mod.slug, inserted);
    assignmentDocs.push(...inserted);
  }

  if (!hadConnection) {
    await disconnectMongo();
  }

  return { assignments: assignmentDocs, assignmentsByModule };
}

export async function crearEntregas(assignmentsByModule, { sprints = SPRINTS } = {}) {
  const hadConnection = mongoose.connection.readyState !== 0;
  await connectMongo();

  await Submission.deleteMany({});
  const submissions = [];

  for (const mod of MODULES) {
    const assignments = assignmentsByModule.get(mod.slug) ?? [];
    if (assignments.length !== sprints.length) {
      throw new Error(`Faltan asignaciones para el modulo ${mod.slug}`);
    }

    const students = await User.find({ rol: "alumno", modulo: mod.name }).sort({ email: 1 }).lean();
    if (!students.length) {
      throw new Error(`No hay alumnos para el modulo ${mod.name}`);
    }

    students.forEach((student, studentIndex) => {
      const emailLocal = String(student.email).split("@")[0];
      sprints.forEach((sprint, sprintIndex) => {
        const rotation = SUBMISSION_STATUS_ROTATION[(studentIndex + sprintIndex) % SUBMISSION_STATUS_ROTATION.length];

        submissions.push({
          assignment: assignments[sprintIndex]._id,
          student: student._id,
          alumnoNombre: student.nombre,
          modulo: mod.name,
          cohorte: student.cohorte,
          sprint,
          githubLink: buildGithubLink(mod.slug, sprint, emailLocal),
          renderLink: buildRenderLink(mod.slug, sprint, emailLocal),
          comentarios: `Sprint ${sprint} - ${rotation.comentario}`,
          reviewStatus: rotation.reviewStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });
  }

  const inserted = await Submission.insertMany(submissions, { ordered: true });

  if (!hadConnection) {
    await disconnectMongo();
  }

  return inserted;
}

export async function crearTurnos({ assignmentsByModule, config = TURNOS_CONFIG } = {}) {
  const hadConnection = mongoose.connection.readyState !== 0;
  await connectMongo();

  await ReviewSlot.deleteMany({});
  const baseDate = nextMonday();
  baseDate.setHours(config.startHour, 0, 0, 0);

  const turnos = [];

  for (const mod of MODULES) {
    for (let reviewNumber = 1; reviewNumber <= config.reviewsPerModule; reviewNumber += 1) {
      for (let slotIndex = 1; slotIndex <= config.slotsPerReview; slotIndex += 1) {
        const start = new Date(baseDate);
        start.setDate(baseDate.getDate() + (reviewNumber - 1) * 7);
        start.setMinutes(start.getMinutes() + (slotIndex - 1) * config.slotDurationMinutes);

        const end = new Date(start);
        end.setMinutes(start.getMinutes() + config.slotDurationMinutes);

        const assignmentList = assignmentsByModule?.get(mod.slug);
        const assignment = assignmentList?.[reviewNumber - 1]?._id ?? null;

        const startTime = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
        const endTime = `${pad2(end.getHours())}:${pad2(end.getMinutes())}`;

        turnos.push({
          assignment,
          cohorte: mod.cohorte,
          modulo: mod.name,
          reviewNumber,
          fecha: start,
          startTime,
          endTime,
          start,
          end,
          sala: slotIndex,
          zoomLink: `https://zoom.us/j/${mod.slug}-${pad2(reviewNumber)}-${pad2(slotIndex)}`,
          student: null,
          approvedByProfessor: false,
          reviewStatus: "A revisar",
          estado: "Disponible",
          comentarios: `Turno disponible para revision ${reviewNumber} de ${mod.name}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  const inserted = await ReviewSlot.insertMany(turnos, { ordered: true });

  if (!hadConnection) {
    await disconnectMongo();
  }

  return inserted;
}

export async function crearAsignacionesYEntregasCompleto(options = {}) {
  const { assignments, assignmentsByModule } = await crearAsignaciones(options);
  const submissions = await crearEntregas(assignmentsByModule, options);
  return {
    assignments: assignments.length,
    submissions: submissions.length,
    assignmentsByModule,
  };
}
