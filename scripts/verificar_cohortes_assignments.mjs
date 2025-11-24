import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import "../config/dbConfig.mjs";
import { Assignment } from "../models/Assignment.mjs";

async function verificarCohortes() {
  try {
    // Esperar a que la conexión esté lista
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) resolve();
      else mongoose.connection.once("open", resolve);
    });

    console.log("✅ Conectado a MongoDB\n");

    // Verificar módulos 3 y 4
    const m3 = await Assignment.find({ cohorte: 3 })
      .select("title modulo cohorte")
      .limit(3);
    const m4 = await Assignment.find({ cohorte: 4 })
      .select("title modulo cohorte")
      .limit(3);

    console.log("📊 Módulo 3 (BACKEND-NODE):", m3.length, "asignaciones");
    if (m3.length > 0) {
      console.log("Ejemplo:", JSON.stringify(m3[0], null, 2));
    }

    console.log("\n📊 Módulo 4 (FRONTEND-REACT):", m4.length, "asignaciones");
    if (m4.length > 0) {
      console.log("Ejemplo:", JSON.stringify(m4[0], null, 2));
    }

    // Contar por cohorte
    const counts = await Assignment.aggregate([
      { $group: { _id: "$cohorte", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log("\n📈 Distribución por cohorte:");
    counts.forEach((c) => console.log(`  Cohorte ${c._id}: ${c.count} assigns`));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verificarCohortes();
