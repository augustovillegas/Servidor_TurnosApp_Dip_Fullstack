# Sistema de Gestion de Turnos – Backend

API RESTful para revisiones de proyectos, asignacion de turnos y seguimiento de entregas. Enfoque en seguridad, trazabilidad y reportes automatizados.

**Enlaces rapidos**
- Frontend desplegado: https://gestion-turnos-app.netlify.app/
- LinkedIn (autor): https://www.linkedin.com/in/augustovillegas/

## Snapshot del proyecto
- Stack: Node.js 20+, Express 5, MongoDB 6, Mongoose 8, Vitest + Supertest.
- Seguridad: JWT, control de roles (`alumno`, `profesor`, `superadmin`), validacion de entrada.
- Observabilidad QA: reporter diario/global en `logs/` con archivado automatico.
- Datos de prueba: seeds versionados y protegidos, con ubicacion clara.

## Instalacion y setup
```bash
npm install

# .env requerido
# MONGODB_URI=mongodb://localhost:27017/gestion-turnos
# JWT_SECRET=tu_secret_aqui
# PORT=3000

node scripts/limpiarEstructura.mjs   # sanea estructura inicial
npm run seed                         # carga datos de prueba
npm run dev                          # modo desarrollo
npm test                             # suite completa
```
Servidor local: `http://localhost:3000`

## Estructura del proyecto
```
config/           # Conexion y settings de base de datos
constants/        # Constantes globales
controllers/      # Controladores de rutas
middlewares/      # Autenticacion, validacion, manejo de errores
models/           # Schemas Mongoose
repository/       # Acceso a datos
routes/           # Definicion de endpoints
scripts/          # Seeds y utilidades (limpieza, reporter)
services/         # Logica de negocio
tests/            # Pruebas con Vitest + Supertest
utils/            # Helpers y mappers
validators/       # Validaciones express-validator
logs/             # Sistema de reportes QA (ver logs/REPORTES_QA.md)
docs/             # Documentacion general
public/           # Assets estaticos
```

**Documentacion clave**
- `SERVIDOR_BACKEND.md`: API completa, modelos y ejemplos.
- `docs/ESTRUCTURA_PROYECTO.md`: convenciones y organizacion.
- `logs/REPORTES_QA.md`: operacion y mantenimiento de reportes.

## Capacidades principales
- Autenticacion y roles con JWT; middlewares de autorizacion por rol.
- Gestion de usuarios: estados `Pendiente`, `Aprobado`, `Rechazado`; aprobacion previa a reservar turnos.
- Turnos y reservas: creacion y reserva; estados Disponible/Solicitado/Aprobado/Rechazado; validacion de conflictos.
- Entregas y calificaciones: enlaces GitHub validados; estados A revisar/Aprobado/Desaprobado; calificacion por profesores y superadmins.
- Aislamiento por modulo: acceso acotado a docentes y usuarios segun modulo.
- Reporting QA: `REPORTE_GLOBAL.md` y `REPORTE_DIARIO.md` con archivado diario en `logs/historial/`.

## Scripts y operaciones
- `npm run dev` — desarrollo con nodemon.
- `npm start` — produccion.
- `npm test` / `npm run test:watch` — suite de pruebas.
- `npm run seed` — seed completo (interactivo).
- Utilidades:
  - `node scripts/limpiarEstructura.mjs` — limpia y valida estructura.
  - `node scripts/aplicarIndices.mjs` — aplica indices MongoDB.
  - `node scripts/limpiarDB.mjs` — limpia base de datos.
  - `node scripts/seedCompleto.mjs --interactive=false` — seed sin confirmacion.
  - `node scripts/verificar_seed_location.mjs` — verifica ubicacion de `SEED_USERS.md`.
  - `node scripts/diagnostico_datos.mjs` — diagnostico de datos.

## Testing y reportes
```bash
npm test              # Suite completa (con limpieza previa)
npm run test:watch    # Modo watch para desarrollo
```
Reportes generados automaticamente:
- `logs/actual/REPORTE_GLOBAL.md` — estado actual de la suite.
- `logs/actual/REPORTE_DIARIO.md` — historial del dia (prepend).
- `logs/historial/REPORTE_DIARIO_YYYYMMDD.md` — archivo historico diario.

## Seeds y datos de prueba
- Principal: `npm run seed` (interactivo).
- Sin confirmacion: `node scripts/seedCompleto.mjs --interactive=false`.
- Credenciales se escriben en `logs/docs/SEED_USERS.md` (ignorado en Git).
- Incluye superadmins, profesores, alumnos, asignaciones, entregas y turnos por modulo.

## Seguridad y archivos sensibles
- No versionar: `.env`, `logs/docs/SEED_USERS.md`, `logs/actual/*.md`, `logs/historial/*.md`, `*.log`, `test-*.log`.
- Revisa `.gitignore` para la lista completa.
- Checklist antes de commitear:
  ```bash
  node scripts/limpiarEstructura.mjs
  git status
  npm test
  git diff --staged
  ```

## Troubleshooting
- Tests fallan por indices:
  ```bash
  node scripts/aplicarIndices.mjs
  npm test
  ```
- Base de datos corrupta:
  ```bash
  node scripts/limpiarDB.mjs
  npm run seed
  npm test
  ```
- Reportes QA no se generan:
  ```bash
  ls -R logs/
  npm test
  type logs\\actual\\REPORTE_GLOBAL.md
  ```
- El servidor no inicia:
  ```bash
  type .env
  net start MongoDB   # Windows
  # o sudo systemctl status mongod   # Linux/Mac
  ```

---

Ultima actualizacion: diciembre 2025  
Version: 2.1 (arquitectura consolidada)  
Licencia: MIT
