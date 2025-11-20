import mongoose from "mongoose";

export const conectarDB = async () => {
  try {
    const uri = process.env.MONGO_URL;
    if (!uri) {
      throw new Error("MONGO_URL no definido en .env");
    }

    const shouldAutoIndex = process.env.NODE_ENV !== "production";
    await mongoose.connect(uri, {
      autoIndex: shouldAutoIndex,
    });
    console.log("Conectado a MongoDB");
  } catch (error) {
    console.error("Error de conexión:", error.message);
    process.exit(1);
  }
};
