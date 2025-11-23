/**
 * Genera 4 asignaciones por módulo y 4 entregas por alumno (una por sprint).
 * Versión con mejor manejo de errores y logging.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.mjs';
import { Assignment } from '../models/Assignment.mjs';
import { Submission } from '../models/Submission.mjs';

dotenv.config();

const MODULES = [
  { name: "HTML-CSS", slug: "htmlcss", code: 1 },
  { name: "JAVASCRIPT", slug: "javascript", code: 2 },
  { name: "BACKEND - NODE JS", slug: "node", code: 3 },
  { name: "FRONTEND - REACT", slug: "react", code: 4 },
];

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

async function crearAsignacionesYEntregas() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Conectado a MongoDB\n');

    const assignmentsPorModulo = new Map();
    const assignmentDocs = [];

    // Crear asignaciones por módulo
    for (const mod of MODULES) {
      console.log(`\n📚 Procesando módulo: ${mod.name} (code: ${mod.code})`);
      
      let profesor = await User.findOne({
        role: "profesor",
        moduleCode: mod.code
      }).lean();

      if (!profesor) {
        console.error(`❌ No se encontró profesor para módulo ${mod.name}`);
        continue;
      }

      console.log(`  👨‍🏫 Profesor: ${profesor.email}`);

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

      console.log(`  ✅ Creadas ${asignacionesModulo.length} asignaciones`);
      assignmentsPorModulo.set(mod.slug, asignacionesModulo);
    }

    console.log(`\n📊 Total asignaciones creadas: ${assignmentDocs.length}\n`);

    // Crear entregas
    const submissions = [];

    for (const mod of MODULES) {
      console.log(`\n📝 Creando entregas para módulo: ${mod.name}`);
      
      const students = await User.find({ 
        role: "alumno", 
        moduleCode: mod.code 
      })
        .sort({ email: 1 })
        .lean();

      if (!students.length) {
        console.error(`  ⚠️ No hay alumnos para módulo ${mod.name}`);
        continue;
      }

      console.log(`  👨‍🎓 Alumnos encontrados: ${students.length}`);

      const moduleAssignments = assignmentsPorModulo.get(mod.slug) ?? [];
      if (moduleAssignments.length !== SPRINTS.length) {
        console.error(`  ⚠️ No hay suficientes asignaciones para ${mod.name}`);
        continue;
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

      console.log(`  ✅ Preparadas ${students.length * SPRINTS.length} entregas`);
    }

    console.log(`\n💾 Insertando ${submissions.length} entregas...`);
    const insertedSubmissions = await Submission.insertMany(submissions, { ordered: false });
    console.log(`✅ Insertadas ${insertedSubmissions.length} entregas\n`);

    await mongoose.disconnect();

    return {
      assignments: assignmentDocs.length,
      submissions: insertedSubmissions.length,
    };
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    throw error;
  }
}

crearAsignacionesYEntregas()
  .then((resumen) => {
    console.log(`\n✅ COMPLETADO:`);
    console.log(`   Asignaciones creadas: ${resumen.assignments}`);
    console.log(`   Entregas generadas: ${resumen.submissions}\n`);
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n❌ FALLÓ:', e.message);
    process.exit(1);
  });
