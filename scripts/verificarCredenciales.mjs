import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.mjs';

dotenv.config();

async function verificarCredenciales() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Conectado a MongoDB\n');

    const users = await User.find({}, 'email name role status moduleCode cohorte').lean();
    
    console.log('📊 RESUMEN GENERAL');
    console.log('═'.repeat(50));
    console.log(`Total usuarios: ${users.length}\n`);

    // Por rol
    const byRole = {};
    users.forEach(u => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });
    console.log('Por rol:');
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    // Por estado
    const byStatus = {};
    users.forEach(u => {
      byStatus[u.status] = (byStatus[u.status] || 0) + 1;
    });
    console.log('\nPor estado:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Superadmins
    console.log('\n👑 SUPERADMINS');
    console.log('═'.repeat(50));
    const superadmins = users.filter(u => u.role === 'superadmin');
    if (superadmins.length === 0) {
      console.log('❌ No hay superadmins en la BD');
    } else {
      superadmins.forEach(u => {
        const statusIcon = u.status === 'Aprobado' ? '✅' : '❌';
        console.log(`${statusIcon} ${u.email} | ${u.name}`);
      });
    }

    // Profesores
    console.log('\n👨‍🏫 PROFESORES');
    console.log('═'.repeat(50));
    const profesores = users.filter(u => u.role === 'profesor');
    if (profesores.length === 0) {
      console.log('❌ No hay profesores en la BD');
    } else {
      profesores.forEach(u => {
        const statusIcon = u.status === 'Aprobado' ? '✅' : '❌';
        console.log(`${statusIcon} ${u.email} | ${u.name} | Módulo: ${u.moduleCode || 'N/A'}`);
      });
    }

    // Verificar credenciales del SEED_USERS.md
    console.log('\n🔐 VERIFICACIÓN CREDENCIALES SEED_USERS.md');
    console.log('═'.repeat(50));
    
    const expectedUsers = [
      { email: 'admin.seed@gmail.com', role: 'superadmin', name: 'Admin App' },
      { email: 'superadmin.diplomatura@gmail.com', role: 'superadmin', name: 'Superadmin Diplomatura' },
      { email: 'profesor.general@gmail.com', role: 'profesor', name: 'Profesor AdminApp' },
      { email: 'alumno.general@gmail.com', role: 'alumno', name: 'Alumno AdminApp' },
      { email: 'laura.silva.htmlcss@gmail.com', role: 'profesor', name: 'Laura Silva' },
      { email: 'gabriel.martinez.javascript@gmail.com', role: 'profesor', name: 'Gabriel Martinez' },
      { email: 'paula.costa.node@gmail.com', role: 'profesor', name: 'Paula Costa' },
      { email: 'sergio.ledesma.react@gmail.com', role: 'profesor', name: 'Sergio Ledesma' },
    ];

    expectedUsers.forEach(expected => {
      const found = users.find(u => u.email === expected.email);
      if (found) {
        const statusIcon = found.status === 'Aprobado' ? '✅' : '⚠️';
        const roleMatch = found.role === expected.role ? '✓' : '✗';
        console.log(`${statusIcon} ${expected.email} - Rol: ${roleMatch} ${found.role} - Estado: ${found.status}`);
      } else {
        console.log(`❌ ${expected.email} - NO ENCONTRADO`);
      }
    });

    // Contar alumnos por módulo
    console.log('\n👨‍🎓 ALUMNOS POR MÓDULO');
    console.log('═'.repeat(50));
    const alumnos = users.filter(u => u.role === 'alumno');
    const byModule = {};
    alumnos.forEach(a => {
      const mod = a.moduleCode || 'Sin módulo';
      byModule[mod] = (byModule[mod] || 0) + 1;
    });
    Object.entries(byModule).sort().forEach(([mod, count]) => {
      console.log(`  Módulo ${mod}: ${count} alumnos`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Verificación completada\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarCredenciales();
