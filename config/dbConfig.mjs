import mongoose from "mongoose";


export const conectarDB = async () => {
try {
const uri = process.env.MONGO_URL;
if (!uri) throw new Error("MONGO_URL no definido en .env");
await mongoose.connect(uri, { autoIndex: true });
console.log("✅ Conectado a MongoDB");
} catch (error) {
console.error("❌ Error de conexión:", error.message);
process.exit(1);
}
};