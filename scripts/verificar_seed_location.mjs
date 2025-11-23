#!/usr/bin/env node
/**
 * Script de verificación: Asegura que SEED_USERS.md solo existe en logs/docs/
 * y elimina cualquier duplicado en la raíz del proyecto.
 */

import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const rootSeedFile = path.join(projectRoot, 'SEED_USERS.md');
const correctLocation = path.join(projectRoot, 'logs', 'docs', 'SEED_USERS.md');

console.log('🔍 Verificando ubicación de SEED_USERS.md...\n');

// Verificar si existe en la raíz
if (fs.existsSync(rootSeedFile)) {
  console.log('⚠️  Encontrado SEED_USERS.md en la raíz del proyecto');
  console.log('🗑️  Eliminando archivo duplicado...');
  fs.removeSync(rootSeedFile);
  console.log('✅ Archivo eliminado de la raíz\n');
} else {
  console.log('✅ No existe SEED_USERS.md en la raíz\n');
}

// Verificar que existe en la ubicación correcta
if (fs.existsSync(correctLocation)) {
  const stats = fs.statSync(correctLocation);
  console.log('✅ SEED_USERS.md existe en la ubicación correcta:');
  console.log(`   📂 ${path.relative(projectRoot, correctLocation)}`);
  console.log(`   📅 Última modificación: ${stats.mtime.toISOString()}`);
  console.log(`   📏 Tamaño: ${(stats.size / 1024).toFixed(2)} KB\n`);
} else {
  console.log('⚠️  SEED_USERS.md NO existe en logs/docs/');
  console.log('💡 Ejecuta: node scripts/generate_seed_file.mjs\n');
}

console.log('✅ Verificación completada');
