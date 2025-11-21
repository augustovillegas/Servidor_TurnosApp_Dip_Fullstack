# Reporte integral del backend "Gestion de turnos APP"

## 1. Configuración general del servidor
- **Punto de entrada:** `server.mjs` levanta Express 5, aplica `cors`, `morgan` y `express.json()`, expone `/health` sin autenticación y monta los routers (`/turnos`, `/entregas`, `/usuarios`, `/auth`, `/assignments`, `/submissions`, `/slots`).
- **Base de datos:** `config/dbConfig.mjs` usa Mongoose 8, forcea `autoIndex` salvo en producción y aborta el proceso ante errores.
- **Errores globales:** `errorHandler.mjs` captura todo, mantiene `message` y `msg` (compatibilidad con clientes legacy) y adjunta `code` si existe.
- **Proceso:** `process.on("unhandledRejection")` finaliza el server para evitar estados inconsistentes.

### Variables de entorno cargadas (`.env`)
```
MONGO_URL="mongodb+srv://admin_augusto:2LEGyAIHzh9h58ke@09-backul.pizo4.mongodb.net/App-turnos"
JWT_SECRET="mi_clave_super_segura"
```
Ambas son obligatorias en el arranque (`server.mjs`).

### Dependencias y scripts (`package.json`)
| Tipo | Paquetes clave |
| --- | --- |
| Runtime | express 5.1, mongoose 8.18, cors, morgan, dotenv, jsonwebtoken, bcryptjs, express-validator, method-override |
| Utilidades | axios, fs-extra, json2csv, yargs, bad-words, clsx |
| Dev/Test | nodemon, vitest, supertest, cross-env |

Scripts relevantes: `start` (node `server.mjs`), `dev` (nodemon), `pretest` (`scripts/crearSuperadmin.mjs`), `test` (ejecuta `scripts/runTestsWithLog.mjs`), `limpiar`, `seed`, `turnos` (scripts de población en `scripts/`).

## 2. Modelos de datos (directorio `models/`)
### Assignment (`models/Assignment.mjs`)
| Campo | Tipo/enum | Reglas |
| --- | --- | --- |
| `modulo` | enum `HTML-CSS`/`JAVASCRIPT`/`BACKEND - NODE JS`/`FRONTEND - REACT` | Trim, default "-" |
| `title` | String | Required, trim |
| `description` | String | Required |
| `dueDate` | Date | Required |
| `createdBy` | ObjectId -> `User` | Required |
| `cohorte` | Number | Required |

### ReviewSlot (`models/ReviewSlot.mjs`)
Campos para relacionar una review y su agenda: `assignment` (opcional), `cohorte` (Number), `reviewNumber` (>=1), `date` (Date obligatoria), `startTime`/`endTime` (HH:MM), `start`/`end` (Date), `room`, `zoomLink`, `student` (ObjectId -> `User`), `approvedByProfessor` (bool), `reviewStatus` (enum: revisar/aprobado/desaprobado con variantes), `estado` (enum `Disponible/Solicitado/Aprobado/Rechazado`), `comentarios`. Incluye `timestamps`.

### Submission (`models/Submission.mjs`)
- Relaciona `assignment` y `student` (ambos opcionales).
- Metadatos: `alumnoNombre`, `sprint`, `modulo`, `githubLink` (obligatorio), `renderLink`, `comentarios`.
- Estados: `reviewStatus` y `estado` comparten enum extendido (`Pendiente`, `Aprobado`, `Desaprobado`, `A revisar`, `Rechazado`).

### User (`models/User.mjs`)
- Identidad: `name` obligatorio (se construye desde `nombre` + `apellido`), además de los campos opcionales `nombre`, `apellido`, `email` (único y lowercase) y `passwordHash`.
- Academico: `modulo` es el único campo que se debe usar para filtrar por módulo (siempre toma valores de `MODULE_NAME_VALUES`), y ahora se complementa con `moduloSlug`, `moduleCode` y `cohortLabel` (los mismos datos que llenan los seeds y servicios `moduleMap`), así como `cohorte` (alias `cohort`) e `isRecursante`.
- Accesos: `role` (`alumno/profesor/superadmin`), `status` (`Pendiente/Aprobado/Rechazado`) y `isApproved` se mantienen sincronizados, por lo que no hay campos redundantes de estado.

## 3. Repositorios (`repository/`)
- `assignmentRepository.mjs`, `slotRepository.mjs`, `submissionRepository.mjs`, `userRepository.mjs` implementan la interfaz `IRepository` con métodos CRUD tipificados. `slotRepository` siempre `populate` assignments/students para que los servicios tengan todo listo.

## 4. Servicios y reglas de negocio (`services/`)
### assignmentService.mjs
- `crearAsignacion(body, user)`: solo `profesor/superadmin`, castea `module` a número, usa `user.cohort` o `body.cohort`, fecha a `Date`.
- `obtenerTodasAsignaciones(user)`: filtra por `createdBy` si el usuario es profesor.
- `obtenerAsignacionPorId`, `actualizarAsignacion`, `eliminarAsignacion`: validan propiedad del recurso salvo `superadmin`.

### authService.mjs
- `register`: verifica email único, construye `name` desde `name/nombre/apellido`, hashea con bcrypt (10 salt rounds), crea `User` vía repositorio y sanitiza (remueve `passwordHash`).
- `login`: compara password, bloquea usuarios `status === "Rechazado"`, firma JWT (7 días) con `JWT_SECRET` incluyendo `{id, role}`.
- `aprobarUsuario`: marca `isApproved` y `status="Aprobado"`.
- `listarUsuarios`, `getUserById`: retornan usuarios sanitizados.

### slotService.mjs (operaciones protegidas + panel admin)
- Normaliza estados (`REVIEW_STATUS_CANONICAL`) y expone las operaciones de negocio clásicas (`crear`, `solicitarTurno`, `cancelarTurno`, `actualizarEstadoRevision`, `obtenerPorUsuario`, `obtenerTurnosPorFiltro`, `obtenerSolicitudesPorAlumno`) con validaciones de rol/cohorte.
- Los endpoints del panel `/turnos` reutilizan las mismas funciones, pero antes de devolver el listado o un turno concreto pasan los datos por `utils/mappers/slotMapper.mjs` + `utils/common/normalizers.mjs` para generar el DTO (`toFrontend`) que incluye fecha, horario, módulo, duración, `estado`, `reviewStatus`, `solicitanteId`, etc.
- Las funciones `listarTurnos`, `obtenerTurno`, `crearTurno`, `actualizarTurno` y `eliminarTurno` también construyen/normalizan payloads (horarios, strings, estados) para persistir sin duplicar lógica.

### submissionService.mjs (entregas del core y del panel)
- Usa `ReviewSlot`, `Assignment` y el repositorio para las rutas tradicionales (`crearEntrega`, `obtenerEntregasPorUsuario`, `obtenerEntregaPorId`, `actualizarEntrega`, `eliminarEntrega`); todas las decisiones de estado (`FINAL_STATES`, `normalizarReviewStatus`) se toman en este servicio.
- Para el panel de `/entregas`, expone funciones adicionales que aplican `utils/mappers/submissionMapper.mjs`: `listarEntregasFrontend`, `obtenerEntregaFrontend`, `crearEntregaFrontend`, `actualizarEntregaFrontend` y `eliminarEntregaFrontend`. Cada una valida `githubLink`, normaliza `modulo` con `ensureModuleLabel`, mantiene `estado/reviewStatus` sincronizados y aplica los mismos filtros/ordenamientos que entonces.
- El mapeo final antes de devolver datos siempre pasa por `toFrontend` para conservar la forma del DTO anterior.

### userService.mjs
- Integra el CRUD básico (usado por `auth` y repositorio) con los handlers que respondían a `/usuarios` en el panel: `listarUsuarios`, `obtenerUsuario`, `crearUsuario`, `actualizarUsuario`, `eliminarUsuario`.
- `listarUsuarios` utiliza `utils/mappers/userMapper.mjs` y los normalizadores (`normaliseRole`, `normaliseEstado`) más `ensureModuleLabel` para soportar filtros por rol/estado/módulo.
- `crearUsuario` delega en `authService.register`, resuelve el módulo con `resolveModuleMetadata`, y mantiene `modulo`, `moduloSlug`, `moduleCode`, `cohorte` y `status/isApproved` sin duplicar lógica, mientras que las actualizaciones reutilizan las mismas utilidades.

## 5. Controladores y rutas
### Endpoint global
- `GET /health` (definido en `server.mjs`): retorna `{status:"ok"}` para chequeos de vida.

### `/auth` (`routes/authRoutes.mjs`)
| Método | Ruta | Middlewares | Controlador -> Servicio | Notas |
| --- | --- | --- | --- | --- |
| GET | `/auth/ping` | - | `pingController` | Health simple.
| POST | `/auth/login` | `loginValidator`, `validateRequest` | `loginController` -> `authService.login` | Devuelve `{token,user}`.
| GET | `/auth/session` | `auth` | `sessionController` -> `authService.getUserById` | Verifica token y retorna usuario.
| POST | `/auth/register` | `registerValidator`, `validateRequest` | `registerController` -> `authService.register` | Registro abierto (rol por defecto alumno).
| PATCH | `/auth/aprobar/:id` | `auth`, `allowRoles(superadmin,profesor)` | `aprobarUsuarioController` -> `authService.aprobarUsuario` | Aprueba cuenta.
| GET | `/auth/usuarios` | `auth`, `allowRoles(superadmin,profesor)` | `listarUsuariosController` -> `authService.listarUsuarios` | Soporta query `role`.

### `/assignments` (`routes/assignmentRoutes.mjs`)
| Método | Ruta | Middlewares | Controlador -> Servicio | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/assignments/` | `auth` | `obtenerAsignacionesController` -> `assignmentService.obtenerTodasAsignaciones` | Profesores reciben solo propias.
| GET | `/assignments/:id` | `auth`, `param("id").isMongoId()`, `validateRequest` | `obtenerAsignacionPorIdController` | 404 si no existe.
| POST | `/assignments/` | `auth`, `allowRoles(profesor,superadmin)`, `assignmentValidator`, `validateRequest` | `crearAsignacionController` | Crea registro.
| PUT | `/assignments/:id` | Igual a POST + `param` ID | `actualizarAsignacionController` | Solo dueño o superadmin.
| DELETE | `/assignments/:id` | `auth`, `allowRoles`, `param`, `validateRequest` | `eliminarAsignacionController` | 204 vació.

### `/slots` (operaciones sobre turnos principales)
| Método | Ruta | Middlewares | Controlador -> Servicio | Notas |
| --- | --- | --- | --- | --- |
| GET | `/slots/` | `auth` | `obtenerTurnosController` -> `slotService.obtenerTurnosPorFiltro` | Filtra por query `cohort`.
| POST | `/slots/` | `auth`, `allowRoles(profesor,superadmin)`, `createSlotValidator`, `validateRequest` | `createSlotController` -> `slotService.crear` | Requiere fecha ISO.
| PATCH | `/slots/:id/solicitar` | `auth`, `allowRoles(alumno)`, `requireApproved`, `slotIdParamValidator`, `validateRequest` | `solicitarTurnoController` -> `slotService.solicitarTurno` | Alumno reserva.
| PATCH | `/slots/:id/estado` | `auth`, `allowRoles(profesor,superadmin)`, `slotIdParamValidator`, `updateEstadoValidator`, `validateRequest` | `actualizarEstadoRevisionController` -> `slotService.actualizarEstadoRevision` | Cambia estado (aprobado/pendiente/cancelado).
| PATCH | `/slots/:id/cancelar` | `auth`, `allowRoles(alumno)`, `requireApproved`, `slotIdParamValidator`, `validateRequest` | `cancelarTurnoController` -> `slotService.cancelarTurno` | Libera slot.
| GET | `/slots/mis-solicitudes` | `auth`, `allowRoles(alumno)`, `requireApproved` | `misSolicitudesController` -> `slotService.obtenerSolicitudesPorAlumno` | Lista reservas del alumno.

### `/submissions` (API de alumnos/profesores)
| Método | Ruta | Middlewares | Controlador -> Servicio | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/submissions/detail/:id` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `param`, `validateRequest` | `obtenerEntregaPorIdController` -> `submissionService.obtenerEntregaPorId` | Controla permisos por rol.
| GET | `/submissions/:userId` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `param`, `validateRequest` | `obtenerEntregasPorUsuarioController` -> `submissionService.obtenerEntregasPorUsuario` | Alumnos solo propios.
| POST | `/submissions/:id` | `auth`, `allowRoles(alumno)`, `requireApproved`, `param`, `submissionValidator`, `validateRequest` | `crearEntregaController` -> `submissionService.crearEntrega` | `:id` = slot reservado.
| PUT | `/submissions/:id` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `requireApproved`, `param`, `submissionValidator`, `validateRequest` | `actualizarEntregaController` -> `submissionService.actualizarEntrega` | Restringe ediciones finales.
| DELETE | `/submissions/:id` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `requireApproved`, `param`, `validateRequest` | `eliminarEntregaController` -> `submissionService.eliminarEntrega` | 204 sin cuerpo.

### `/turnos` (panel administrativo, reuse `slotController` + `slotService`)
Middlewares globales: `auth`, `allowRoles(profesor,superadmin)` (aplicados con `router.use`).

| Método | Ruta | Controlador -> Servicio | Notas |
| --- | --- | --- | --- |
| GET | `/turnos/` | `listarTurnosFrontendController` -> `slotService.listarTurnos` | Devuelve DTO listo para UI filtrable por query.
| GET | `/turnos/:id` | `obtenerTurnoFrontendController` -> `slotService.obtenerTurno` | Valida ObjectId.
| POST | `/turnos/` | `crearTurnoFrontendController` -> `slotService.crearTurno` | Crea y retorna DTO.
| PUT | `/turnos/:id` | `actualizarTurnoFrontendController` -> `slotService.actualizarTurno` | Recalcula estado/estudiante.
| DELETE | `/turnos/:id` | `eliminarTurnoFrontendController` -> `slotService.eliminarTurno` | 204.

### `/entregas` (panel administrativo sobre submissions)
Middlewares globales: `auth`, `allowRoles(profesor,superadmin)`.

| Método | Ruta | Controlador -> Servicio |
| --- | --- | --- |
| GET | `/entregas/` | `listarEntregasFrontendController` -> `submissionService.listarEntregasFrontend` |
| GET | `/entregas/:id` | `obtenerEntregaFrontendController` -> `submissionService.obtenerEntregaFrontend` |
| POST | `/entregas/` | `crearEntregaFrontendController` -> `submissionService.crearEntregaFrontend` |
| PUT | `/entregas/:id` | `actualizarEntregaFrontendController` -> `submissionService.actualizarEntregaFrontend` |
| DELETE | `/entregas/:id` | `eliminarEntregaFrontendController` -> `submissionService.eliminarEntregaFrontend` |

### `/usuarios` (gestión desde frontend admin)
Middlewares globales: `auth`, `allowRoles(superadmin)`.

| Método | Ruta | Controlador -> Servicio |
| --- | --- | --- |
| GET | `/usuarios/` | `listarUsuariosFrontendController` -> `userService.listarUsuarios` |
| GET | `/usuarios/:id` | `obtenerUsuarioFrontendController` -> `userService.obtenerUsuario` |
| POST | `/usuarios/` | `crearUsuarioFrontendController` -> `userService.crearUsuario` |
| PUT | `/usuarios/:id` | `actualizarUsuarioFrontendController` -> `userService.actualizarUsuario` |
| DELETE | `/usuarios/:id` | `eliminarUsuarioFrontendController` -> `userService.eliminarUsuario` |

## 6. Middlewares clave (`middlewares/`)
- `auth.mjs`: exige header `Authorization: Bearer <token>`, valida JWT con `JWT_SECRET`, adjunta `req.user` y `req.userDocument` obtenido vía `userService`.
- `roles.mjs`: `allowRoles(...rolesPermitidos)` verifica `req.user.role` y contiene `rolesConfig` (capacidades informativas).
- `requireApproved.mjs`: bloquea acciones de alumnos con `isApproved === false`.
- `validationResult.mjs`: formatea errores de `express-validator` con estructura `{campo,mensaje}` y resumen en `msg`.
- `errorHandler.mjs`: descrito arriba.

## 7. Validadores (`validators/`)
- `assignmentValidator`: obliga `title`, `description`, `dueDate` (ISO) y `module` entero.
- `authValidator`: valida login/registro aceptando email o username alfanumérico, exige contraseñas =6 caracteres y `cohort` numérico opcional.
- `slotValidator`: controla ID de turno, fecha ISO, horarios `HH:MM`, `cohort/reviewNumber` enteros, estados permitidos.
- `submissionValidator`: chequea `assignment` como ObjectId opcional, `githubLink` o `link` apuntando a `github.com`, `renderLink` válido.

## 8. Utilidades y otros componentes
- `utils/moduleMap.mjs`: mapea cohortes numéricos ? etiquetas (`1 -> HTML-CSS`, `2 -> JAVASCRIPT`, `3 -> NODE`, `4 -> REACT`). `ensureModuleLabel` normaliza strings en mayúsculas; usado extensamente por servicios "frontend".
- `utils/sanitizeUser.mjs`: remueve `passwordHash` y `__v` de cualquier documento `User` antes de exponerlo.
- `repository/slotRepository.mjs` siempre `populate` assignments (campos `module`, `title`, `description`, `createdBy`) y estudiantes (`name`, `role`, `cohort`) para que tanto los servicios internos como los de frontend puedan construir DTOs sin consultas adicionales.
- Directorios extra: `scripts/` (pobladores y herramientas como `crearSuperadmin`, `limpiarDB`, `reset_and_seed`, `crearTurnosReviews`, `runTestsWithLog`), `logs/` (para dumps de pruebas), `tests/` (vitest/supertest) y `public/` (assets compartidos).

## 9. Reglas y consideraciones para integrar un frontend a medida
1. **Autenticación:** todos los endpoints (excepto `/health`, `/auth/ping`, `/auth/login`, `/auth/register`) requieren JWT en cabecera `Authorization`. Guardar `token` y reenviarlo; el payload contiene `id` y `role`.
2. **Roles/permisos:**
   - `alumno`: puede listar turnos (`/slots`), reservar/cancelar, crear/editar sus submissions (limitado si ya fueron evaluadas) y leer `/submissions/:userId` solo si coincide con su `userId`.
   - `profesor`: puede crear turnos y assignments, aprobar/rechazar submissions y usuarios, usar paneles `/turnos` y `/entregas`.
   - `superadmin`: mismo que profesor + gestionar `/usuarios` completos.
3. **Estados canónicos:** front debe usar los valores exactos: turnos `Disponible/Solicitado/Aprobado/Rechazado`; submissions `A revisar/Aprobado/Desaprobado` (alias se normalizan server-side pero conviene mandar los canónicos).
4. **Módulos/cohortes:** preferir etiquetas normalizadas (`HTML-CSS`, `JAVASCRIPT`, `NODE`, `REACT`). El backend las convierte a números cuando hace falta (`labelToModule`).
5. **Turnos Frontend DTO:** campos disponibles (via `slotService.listarTurnos` + `utils/mappers/slotMapper.mjs`): `id`, `modulo`, `profesorId`, `zoomLink`, `fecha` (`date`, `start`, `end`, `startTime`, `endTime`), `estado`, `reviewStatus`, `solicitanteId`, `solicitanteNombre`, `comentarios`, etc. Mantener sincronizadas las opciones con `VALID_ESTADOS`.
6. **Submissions Frontend DTO:** incluye `alumno`, `alumnoId`, `modulo`, `estado`, `githubLink`, `renderLink`, `comentarios`, `fechaEntrega`. Los filtros aceptan `estado`, `modulo`, `sprint`, `userId`.
7. **Campos sensibles:** el `JWT_SECRET` y la conexión Atlas quedan expuestos en `.env`; cualquier despliegue final debe sobreescribirlos.

Este reporte cubre cada ruta, controlador, servicio, modelo y las piezas auxiliares necesarias para que un frontend pueda consumir la API sin ambigüedades.
