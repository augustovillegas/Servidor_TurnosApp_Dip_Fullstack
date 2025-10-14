import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { conectarDB } from "./config/dbConfig.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import submissionRoutes from "./routes/submissionRoutes.mjs";
import assignmentRoutes from "./routes/assignmentRoutes.mjs";
import slotRoutes from "./routes/slotRoutes.mjs";
import turnosRoutes from "./routes/turnosRoutes.mjs";
import entregasRoutes from "./routes/entregasRoutes.mjs";
import usuariosRoutes from "./routes/usuariosRoutes.mjs";
import { errorHandler } from "./middlewares/errorHandler.mjs";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validar configuración crítica
if (!process.env.MONGO_URL || !process.env.JWT_SECRET) {
  console.error("❌ MONGO_URL o JWT_SECRET no definidos en .env");
  process.exit(1);
}

// Middlewares globales
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// ───────────────── DB
await conectarDB();

// Rutas
app.use("/turnos", turnosRoutes);
app.use("/entregas", entregasRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/auth", authRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/submissions", submissionRoutes);
app.use("/slots", slotRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Manejar promesas no atrapadas
process.on("unhandledRejection", (err) => {
  console.error("❌ Error no manejado:", err);
  process.exit(1);
});

// ───────────────── Arranque (solo si NO es test)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("##########################");
    console.log("######## API REST ########");
    console.log("##########################");
    console.log(`✅ Servidor OK: http://localhost:${PORT}/`);
  });
}

export default app;
