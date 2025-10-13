import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.mjs";

dotenv.config();

const usersToEnsure = [
  {
    name: "Alumno Demo",
    email: "alumno@adminapp.com",
    password: "Alumno#2025",
    role: "alumno",
    cohort: 1,
  },
  {
    name: "Profesor Demo",
    email: "profesor@adminapp.com",
    password: "Profesor#2025",
    role: "profesor",
    cohort: 1,
  },
  {
    name: "Superadmin Demo",
    email: "superadmin@adminapp.com",
    password: "Superadmin#2025",
    role: "superadmin",
    cohort: 1,
  },
];

const main = async () => {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error("No se encontró MONGO_URL en las variables de entorno.");
    process.exit(1);
  }

  await mongoose.connect(uri);

  for (const userData of usersToEnsure) {
    const existing = await User.findOne({ email: userData.email });
    const passwordHash = await bcrypt.hash(userData.password, 10);

    if (existing) {
      existing.name = userData.name;
      existing.passwordHash = passwordHash;
      existing.role = userData.role;
      existing.cohort = userData.cohort;
      existing.isApproved = true;
      existing.status = "Aprobado";
      await existing.save();
      console.log(`Actualizado usuario existente: ${userData.email}`);
    } else {
      await User.create({
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        cohort: userData.cohort,
        isApproved: true,
        status: "Aprobado",
      });
      console.log(`Creado usuario nuevo: ${userData.email}`);
    }
  }

  await mongoose.disconnect();
  console.log("Completado.");
};

main().catch((error) => {
  console.error("Fallo al crear usuarios:", error);
  mongoose.disconnect().finally(() => process.exit(1));
});
