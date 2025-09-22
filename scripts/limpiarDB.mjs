import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.mjs";
import { Assignment } from "../models/Assignment.mjs";
import { ReviewSlot } from "../models/ReviewSlot.mjs";
import { Submission } from "../models/Submission.mjs";

dotenv.config();

export const limpiarDB = async () => {
  await User.deleteMany({});
  await Assignment.deleteMany({});
  await ReviewSlot.deleteMany({});
  await Submission.deleteMany({});
  console.log("🧹 Base de datos limpia.");
};

// 👉 Solo ejecuta la limpieza con process.exit si el archivo se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose
    .connect(process.env.MONGO_URL)
    .then(async () => {
      await limpiarDB();
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Error limpiando DB:", err);
      process.exit(1);
    });
}

