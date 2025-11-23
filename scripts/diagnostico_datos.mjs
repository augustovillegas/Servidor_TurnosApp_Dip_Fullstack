import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.mjs';
import { Assignment } from '../models/Assignment.mjs';

dotenv.config();

async function diagnostico() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    console.log('📊 DIAGNÓSTICO DE DATOS\n');
    
    // Contar usuarios por módulo
    for (let code = 1; code <= 4; code++) {
      const count = await User.countDocuments({ role: 'alumno', moduleCode: code });
      console.log(`Alumnos módulo ${code}: ${count}`);
    }
    
    // Contar asignaciones por módulo
    console.log('\n📝 Asignaciones por módulo:');
    for (let code = 1; code <= 4; code++) {
      const count = await Assignment.countDocuments({ cohorte: code });
      console.log(`Asignaciones módulo ${code}: ${count}`);
    }
    
    // Ver si hay profesores por módulo
    console.log('\n👨‍🏫 Profesores por módulo:');
    for (let code = 1; code <= 4; code++) {
      const prof = await User.findOne({ role: 'profesor', moduleCode: code });
      console.log(`Módulo ${code}: ${prof ? `✅ ${prof.email}` : '❌ No encontrado'}`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnostico();
