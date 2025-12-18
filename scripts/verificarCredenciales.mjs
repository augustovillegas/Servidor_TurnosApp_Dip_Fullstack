import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User.mjs";
import { MODULES } from "./lib/seedUtils.mjs";

dotenv.config();

const SUPERADMINS_ESPERADOS = [
  { email: "admin.seed@gmail.com", rol: "superadmin" },
  { email: "superadmin.diplomatura@gmail.com", rol: "superadmin" },
];

async function verificarCredenciales() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Conectado a MongoDB\n");

    const users = await User.find({}, "email nombre rol status cohorte modulo").lean();
    console.log("RESUMEN GENERAL");
    console.log("-".repeat(50));
    console.log(`Total usuarios: ${users.length}\n`);

    // Por rol
    const byRole = users.reduce((acc, u) => {
      acc[u.rol] = (acc[u.rol] || 0) + 1;
      return acc;
    }, {});
    console.log("Por rol:");
    Object.entries(byRole).forEach(([rol, count]) => console.log(`  ${rol}: ${count}`));

    // Por estado
    const byStatus = users.reduce((acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    }, {});
    console.log("\nPor estado:");
    Object.entries(byStatus).forEach(([status, count]) => console.log(`  ${status}: ${count}`));

    // Superadmins esperados
    console.log("\nSUPERADMINS ESPERADOS");
    console.log("-".repeat(50));
    SUPERADMINS_ESPERADOS.forEach((expected) => {
      const found = users.find((u) => u.email === expected.email);
      if (found) {
        const statusIcon = found.status === "Aprobado" ? "OK" : "WARN";
        console.log(`${statusIcon} ${found.email} | rol: ${found.rol} | estado: ${found.status}`);
      } else {
        console.log(`MISS ${expected.email} - no encontrado`);
      }
    });

    // Profesores por modulo
    console.log("\nPROFESORES POR MODULO");
    console.log("-".repeat(50));
    for (const mod of MODULES) {
      const prof = users.find((u) => u.rol === "profesor" && u.modulo === mod.name);
      console.log(`- ${mod.name}: ${prof ? prof.email : "No encontrado"}`);
    }

    // Alumnos por modulo (cohorte asociado al modulo)
    console.log("\nALUMNOS POR MODULO");
    console.log("-".repeat(50));
    for (const mod of MODULES) {
      const count = users.filter((u) => u.rol === "alumno" && u.cohorte === mod.cohorte).length;
      console.log(`- ${mod.name}: ${count}`);
    }

    await mongoose.disconnect();
    console.log("\nVerificacion completada\n");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

verificarCredenciales();
