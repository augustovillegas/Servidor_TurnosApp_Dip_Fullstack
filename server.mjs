import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { conectarDB } from "./config/dbConfig.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import submissionRoutes from "./routes/submissionRoutes.mjs";
import assignmentRoutes from "./routes/assignmentRoutes.mjs";
import slotRoutes from "./routes/slotRoutes.mjs";
import usuariosRoutes from "./routes/usuariosRoutes.mjs";
import { errorHandler } from "./middlewares/errorHandler.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.MONGO_URL || !process.env.JWT_SECRET) {
  console.error("MONGO_URL o JWT_SECRET no definidos en .env");
  process.exit(1);
}

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

await conectarDB();

app.use("/usuarios", usuariosRoutes);
app.use("/auth", authRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/submissions", submissionRoutes);
app.use("/slots", slotRoutes);

app.use(errorHandler);

process.on("unhandledRejection", (err) => {
  const unhandledErrorJson = {
    timestamp: new Date().toISOString(),
    type: "UNHANDLED_REJECTION",
    message: err?.message || String(err),
    stack: err?.stack || undefined,
    error: err,
  };
  try {
    console.error("UNHANDLED_ERROR_JSON:", JSON.stringify(unhandledErrorJson));
  } catch (jsonErr) {
    console.error("UNHANDLED_ERROR_JSON_FALLBACK:", unhandledErrorJson);
  }
  process.exit(1);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("##########################");
    console.log("######## API REST ########");
    console.log("##########################");
    console.log(`Servidor listo: http://localhost:${PORT}/`);
  });
}

export default app;
