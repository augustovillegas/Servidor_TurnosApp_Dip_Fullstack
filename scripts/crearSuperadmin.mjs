import bcrypt from "bcryptjs";
import userRepository from "../repository/userRepository.mjs";

export const crearSuperadmin = async () => {
  const adminEmail = "admin@app.com";
  const existe = await userRepository.obtenerPorEmail(adminEmail);

  if (!existe) {
    await userRepository.crear({
      name: "Superadmin Manual",
      email: adminEmail,
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "superadmin",
      isApproved: true,
      cohort: 1,
    });
    console.log("✅ Superadmin creado con", adminEmail);
  } else {
    console.log("ℹ️ Ya existe el superadmin:", adminEmail);
  }
};

