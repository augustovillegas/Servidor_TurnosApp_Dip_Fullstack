#!/usr/bin/env node

/**
 * Script para verificar que el sistema de logging funciona correctamente
 * Ejecutar: node scripts/test-logging.mjs
 */

import request from 'supertest';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🧪 Iniciando pruebas de logging...\n');

const tests = [
  {
    name: 'Test 1: Health Check (debe ver REQUEST_JSON y RESPONSE_JSON)',
    method: 'GET',
    path: '/health',
    body: null,
  },
  {
    name: 'Test 2: Login Fallido (debe ver ERROR_JSON)',
    method: 'POST',
    path: '/auth/login',
    body: {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    },
  },
  {
    name: 'Test 3: Request sin Autenticación (debe ver error 401)',
    method: 'GET',
    path: '/assignments',
    body: null,
  },
];

async function runTests() {
  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('-'.repeat(70));

    try {
      let req = request(BASE_URL)[test.method.toLowerCase()](test.path);

      if (test.body) {
        req = req.send(test.body);
      }

      const res = await req;

      console.log(`✅ Status: ${res.status}`);
      console.log(`✅ Response Time: ${res.duration}ms`);
      console.log(`✅ Body: ${JSON.stringify(res.body, null, 2)}`);
    } catch (error) {
      if (error.status) {
        console.log(`⚠️  Status: ${error.status}`);
        console.log(`⚠️  Response: ${JSON.stringify(error.response?.body, null, 2)}`);
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Pruebas completadas');
  console.log('='.repeat(70));
  console.log('\n📝 INSTRUCCIONES:');
  console.log('1. Ejecuta este script: node scripts/test-logging.mjs');
  console.log('2. En otra terminal, ejecuta: node server.mjs');
  console.log('3. Verifica que en la consola de server.mjs aparezcan:');
  console.log('   - REQUEST_JSON: (para cada request)');
  console.log('   - RESPONSE_JSON: (para cada response)');
  console.log('   - ERROR_JSON: (para errores)');
  console.log('   - ASYNC_ERROR_JSON: (para errores async)');
  console.log('   - UNHANDLED_ERROR_JSON: (para promesas rechazadas)');
  console.log('\n💡 Para parsear logs en JSON:');
  console.log('   grep "ERROR_JSON:" output.log | jq "."');
  console.log('   grep "RESPONSE_JSON:" output.log | jq ".duration"\n');
}

runTests().catch(console.error);
