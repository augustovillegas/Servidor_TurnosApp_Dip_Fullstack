import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.mjs';
import { Submission } from '../models/Submission.mjs';
import { User } from '../models/User.mjs';

dotenv.config();

async function verificarCreacion() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    const totalAssignments = await Assignment.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    
    console.log(`📊 Total Asignaciones: ${totalAssignments}`);
    console.log(`📊 Total Entregas: ${totalSubmissions}`);
    
    // Mostrar últimas 3 entregas creadas
    const ultimasEntregas = await Submission.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('student', 'name email')
      .populate('assignment', 'title');
    
    console.log('\n📝 Últimas 3 entregas:');
    ultimasEntregas.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.student?.name} - ${e.assignment?.title} - Sprint ${e.sprint} - ${e.reviewStatus}`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarCreacion();
