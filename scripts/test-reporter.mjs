/**
 * 📊 TEST REPORTER - Sistema Consolidado de Reportes QA
 * 
 * Estrategia de Reportes:
 * 1. REPORTE_GLOBAL.md: Estado más reciente (OVERWRITE)
 * 2. REPORTE_DIARIO.md: Historial del día (PREPEND nueva ejecución)
 * 3. logs/historial/: Archivos REPORTE_DIARIO de días anteriores
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '../logs');
const ACTUAL_DIR = path.join(LOGS_DIR, 'actual');
const REPORTE_GLOBAL = path.join(ACTUAL_DIR, 'REPORTE_GLOBAL.md');
const REPORTE_DIARIO = path.join(ACTUAL_DIR, 'REPORTE_DIARIO.md');
const HISTORIAL_DIR = path.join(LOGS_DIR, 'historial');

// Crear directorios si no existen
if (!fs.existsSync(ACTUAL_DIR)) {
  fs.mkdirSync(ACTUAL_DIR, { recursive: true });
}
if (!fs.existsSync(HISTORIAL_DIR)) {
  fs.mkdirSync(HISTORIAL_DIR, { recursive: true });
}

/**
 * Obtiene fecha en formato DD/MM/YYYY
 */
function getFechaFormato() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Obtiene fecha en formato YYYYMMDD para comparación
 */
function getFechaISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Obtiene hora en formato HH:MM:SS
 */
function getHoraFormato() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Remueve códigos ANSI de una cadena
 */
function stripAnsi(str) {
  return str.replace(/\u001b\[[\d;]*m/g, '').replace(/\u001b\[[^m]*m/g, '');
}

/**
 * Parsea la salida de Vitest y extrae métricas
 */
function parseTestOutput(output) {
  const cleanOutput = stripAnsi(output);
  
  const metrics = {
    fecha: getFechaFormato(),
    hora: getHoraFormato(),
    totalFiles: 0,
    passedFiles: 0,
    failedFiles: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    duration: '0s',
    failures: [],
    successRate: 0
  };

  // Extraer conteo de archivos
  const filesMatch = cleanOutput.match(/Test Files\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (filesMatch) {
    metrics.failedFiles = parseInt(filesMatch[1]) || 0;
    metrics.passedFiles = parseInt(filesMatch[2]) || 0;
    metrics.totalFiles = parseInt(filesMatch[3]) || 0;
  } else {
    const passOnlyMatch = cleanOutput.match(/Test Files\s+(\d+)\s+passed\s+\((\d+)\)/);
    if (passOnlyMatch) {
      metrics.passedFiles = parseInt(passOnlyMatch[1]) || 0;
      metrics.totalFiles = parseInt(passOnlyMatch[2]) || 0;
      metrics.failedFiles = 0;
    }
  }

  // Extraer conteo de tests
  const testsMatch = cleanOutput.match(/Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (testsMatch) {
    metrics.failedTests = parseInt(testsMatch[1]) || 0;
    metrics.passedTests = parseInt(testsMatch[2]) || 0;
    metrics.totalTests = parseInt(testsMatch[3]) || 0;
  } else {
    const passOnlyTestsMatch = cleanOutput.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
    if (passOnlyTestsMatch) {
      metrics.passedTests = parseInt(passOnlyTestsMatch[1]) || 0;
      metrics.totalTests = parseInt(passOnlyTestsMatch[2]) || 0;
      metrics.failedTests = 0;
    }
  }

  // Extraer duración
  const durationMatch = cleanOutput.match(/Duration\s+([\d.]+[smh]+)/);
  if (durationMatch) {
    metrics.duration = durationMatch[1];
  }

  // Extraer fallos individuales
  const failPattern = /FAIL\s+(tests\/[\w\-./]+)\s+>\s+(.+)/g;
  let match;
  while ((match = failPattern.exec(cleanOutput)) !== null) {
    metrics.failures.push({
      file: match[1],
      test: match[2].trim()
    });
  }

  // Calcular success rate
  metrics.successRate = metrics.totalTests > 0 
    ? Math.round((metrics.passedTests / metrics.totalTests) * 100) 
    : 100;

  return metrics;
}

/**
 * Genera el REPORTE GLOBAL (sobreescribe siempre)
 */
function generarReporteGlobal(metrics) {
  const estado = metrics.failedTests === 0 ? '✅ TODOS LOS TESTS PASANDO' : `⚠️ ${metrics.failedTests} TESTS FALLANDO`;
  const emoji = metrics.failedTests === 0 ? '🎉' : '🔧';
  
  let contenido = `# 📊 REPORTE GLOBAL DE ESTADO
## 🕒 Última Ejecución: ${metrics.fecha} a las ${metrics.hora}

**ESTADO GLOBAL:** ${estado} ${emoji}  
**Tests Pasando:** ${metrics.passedTests}/${metrics.totalTests} (${metrics.successRate}%)  
**Duración:** ${metrics.duration}

---

`;

  // Sección de fallos críticos
  if (metrics.failures.length > 0) {
    contenido += `## ❌ Fallos Críticos Pendientes (Foco de Trabajo)\n\n`;
    contenido += `**Total de Fallos:** ${metrics.failures.length}\n\n`;
    
    metrics.failures.forEach((failure, index) => {
      contenido += `### ${index + 1}. ${failure.file}\n`;
      contenido += `- **Test:** ${failure.test}\n\n`;
    });
  } else {
    contenido += `## ✅ Sin Fallos Detectados\n\n`;
    contenido += `¡Excelente! Todos los tests están pasando correctamente.\n\n`;
  }

  // Resumen detallado por componente
  contenido += `---

## 📈 Resumen Detallado por Componente

| Métrica | Valor |
|---------|-------|
| **Test Files** | ${metrics.passedFiles}/${metrics.totalFiles} pasando |
| **Test Cases** | ${metrics.passedTests}/${metrics.totalTests} pasando |
| **Success Rate** | ${metrics.successRate}% |
| **Archivos Fallando** | ${metrics.failedFiles} |
| **Tests Fallando** | ${metrics.failedTests} |
| **Duración Total** | ${metrics.duration} |

---

## 🎯 Próximos Pasos Recomendados

`;

  if (metrics.failedTests > 0) {
    contenido += `1. **Prioridad ALTA**: Revisar los ${metrics.failures.length} tests fallando listados arriba\n`;
    contenido += `2. **Debug**: Ejecutar tests individuales con \`npm run test:quick\`\n`;
    contenido += `3. **Logs**: Consultar \`REPORTE_DIARIO.md\` para historial del día\n`;
  } else {
    contenido += `1. ✅ Mantener cobertura de tests actualizada\n`;
    contenido += `2. ✅ Considerar agregar más casos edge\n`;
    contenido += `3. ✅ Revisar performance de tests lentos\n`;
  }

  contenido += `\n---\n\n*Generado automáticamente el ${metrics.fecha} a las ${metrics.hora}*\n`;

  return contenido;
}

/**
 * Consolida el historial diario (prepend nueva ejecución)
 */
function consolidarHistorialDiario(metrics, reporteGlobal) {
  const fecha = metrics.fecha;
  const hora = metrics.hora;
  const resultado = metrics.failedTests === 0 ? '✅' : '⚠️';
  
  const nuevoBloque = `
---

## ➡️ EJECUCIÓN: ${fecha.split('/').slice(0, 2).join('/')} - ${hora}

**Resultado:** ${resultado} ${metrics.passedTests}/${metrics.totalTests} tests pasando (${metrics.successRate}%)  
**Duración:** ${metrics.duration}

### Detalle de la Ejecución

${reporteGlobal}

`;

  if (fs.existsSync(REPORTE_DIARIO)) {
    // Leer contenido existente
    const contenidoExistente = fs.readFileSync(REPORTE_DIARIO, 'utf8');
    
    // Verificar si es del mismo día
    const fechaHoy = getFechaISO();
    const fechaContenido = extraerFechaDelReporte(contenidoExistente);
    
    if (fechaContenido && fechaContenido !== fechaHoy) {
      // Es de otro día, archivarlo primero
      archivarReporteDiarioAnterior(contenidoExistente, fechaContenido);
      // Crear nuevo reporte diario
      const encabezado = `# 📑 HISTORIAL CONSOLIDADO DEL DÍA\n**Fecha:** ${fecha}\n\n`;
      fs.writeFileSync(REPORTE_DIARIO, encabezado + nuevoBloque, 'utf8');
    } else {
      // Mismo día, añadir al inicio (prepend)
      fs.writeFileSync(REPORTE_DIARIO, nuevoBloque + contenidoExistente, 'utf8');
    }
  } else {
    // No existe, crear con encabezado
    const encabezado = `# 📑 HISTORIAL CONSOLIDADO DEL DÍA\n**Fecha:** ${fecha}\n\n`;
    fs.writeFileSync(REPORTE_DIARIO, encabezado + nuevoBloque, 'utf8');
  }
}

/**
 * Extrae la fecha del contenido del reporte (formato YYYYMMDD)
 */
function extraerFechaDelReporte(contenido) {
  const match = contenido.match(/\*\*Fecha:\*\*\s+(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}${match[2]}${match[1]}`; // YYYYMMDD
  }
  return null;
}

/**
 * Archiva el reporte diario anterior en historial/
 */
function archivarReporteDiarioAnterior(contenido, fechaContenido) {
  const nuevoNombre = `REPORTE_DIARIO_${fechaContenido}.md`;
  const rutaDestino = path.join(HISTORIAL_DIR, nuevoNombre);
  
  fs.writeFileSync(rutaDestino, contenido, 'utf8');
  console.log(`📦 Archivado: historial/${nuevoNombre}`);
}

/**
 * Limpia archivos obsoletos del sistema anterior
 */
function limpiarArchivosObsoletos() {
  // Eliminar test-summary.md si existe (sistema anterior)
  const oldSummary = path.join(LOGS_DIR, 'test-summary.md');
  if (fs.existsSync(oldSummary)) {
    fs.unlinkSync(oldSummary);
  }
  
  // Eliminar test-current.log si existe (sistema anterior)
  const oldCurrent = path.join(LOGS_DIR, 'test-current.log');
  if (fs.existsSync(oldCurrent)) {
    fs.unlinkSync(oldCurrent);
  }
  
  // Mover archivos de history/ a historial/ si existen
  const oldHistory = path.join(LOGS_DIR, 'history');
  if (fs.existsSync(oldHistory)) {
    const archivos = fs.readdirSync(oldHistory);
    archivos.forEach(archivo => {
      if (archivo.endsWith('.log')) {
        const rutaOrigen = path.join(oldHistory, archivo);
        const rutaDestino = path.join(HISTORIAL_DIR, archivo.replace('.log', '.md'));
        fs.renameSync(rutaOrigen, rutaDestino);
      }
    });
    // Eliminar directorio history/ vacío
    const remainingFiles = fs.readdirSync(oldHistory);
    if (remainingFiles.length === 0 || (remainingFiles.length === 1 && remainingFiles[0] === 'README.md')) {
      // Mantener README si existe
      if (remainingFiles.includes('README.md')) {
        fs.renameSync(path.join(oldHistory, 'README.md'), path.join(HISTORIAL_DIR, 'README_LEGACY.md'));
      }
      fs.rmdirSync(oldHistory, { recursive: true });
    }
  }
}

/**
 * Procesa la entrada de stdin
 */
function processInput() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
    process.stdout.write(chunk); // Pass through para ver output en tiempo real
  });

  process.stdin.on('end', () => {
    try {
      // Limpiar archivos obsoletos del sistema anterior
      limpiarArchivosObsoletos();
      
      // Parsear resultados
      const metrics = parseTestOutput(data);
      
      // PASO 1: Generar REPORTE GLOBAL (sobreescribe)
      const reporteGlobal = generarReporteGlobal(metrics);
      fs.writeFileSync(REPORTE_GLOBAL, reporteGlobal, 'utf8');
      
      // PASO 2: Consolidar HISTORIAL DIARIO (prepend)
      consolidarHistorialDiario(metrics, reporteGlobal);
      
      // Mensaje de confirmación
      console.log(`\n\n✅ Reportes generados exitosamente:`);
      console.log(`   📄 REPORTE_GLOBAL.md: Estado actual (${metrics.passedTests}/${metrics.totalTests} tests)`);
      console.log(`   📚 REPORTE_DIARIO.md: Historial del día ${metrics.fecha}`);
      console.log(`   📦 historial/: Reportes de días anteriores`);
      
    } catch (error) {
      console.error('❌ Error generando reportes:', error);
      process.exit(1);
    }
  });
}

// Ejecutar
processInput();
