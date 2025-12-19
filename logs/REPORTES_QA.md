# Sistema de Reportes de Tests

Guía operativa y técnica para el sistema de reportes de pruebas automatizadas del backend. Aplica solo a los artefactos bajo `logs/`.

## Objetivo
- Centralizar el estado de las ejecuciones de tests (sesión actual e histórico).
- Facilitar trazabilidad diaria y comparaciones entre días.
- Entregar un formato legible para ingeniería y liderazgo, sin ruido ajeno al backend.

## Estructura
```
logs/
├─ actual/                  # Sesión activa (reportes del día en curso)
│  ├─ README.md
│  ├─ REPORTE_GLOBAL.md     # Estado más reciente (overwrite)
│  └─ REPORTE_DIARIO.md     # Historial del día (prepend)
├─ historial/               # Archivo de días anteriores
│  ├─ README.md
│  └─ REPORTE_DIARIO_YYYYMMDD.md
└─ docs/                    # Documentación técnica del sistema de reportes
   ├─ SEED_USERS.md
   └─ IMPLEMENTACION_SISTEMA_CONSOLIDADO.md
```

## Flujo de datos
1) Ejecutar pruebas con Vitest (`npm test` o scripts asociados).  
2) Se generan automáticamente en `logs/actual/`:
   - `REPORTE_GLOBAL.md`: sobrescritura con el último resultado.
   - `REPORTE_DIARIO.md`: se antepone (prepend) el bloque de la ejecución.
3) Cambio de día: el sistema archiva `REPORTE_DIARIO.md` en `historial/` y lo renombra `REPORTE_DIARIO_YYYYMMDD.md`.

## Uso operativo
- Ejecutar pruebas y generar reportes:
  ```bash
  npm test
  ```
- Consultar estado actual (resumen ejecutivo):
  ```bash
  type logs\\actual\\REPORTE_GLOBAL.md
  ```
- Ver historial del día con paginación:
  ```bash
  type logs\\actual\\REPORTE_DIARIO.md | more
  ```
- Comparar con días anteriores:
  ```bash
  dir logs\\historial
  type logs\\historial\\REPORTE_DIARIO_20251121.md
  ```

## Formato de los reportes
### REPORTE_GLOBAL.md
- Secciones recomendadas:
  1. Estado global (tests pasando/fallando, porcentaje).
  2. Fallos críticos (lista priorizada).
  3. Resumen detallado (métricas: duración, suites, tests, coverage si aplica).
  4. Próximos pasos (acciones sugeridas y responsables si corresponde).

### REPORTE_DIARIO.md
- Orden: bloques de ejecución del más reciente al más antiguo.
- Plantilla de bloque:
  ```markdown
  ---
  ## EJECUCION: DD/MM - HH:MM:SS
  **Resultado:** X/Y tests pasando (Z%)
  **Duracion:** Xs

  ### Detalle de la ejecucion
  [Contenido del REPORTE_GLOBAL.md para esa corrida]
  ```

## Automatización y herramientas
- Generación: scripts asociados a `npm test` (Vitest) + `scripts/test-reporter.mjs` para escritura en `logs/actual/`.
- Control de versiones: este archivo (`logs/REPORTES_QA.md`) y `logs/docs/*` son versionados; los reportes generados están ignorados en Git.
- Retención: un archivo por día en `historial/` para trazabilidad semanal/mensual.

## Buenas prácticas
- No editar manualmente los reportes generados (`REPORTE_GLOBAL.md`, `REPORTE_DIARIO.md`).
- La documentación técnica vive en `logs/docs/`; no dupliques contenido en la raíz de `logs/`.
- Ejecuta `npm test` antes de cerrar el día para asegurar un estado final consistente.

## Troubleshooting
- Los reportes no se generan:
  ```bash
  ls scripts/test-reporter.mjs
  npm run test:quick
  ```
- Formato incorrecto o archivos corruptos:
  ```bash
  del logs\\actual\\REPORTE_*.md
  npm test
  ```
- Validar archivos históricos:
  ```bash
  dir logs\\historial\\REPORTE_DIARIO_*.md
  ```

---

Implementado: 21/11/2025  
Versión: 2.1 (Consolidado)  
Mantenimiento: Sistema automático de reporting
