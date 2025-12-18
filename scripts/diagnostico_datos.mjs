import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { MODULES } from "./lib/seedUtils.mjs";

dotenv.config();

async function diagnostico() {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log("DIAGNOSTICO DE DATOS\n");

    console.log("Alumnos por modulo (cohorte asociado):");
    for (const mod of MODULES) {
      const count = await User.countDocuments({ rol: "alumno", cohorte: mod.cohorte });
      console.log(`- ${mod.name}: ${count}`);
    }

    console.log("\nAsignaciones por modulo:");
    for (const mod of MODULES) {
      const count = await Assignment.countDocuments({ cohorte: mod.cohorte });
      console.log(`- ${mod.name}: ${count}`);
    }

    console.log("\nProfesores por modulo:");
    for (const mod of MODULES) {
      const prof = await User.findOne({ rol: "profesor", cohorte: mod.cohorte });
      console.log(`- ${mod.name}: ${prof ? prof.email : "No encontrado"}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

diagnostico();
