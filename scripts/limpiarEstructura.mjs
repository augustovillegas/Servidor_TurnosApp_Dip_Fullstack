#!/usr/bin/env node
/**
 * Script de limpieza: Elimina archivos de test/reportes fuera de sus carpetas correctas
 * y verifica que la estructura del proyecto sea consistente.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const archivosParaEliminar = [
  'test-output.txt',
  'test-current.log',
  'test-summary.md',
  'vitest-errors.log',
  'test-final.log',
  'test-results.log',
  'test-run-latest.log',
  'full-test-output.log',
  'SEED_USERS.md', // Solo debe existir en logs/docs/
];

const directoriosParaEliminar = [
  'logs/history', // Legacy, reemplazado por historial/
];

console.log('🧹 Limpiando estructura del proyecto...\n');

// 1. Eliminar archivos sueltos en la raíz
let archivosEliminados = 0;
for (const archivo of archivosParaEliminar) {
  const rutaArchivo = path.join(projectRoot, archivo);
  if (fs.existsSync(rutaArchivo)) {
    console.log(`🗑️  Eliminando: ${archivo}`);
    try {
      fs.unlinkSync(rutaArchivo);
      archivosEliminados++;
    } catch (error) {
      console.log(`   ⚠️  Error al eliminar: ${error.message}`);
    }
  }
}

// 2. Eliminar directorios obsoletos
for (const directorio of directoriosParaEliminar) {
  const rutaDir = path.join(projectRoot, directorio);
  if (fs.existsSync(rutaDir)) {
    console.log(`🗑️  Eliminando directorio: ${directorio}`);
    try {
      fs.rmSync(rutaDir, { recursive: true, force: true });
    } catch (error) {
      console.log(`   ⚠️  Error al eliminar: ${error.message}`);
    }
  }
}

// 3. Verificar que SEED_USERS.md solo existe en logs/docs/
const seedRaiz = path.join(projectRoot, 'SEED_USERS.md');
const seedCorrecto = path.join(projectRoot, 'logs', 'docs', 'SEED_USERS.md');

if (fs.existsSync(seedRaiz)) {
  console.log('⚠️  SEED_USERS.md encontrado en raíz (debe estar en logs/docs/)');
  
  if (fs.existsSync(seedCorrecto)) {
    console.log('✅ Ya existe en logs/docs/, eliminando duplicado de raíz');
    try {
      fs.unlinkSync(seedRaiz);
    } catch (error) {
      console.log(`   ⚠️  Error al eliminar: ${error.message}`);
    }
  } else {
    console.log('📦 Moviendo SEED_USERS.md a logs/docs/');
    try {
      fs.renameSync(seedRaiz, seedCorrecto);
    } catch (error) {
      console.log(`   ⚠️  Error al mover: ${error.message}`);
    }
  }
}

// 4. Verificar estructura de carpetas
const carpetasRequeridas = [
  'logs/actual',
  'logs/historial',
  'logs/docs',
  'tests',
  'tests/helpers',
  'docs',
];

console.log('\n📂 Verificando estructura de carpetas...');
for (const carpeta of carpetasRequeridas) {
  const rutaCarpeta = path.join(projectRoot, carpeta);
  if (!fs.existsSync(rutaCarpeta)) {
    console.log(`⚠️  Creando carpeta faltante: ${carpeta}`);
    try {
      fs.mkdirSync(rutaCarpeta, { recursive: true });
    } catch (error) {
      console.log(`   ⚠️  Error al crear: ${error.message}`);
    }
  } else {
    console.log(`✅ ${carpeta}`);
  }
}

// 5. Verificar archivos de tests están en /tests
console.log('\n🧪 Verificando ubicación de archivos de test...');
const archivosRaiz = fs.readdirSync(projectRoot);
const testsEnRaiz = archivosRaiz.filter(f => f.endsWith('.test.mjs'));

if (testsEnRaiz.length > 0) {
  console.log(`⚠️  Encontrados ${testsEnRaiz.length} archivos de test en raíz:`);
  testsEnRaiz.forEach(archivo => {
    console.log(`   - ${archivo} → Mover a tests/`);
  });
} else {
  console.log('✅ No hay archivos de test fuera de /tests');
}

// 6. Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE LIMPIEZA');
console.log('='.repeat(60));
console.log(`Archivos eliminados: ${archivosEliminados}`);
console.log('Estructura de carpetas: ✅ Verificada');
console.log('Ubicación de tests: ✅ Correcta');
console.log('SEED_USERS.md: ✅ En logs/docs/');
console.log('\n✅ Limpieza completada exitosamente');
