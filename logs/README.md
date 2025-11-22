# 📊 Sistema Consolidado de Reportes QA

Este directorio contiene el sistema unificado de tracking y reporting de tests.

## 📁 Estructura

```
logs/
├── actual/                 # 🟢 Sesión activa (reportes en tiempo real)
│   ├── README.md
│   ├── REPORTE_GLOBAL.md       # Estado actual (se sobreescribe)
│   └── REPORTE_DIARIO.md       # Historial del día (se prepend)
├── historial/              # 📦 Archivo de días anteriores
│   ├── README.md
│   └── REPORTE_DIARIO_YYYYMMDD.md
└── docs/                   # 📚 Documentación técnica del sistema de reportes
    ├── SEED_USERS.md
    └── IMPLEMENTACION_SISTEMA_CONSOLIDADO.md
```

## 🎯 Archivos Principales

### 📁 actual/
**Propósito**: Reportes de la sesión de trabajo actual (hoy)  
**Contenido**:
- `REPORTE_GLOBAL.md` - Estado más reciente
- `REPORTE_DIARIO.md` - Historial de ejecuciones del día

#### REPORTE_GLOBAL.md
**Actualización**: Se SOBREESCRIBE en cada ejecución  
**Contenido**:
- Estado global (tests pasando/fallando)
- Lista de fallos críticos pendientes
- Métricas detalladas (success rate, duración, etc.)
- Recomendaciones de próximos pasos

**¿Cuándo consultarlo?**
- Al iniciar el día de trabajo
- Después de ejecutar `npm test`
- Para ver el estado actual sin ruido histórico
- **Ruta**: `logs/actual/REPORTE_GLOBAL.md`

#### REPORTE_DIARIO.md
**Actualización**: Se AÑADE AL INICIO (prepend) cada nueva ejecución  
**Contenido**:
- Bloques de ejecución ordenados de más reciente a más antiguo
- Cada bloque contiene: timestamp, resultado, métricas, detalle completo

**¿Cuándo consultarlo?**
- Para comparar regresiones durante el día
- Para ver la evolución de fixes aplicados
- Para auditoría de actividad de testing
- **Ruta**: `logs/actual/REPORTE_DIARIO.md`

### 📁 historial/
**Propósito**: Archivo histórico de días anteriores  
**Comportamiento**: 
- Al cambiar de día, `REPORTE_DIARIO.md` se mueve automáticamente aquí
- Se renombra a `REPORTE_DIARIO_YYYYMMDD.md`
- Permite comparar tendencias semanales/mensuales

**¿Cuándo consultarlo?**
- Para análisis de tendencias a largo plazo
- Para comparar con sprints anteriores
- Para métricas de estabilidad del proyecto
- **Ruta**: `logs/historial/REPORTE_DIARIO_YYYYMMDD.md`

### 📁 docs/
**Propósito**: Documentación técnica del sistema de reportes (versionada en Git)  
**Contenido**:
- `SEED_USERS.md` - Documentación de seeds de usuarios para tests
- `IMPLEMENTACION_SISTEMA_CONSOLIDADO.md` - Sistema de reportes consolidados

**¿Cuándo consultarlo?**
- Para entender el sistema de reportes y seeds
- Para referencia de implementaciones del sistema QA
- **Ruta**: `logs/docs/`

## 🚀 Uso

### Ejecutar Tests y Generar Reportes
```bash
npm test
```

Esto ejecutará:
1. Limpieza de base de datos
2. Ejecución de todos los tests con Vitest
3. Generación automática de reportes en `logs/actual/`:
   - `REPORTE_GLOBAL.md` (overwrite)
   - `REPORTE_DIARIO.md` (prepend)
   - Archivado automático si cambió el día

### Consultar Estado Actual
```bash
cat logs/actual/REPORTE_GLOBAL.md
# o en Windows:
type logs\actual\REPORTE_GLOBAL.md
```

### Ver Historial del Día
```bash
cat logs/actual/REPORTE_DIARIO.md | less
# o en Windows:
type logs\actual\REPORTE_DIARIO.md | more
```

### Comparar con Días Anteriores
```bash
ls logs/historial/
# Abrir el archivo deseado
cat logs/historial/REPORTE_DIARIO_20251121.md
```

## 📋 Workflow Típico

### Inicio del Día
1. Consultar `REPORTE_GLOBAL.md` para ver estado actual
2. Identificar tests críticos fallando
3. Ejecutar `npm test` para verificar baseline

### Durante el Desarrollo
1. Hacer cambios en el código
2. Ejecutar `npm test`
3. Consultar `REPORTE_GLOBAL.md` para ver impacto inmediato
4. Si hay regresión, comparar con ejecuciones previas en `REPORTE_DIARIO.md`

### Fin del Día
1. Ejecutar `npm test` una última vez
2. Verificar que `REPORTE_GLOBAL.md` muestra estado green (100% passing)
3. El sistema archivará automáticamente `REPORTE_DIARIO.md` al día siguiente

## 🔄 Automatización

El sistema maneja automáticamente:
- ✅ Sobrescritura de `REPORTE_GLOBAL.md`
- ✅ Prepend en `REPORTE_DIARIO.md`
- ✅ Detección de cambio de día
- ✅ Archivado en `historial/`
- ✅ Limpieza de archivos obsoletos del sistema anterior

No requiere intervención manual.

## 🎨 Formato de Reportes

### Emojis de Estado
- ✅ Todos los tests pasando
- ⚠️ Algunos tests fallando
- 🎉 Success total
- 🔧 Trabajo pendiente
- 📦 Archivo histórico

### Secciones del REPORTE_GLOBAL
1. **Estado Global**: Resumen ejecutivo
2. **Fallos Críticos**: Tests que requieren atención inmediata
3. **Resumen Detallado**: Tabla con métricas
4. **Próximos Pasos**: Recomendaciones basadas en estado

### Bloques del REPORTE_DIARIO
Cada bloque de ejecución contiene:
```markdown
---
## ➡️ EJECUCIÓN: DD/MM - HH:MM:SS
**Resultado:** ✅/⚠️ X/Y tests pasando (Z%)
**Duración:** Xs

### Detalle de la Ejecución
[Contenido completo del REPORTE_GLOBAL de esa ejecución]
```

## 📌 Notas Importantes

1. **No editar manualmente** los reportes generados automáticamente
2. **Documentación técnica** va en `docs/`, NO en la raíz de logs/
3. **Archivos legacy** del sistema anterior se migran automáticamente
4. **Git**: Solo `docs/*.md` y `README.md` están versionados, los reportes generados están en `.gitignore`

## 🔧 Troubleshooting

### Los reportes no se generan
```bash
# Verificar que el script existe
ls scripts/test-reporter.mjs

# Verificar permisos
chmod +x scripts/test-reporter.mjs

# Ejecutar tests manualmente
npm run test:quick
```

### Formato incorrecto
```bash
# Limpiar y regenerar
rm logs/actual/REPORTE_*.md
npm test
```
npm test
```

### Ver archivos históricos
```bash
# Listar todos los reportes diarios archivados
ls -lh logs/historial/REPORTE_DIARIO_*.md
```

---

**Sistema implementado el**: 21/11/2025  
**Versión**: 2.0 (Consolidado)  
**Mantenido por**: Sistema automático de reporting
