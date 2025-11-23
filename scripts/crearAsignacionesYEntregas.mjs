/**
 * Genera 4 asignaciones por modulo y 4 entregas por alumno (una por sprint).
 */
import {
  MODULES,
  connectMongo,
  disconnectMongo,
} from "./lib/seedUtils.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { Submission } from "../models/Submission.mjs";
import { User } from "../models/User.mjs";

const SPRINTS = [1, 2, 3, 4];

const SUBMISSION_STATUS_ROTATION = [
  {
    reviewStatus: "A revisar",
    comentario: "Listo para una nueva revision del profesor.",
  },
  {
    reviewStatus: "Pendiente",
    comentario: "Entrega pendiente de feedback definitivo.",
  },
  {
    reviewStatus: "Aprobado",
    comentario: "Trabajo aprobado con sugerencias menores.",
  },
  {
    reviewStatus: "Desaprobado",
    comentario: "Se requieren ajustes antes de volver a enviar.",
  },
];

function buildGithubLink(moduloSlug, sprint, emailLocal) {
  const sprintTag = String(sprint).padStart(2, "0");
  return `https://github.com/${moduloSlug}-sprint-${sprintTag}/${emailLocal}`;
}

function buildRenderLink(moduloSlug, sprint, emailLocal) {
  const sprintTag = String(sprint).padStart(2, "0");
  return `https://demo.${moduloSlug}.app/sprint-${sprintTag}/${emailLocal}`;
}

export async function crearAsignacionesYEntregas() {
  await connectMongo();

  const assignmentsPorModulo = new Map();
  const assignmentDocs = [];

  for (const mod of MODULES) {
    let profesor = await User.findOne({
      role: "profesor",
      moduleCode: mod.code
    }).lean();

    if (!profesor) {
      throw new Error(`No se encontro profesor para el modulo ${mod.name} (code: ${mod.code})`);
    }

    const asignacionesModulo = [];
    for (const sprint of SPRINTS) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + sprint * 5 + mod.code);

      const asignacion = await Assignment.create({
        modulo: mod.name,
        module: mod.code,
        title: `Sprint ${sprint} - ${mod.name}`,
        description: `Trabajo practico del sprint ${sprint} para el modulo ${mod.name}.`,
        dueDate,
        cohorte: mod.code,
        createdBy: profesor._id,
      });

      asignacionesModulo.push(asignacion);
      assignmentDocs.push(asignacion);
    }

    assignmentsPorModulo.set(mod.slug, asignacionesModulo);
  }

  const submissions = [];

  for (const mod of MODULES) {
    const students = await User.find({ 
      role: "alumno", 
      moduleCode: mod.code 
    })
      .sort({ email: 1 })
      .lean();

    if (!students.length) {
      throw new Error(`No hay alumnos configurados para el modulo ${mod.name} (code: ${mod.code})`);
    }

    const moduleAssignments = assignmentsPorModulo.get(mod.slug) ?? [];
    if (moduleAssignments.length !== SPRINTS.length) {
      throw new Error(`No hay asignaciones suficientes para ${mod.slug}`);
    }

    students.forEach((student, studentIndex) => {
      const emailLocal = String(student.email).split("@")[0];
      SPRINTS.forEach((sprint, sprintIndex) => {
        const rotation =
          SUBMISSION_STATUS_ROTATION[(studentIndex + sprintIndex) % SUBMISSION_STATUS_ROTATION.length];

        submissions.push({
          assignment: moduleAssignments[sprintIndex]._id,
          student: student._id,
          alumnoNombre: student.name || "Alumno",
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

  const insertedSubmissions = await Submission.insertMany(submissions, { ordered: false });

  await disconnectMongo();

  console.log(`✅ Total submissions preparadas: ${submissions.length}`);
  console.log(`✅ Total submissions insertadas: ${insertedSubmissions.length}`);

  return {
    assignments: assignmentDocs.length,
    submissions: insertedSubmissions.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crearAsignacionesYEntregas()
    .then((resumen) => {
      console.log(
        `Asignaciones creadas: ${resumen.assignments} | Entregas generadas: ${resumen.submissions}`
      );
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
