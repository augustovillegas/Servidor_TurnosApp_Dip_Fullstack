# 📂 Estructura del Proyecto - Organización de Archivos

## 🎯 Ubicación Correcta de Archivos

### ✅ Tests (`/tests`)
**TODOS los archivos de test deben estar aquí:**
```
tests/
├── helpers/
│   └── testUtils.mjs          # Utilidades compartidas
├── auth.test.mjs              # Tests de autenticación
├── user.test.mjs              # Tests de usuarios
├── assignment.test.mjs        # Tests de asignaciones
├── slot.test.mjs              # Tests de turnos
├── submission.test.mjs        # Tests de entregas
├── cohort-isolation.test.mjs  # Tests de aislamiento por módulo
├── error-handling.test.mjs    # Tests de manejo de errores
├── seed-data-filtering.test.mjs
├── slot-dto-consistency.test.mjs
└── setup.mjs                  # Setup global de Vitest
```

**❌ NO crear archivos de test en:**
- Raíz del proyecto
- Dentro de `/scripts`
- Dentro de `/logs`

---

### ✅ Reportes y Logs (`/logs`)

**Estructura obligatoria:**
```
logs/
├── actual/                    # 🟢 Sesión activa
│   ├── README.md             # [VERSIONADO]
│   ├── REPORTE_GLOBAL.md     # [GENERADO - NO VERSIONAR]
│   └── REPORTE_DIARIO.md     # [GENERADO - NO VERSIONAR]
├── historial/                 # 📦 Archivo histórico
│   ├── README.md             # [VERSIONADO]
│   └── REPORTE_DIARIO_*.md   # [GENERADO - NO VERSIONAR]
└── docs/                      # 📚 Documentación técnica
    ├── SEED_USERS.md         # [GENERADO - SENSIBLE - NO VERSIONAR]
    └── IMPLEMENTACION_SISTEMA_CONSOLIDADO.md  # [VERSIONADO]
```

**Archivos generados automáticamente:**
- `logs/actual/REPORTE_GLOBAL.md` - Creado por `npm test`
- `logs/actual/REPORTE_DIARIO.md` - Creado por `npm test`
- `logs/historial/REPORTE_DIARIO_YYYYMMDD.md` - Archivado automáticamente
- `logs/docs/SEED_USERS.md` - Creado por `npm run seed`

**❌ NO crear manualmente:**
- Archivos `.log` en `/logs`
- Carpetas `history/` (legacy, usar `historial/`)
- `test-summary.md` (legacy, usar reportes consolidados)

---

### ✅ Scripts (`/scripts`)

**Todos los scripts de utilidades:**
```
scripts/
├── lib/
│   ├── seedUtils.mjs         # Utilidades de seed
│   └── seedGenerators.mjs    # Generadores de datos
├── limpiarDB.mjs
├── seedCompleto.mjs
├── aplicarIndices.mjs
├── test-reporter.mjs         # Sistema de reportes QA
├── limpiarEstructura.mjs     # [NUEVO] Limpieza de archivos
└── verificar_seed_location.mjs
```

**❌ NO colocar aquí:**
- Archivos de test (van en `/tests`)
- Logs o reportes (van en `/logs`)

---

### ✅ Archivos en Raíz (Root)

**Solo archivos de configuración y documentación principal:**
```
/
├── .env                       # [NO VERSIONAR]
├── .gitignore
├── package.json
├── vitest.config.mjs
├── nodemon.json
├── server.mjs
├── README.md
└── SERVIDOR_BACKEND.md
```

**❌ NO debe haber en raíz:**
- `test-output.txt`
- `test-final.log`, `test-results.log`, etc.
- `SEED_USERS.md` (va en `logs/docs/`)
- `*.test.mjs` (van en `/tests`)
- `*.log` (van en `/logs` o se eliminan)

---

## 🧹 Comandos de Limpieza

### Limpiar archivos fuera de lugar
```bash
node scripts/limpiarEstructura.mjs
```

### Verificar estructura correcta
```bash
node scripts/verificar_seed_location.mjs
```

### Regenerar estructura completa
```bash
# 1. Limpiar archivos obsoletos
node scripts/limpiarEstructura.mjs

# 2. Aplicar índices actualizados
node scripts/aplicarIndices.mjs

# 3. Regenerar seed y credenciales
npm run seed

# 4. Ejecutar tests y generar reportes
npm test
```

---

## 🔒 Archivos Sensibles (NO VERSIONAR)

Estos archivos contienen información sensible o se generan automáticamente:

```gitignore
# Credenciales
.env
logs/docs/SEED_USERS.md

# Reportes generados
logs/actual/REPORTE_GLOBAL.md
logs/actual/REPORTE_DIARIO.md
logs/historial/*.md

# Outputs de tests
test-output.txt
test-final.log
test-results.log
test-run-latest.log
full-test-output.log
*.log
coverage/
```

---

## ✅ Checklist de Verificación

Antes de hacer commit, verificar que:

- [ ] No hay archivos `.test.mjs` fuera de `/tests`
- [ ] No hay `test-output.txt` o archivos `.log` en la raíz
- [ ] `SEED_USERS.md` solo existe en `logs/docs/`
- [ ] No hay carpeta `logs/history/` (legacy)
- [ ] `.gitignore` está actualizado
- [ ] Reportes están en `logs/actual/` o `logs/historial/`

**Comando rápido:**
```bash
node scripts/limpiarEstructura.mjs && git status
```

---

**Última actualización:** Diciembre 2025  
**Versión:** 2.0 (Estructura consolidada)
