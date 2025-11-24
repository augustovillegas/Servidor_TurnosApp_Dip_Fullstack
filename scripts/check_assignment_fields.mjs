import dbConfig from '../config/dbConfig.mjs';
import Assignment from '../models/Assignment.mjs';

await dbConfig();

const assigns = await Assignment.find({}).limit(10);

console.log('\n📌 Asignaciones encontradas:');
assigns.forEach(a => {
  console.log(`  ID: ${a._id}`);
  console.log(`  Title: ${a.title}`);
  console.log(`  modulo: ${a.modulo}`);
  console.log(`  cohorte: ${a.cohorte}`);
  console.log('  ---');
});

// Contar por módulo
const byModule = await Assignment.aggregate([
  { $group: { _id: { modulo: '$modulo', cohorte: '$cohorte' }, count: { $sum: 1 } } }
]);

console.log('\n📊 Agrupación por módulo/cohorte:');
console.log(JSON.stringify(byModule, null, 2));

process.exit(0);
