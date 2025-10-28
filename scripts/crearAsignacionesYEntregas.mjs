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
    estado: "A revisar",
    comentario: "Listo para una nueva revision del profesor.",
  },
  {
    reviewStatus: "pendiente",
    estado: "Pendiente",
    comentario: "Entrega pendiente de feedback definitivo.",
  },
  {
    reviewStatus: "Aprobado",
    estado: "Aprobado",
    comentario: "Trabajo aprobado con sugerencias menores.",
  },
  {
    reviewStatus: "Desaprobado",
    estado: "Desaprobado",
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
      email: { $regex: `\\.${mod.slug}\\.`, $options: "i" },
    }).lean();

    if (!profesor) {
      profesor = await User.findOne({ role: "profesor", moduloSlug: mod.slug }).lean();
    }

    if (!profesor) {
      throw new Error(`No se encontro profesor para el modulo ${mod.slug}`);
    }

    const asignacionesModulo = [];
    for (const sprint of SPRINTS) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + sprint * 5 + mod.code);

      const asignacion = await Assignment.create({
        module: mod.code,
        title: `Sprint ${sprint} - ${mod.name}`,
        description: `Trabajo practico del sprint ${sprint} para el modulo ${mod.name}.`,
        dueDate,
        cohort: mod.code,
        createdBy: profesor._id,
      });

      asignacionesModulo.push(asignacion);
      assignmentDocs.push(asignacion);
    }

    assignmentsPorModulo.set(mod.slug, asignacionesModulo);
  }

  const submissions = [];

  for (const mod of MODULES) {
    const students = await User.find({ role: "alumno", moduloSlug: mod.slug })
      .sort({ email: 1 })
      .lean();

    if (!students.length) {
      throw new Error(`No hay alumnos configurados para el modulo ${mod.slug}`);
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
          alumnoNombre: `${student.nombre} ${student.apellido}`.trim(),
          sprint,
          module: mod.name,
          githubLink: buildGithubLink(mod.slug, sprint, emailLocal),
          renderLink: buildRenderLink(mod.slug, sprint, emailLocal),
          comentarios: `Sprint ${sprint} - ${rotation.comentario}`,
          reviewStatus: rotation.reviewStatus,
          estado: rotation.estado,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });
  }

  const insertedSubmissions = await Submission.insertMany(submissions, { ordered: true });

  await disconnectMongo();

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
