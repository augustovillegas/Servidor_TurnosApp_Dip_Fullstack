# Reporte integral del backend "Gestion de turnos APP"

## 1. Configuración general del servidor
- **Punto de entrada:** `server.mjs` levanta Express 5, aplica `cors`, `morgan`, `express.json()` y monta los routers (`/entregas`, `/usuarios`, `/auth`, `/assignments`, `/submissions`, `/slots`). Expone `/health` sin autenticación.
- **Base de datos:** `config/dbConfig.mjs` usa Mongoose 8; activa `autoIndex` salvo en producción y aborta el proceso ante errores de conexión.
- **Arquitectura de manejo de errores (Inversión de Control):**
  * **Contrato unificado:** `errorHandler.mjs` retorna exclusivamente `{ message, errores? }`. Se eliminaron campos legacy (`msg`, `code`, `status` en response body).
  * **Middlewares:** Todos los middlewares (`auth.mjs`, `roles.mjs`, `requireApproved.mjs`) **lanzan errores** (`throw { status, message }`) en lugar de responder directamente con `res.status().json()`.
  * **Servicios:** Validan IDs y lógica de negocio lanzando errores con `throw { status, message, errores? }`. El `errorHandler` centraliza todas las respuestas HTTP.
  * **Validaciones:** `validationResult.mjs` lanza errores 400 con array `errores: [{campo, mensaje}]` cuando hay errores de express-validator.
  * **Status codes:** El handler aplica el `status` del error lanzado o 500 por defecto.
  * **Testing:** Suite completa de 71 tests valida el contrato de error unificado (27 tests específicos en `tests/error-handling.test.mjs`).
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
| `modulo` | enum `HTML-CSS`/`JAVASCRIPT`/`BACKEND - NODE JS`/`FRONTEND - REACT` | Trim, required |
| `title` | String | Required, trim |
| `description` | String | Required |
| `dueDate` | Date | Required |
| `createdBy` | ObjectId -> `User` | Required |
| `cohorte` | Number | Required |

### ReviewSlot (`models/ReviewSlot.mjs`)
Campos para relacionar una review y su agenda: `assignment` (opcional), `cohorte` (Number), `reviewNumber` (>=1), `date` (Date obligatoria), `startTime`/`endTime` (HH:MM), `start`/`end` (Date), `room`, `zoomLink`, `student` (ObjectId -> `User`), `approvedByProfessor` (bool), `reviewStatus` (enum EXACTO del schema: `revisar`, `aprobado`, `desaprobado`, `A revisar`, `Aprobado`, `Desaprobado`; default `A revisar`), `estado` (enum `Disponible` | `Solicitado` | `Aprobado` | `Rechazado`; default `Disponible`), `comentarios`. Incluye `timestamps`.

### Submission (`models/Submission.mjs`)
- Relaciona `assignment` y `student` (ambos opcionales).
- Metadatos: `alumnoNombre` (default "-"), `sprint`, `githubLink` (obligatorio, sin default), `renderLink` (default "-"), `comentarios` (default "-").
- Se eliminó el campo `modulo` (derivable vía `assignment` o normalizadores). No existe campo `estado` en el schema.
- Estado único: `reviewStatus` (enum: `Pendiente`, `Aprobado`, `Desaprobado`, `A revisar`, `Aprobado`, `Desaprobado`, `Rechazado`; default `A revisar`).

### User (`models/User.mjs`)
- Estructura actual (campos persistidos): `name`, `email`, `passwordHash`, `modulo` (enum), `moduleCode` (Number nullable), `role`, `cohorte` (alias `cohort`), `status` (`Pendiente/Aprobado/Rechazado`).
- Se eliminaron definitivamente los campos redundantes: `nombre`, `apellido`, `isApproved`, `moduloSlug`, `cohortLabel`, `isRecursante`.
- Virtuales disponibles: `moduleNumber` (refleja `moduleCode || cohorte` y permite set para sincronizar), `moduleLabel` (deriva etiqueta desde el número).
- Aprobación de cuenta: se controla exclusivamente con `status === "Aprobado"` (el frontend puede derivar `isApproved` si lo necesita). No hay duplicación de estado.
- Seguridad: `passwordHash` nunca se expone; sanitización remove `passwordHash`, `__v` y otros metadatos.

### Notas sobre valores por defecto "-"
Se usa el sentinel "-" únicamente en campos STRING opcionales para indicar "llegó el campo pero sin valor asignado" (evita distinguir entre ausencia y vacío en frontend):
- ReviewSlot: `startTime`, `endTime`, `zoomLink`, `comentarios`.
- Submission: `alumnoNombre`, `renderLink`, `comentarios`.
No se aplica "-" en campos `required` ni en enums cuya semántica inicial es significativa (`estado` = "Disponible", `reviewStatus` = "A revisar").

### Uniformidad del DTO de Slots
El mapper `slotMapper.toFrontend` se invoca ahora en TODAS las operaciones (crear, solicitar, cancelar, actualizar estado, listar, eliminar) garantizando un shape estable: incluye claves (`id`, fechas ISO y legadas, horario derivado, módulo, duración, estado, reviewStatus, solicitanteId/Nombre, zoomLink, sala/room). Para compatibilidad legacy de tests, si el DTO expone `id` sin `_id`, los helpers replican `_id = id` durante la fase de testing; el contrato de la API externa permanece usando `id`.

## 3. Repositorios (`repository/`)
- `assignmentRepository.mjs`, `slotRepository.mjs`, `submissionRepository.mjs`, `userRepository.mjs` implementan la interfaz `IRepository` con métodos CRUD tipificados. `slotRepository` siempre `populate` assignments/students para que los servicios tengan todo listo.

## 4. Servicios y reglas de negocio (`services/`)
### assignmentService.mjs
- `crearAsignacion(body, user)`: sólo `profesor/superadmin`. Ignora cualquier `cohorte` del body y deriva módulo/cohorte usando `resolveModuleMetadata` a partir de `user.cohort`; siempre setea `cohorte` y `modulo` según el profesor creador.
- `obtenerTodasAsignaciones(user)`: 
   * `superadmin`: sin filtro.
   * `profesor`: únicamente asignaciones creadas por él (`createdBy:user.id`) dentro de su propio `cohorte`.
   * `alumno`: todas las asignaciones de su `cohorte` (independiente del creador).
- `obtenerAsignacionPorId`, `actualizarAsignacion`, `eliminarAsignacion`: exigen propiedad (match `createdBy`) salvo rol `superadmin`.

### authService.mjs
- `register`: verifica email único, usa directamente `name` recibido (los campos `nombre/apellido` ya no existen), hashea con bcrypt (10 salt rounds), persiste con `status="Pendiente"` y sanitiza (remueve `passwordHash`).
- `login`: compara password, bloquea usuarios con `status === "Rechazado"`, firma JWT (7 días) con `{ id, role }` usando `JWT_SECRET`.
- `aprobarUsuario`: establece `status="Aprobado"` (el campo `isApproved` fue eliminado del modelo).
- `getUserById`: devuelve usuario sanitizado (sin `passwordHash`).

### slotService.mjs (operaciones sobre turnos)
- Normaliza estados (`REVIEW_STATUS_CANONICAL`) y expone las operaciones de negocio: `crear`, `solicitarTurno`, `cancelarTurno`, `actualizarEstadoRevision`, `obtenerPorUsuario`, `obtenerTurnosPorFiltro`, `obtenerSolicitudesPorAlumno` con validaciones de rol/cohorte.
- Aplica `buildModuleFilter` (desde `permissionUtils`) para segmentación automática por módulo según rol del usuario.
- **Filtrado para alumnos:** Solo ven turnos de su cohorte que estén `estado: "Disponible"` O sean propios (reservados por ellos). Post-filtrado defensivo asegura que no se expongan turnos reservados por otros alumnos.
- **Filtrado para profesores/superadmin:** Ven todos los turnos de su módulo/cohorte sin restricciones adicionales.
- Las funciones `listarTurnos`, `obtenerTurno`, `crearTurno`, `actualizarTurno`, `eliminarTurno` construyen/normalizan payloads (horarios, strings, estados) y aplican `toFrontend` mapper para generar DTOs con campos calculados (duración, módulo, solicitanteNombre).

### submissionService.mjs (entregas del core y del panel)
- Funciones core: `crearEntrega`, `obtenerEntregasPorUsuario`, `obtenerEntregaPorId`, `actualizarEntrega`, `eliminarEntrega` (control de autorización y estados finales).
- Para el panel `/entregas`: `listarEntregasFrontend`, `obtenerEntregaFrontend`, `crearEntregaFrontend`, `actualizarEntregaFrontend`, `eliminarEntregaFrontend` aplican `submissionMapper` y normalizadores. Ya no se persiste `modulo`; se deriva/normaliza antes de construir el DTO.
- Estados se manejan únicamente con `reviewStatus`.

### userService.mjs
- CRUD panel: `listarUsuarios`, `obtenerUsuario`, `crearUsuario`, `actualizarUsuario`, `eliminarUsuario`.
- `listarUsuarios` aplica mapper y normalizadores para rol/estado/módulo. 
- `crearUsuario` delega en `authService.register`; ya no gestiona campos eliminados (no existen `moduloSlug`, `cohortLabel`, `isApproved`).
- Actualizaciones preservan coherencia de `moduleCode` y `cohorte` vía virtuales.

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

### `/slots` (operaciones sobre turnos - API unificada)
| Método | Ruta | Middlewares | Controlador -> Servicio | Notas |
| --- | --- | --- | --- | --- |
| GET | `/slots/` | `auth` | `obtenerTurnosController` -> `slotService.obtenerTurnosPorFiltro` | Filtra por query `cohort`. Alumno ve solo disponibles o propios; profesor/superadmin ven todos de su módulo.
| GET | `/slots/:id` | `auth`, `allowRoles(profesor,superadmin)`, `slotIdParamValidator`, `validateRequest` | `obtenerTurnoController` -> `slotService.obtenerTurno` | Obtiene un turno específico por ID.
| POST | `/slots/` | `auth`, `allowRoles(profesor,superadmin)`, `createSlotValidator`, `validateRequest` | `createSlotController` -> `slotService.crear` | Crea turno. Requiere fecha ISO.
| PATCH | `/slots/:id/solicitar` | `auth`, `allowRoles(alumno)`, `requireApproved`, `slotIdParamValidator`, `validateRequest` | `solicitarTurnoController` -> `slotService.solicitarTurno` | Alumno reserva turno.
| PATCH | `/slots/:id/estado` | `auth`, `allowRoles(profesor,superadmin)`, `slotIdParamValidator`, `updateEstadoValidator`, `validateRequest` | `actualizarEstadoRevisionController` -> `slotService.actualizarEstadoRevision` | Cambia reviewStatus (aprobado/pendiente/cancelado).
| PATCH | `/slots/:id/cancelar` | `auth`, `allowRoles(alumno)`, `requireApproved`, `slotIdParamValidator`, `validateRequest` | `cancelarTurnoController` -> `slotService.cancelarTurno` | Libera slot reservado.
| GET | `/slots/mis-solicitudes` | `auth`, `allowRoles(alumno)`, `requireApproved` | `misSolicitudesController` -> `slotService.obtenerSolicitudesPorAlumno` | Lista reservas del alumno.

### `/submissions` (API de alumnos/profesores)
| Método | Ruta | Middlewares | Controlador -> Servicio | Descripción |
| --- | --- | --- | --- | --- |
| GET | `/submissions/detail/:id` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `param`, `validateRequest` | `obtenerEntregaPorIdController` -> `submissionService.obtenerEntregaPorId` | Controla permisos por rol.
| GET | `/submissions/:userId` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `param`, `validateRequest` | `obtenerEntregasPorUsuarioController` -> `submissionService.obtenerEntregasPorUsuario` | Alumnos solo propios.
| POST | `/submissions/:id` | `auth`, `allowRoles(alumno)`, `requireApproved`, `param`, `submissionValidator`, `validateRequest` | `crearEntregaController` -> `submissionService.crearEntrega` | `:id` = slot reservado.
| PUT | `/submissions/:id` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `requireApproved`, `param`, `submissionValidator`, `validateRequest` | `actualizarEntregaController` -> `submissionService.actualizarEntrega` | Restringe ediciones finales.
| DELETE | `/submissions/:id` | `auth`, `allowRoles(alumno,profesor,superadmin)`, `requireApproved`, `param`, `validateRequest` | `eliminarEntregaController` -> `submissionService.eliminarEntrega` | 204 sin cuerpo.



### `/entregas` (panel administrativo sobre submissions)
Middlewares globales: `auth`, `allowRoles(profesor,superadmin)` (aplicados con `router.use`).

| Método | Ruta | Controlador -> Servicio | Notas |
| --- | --- | --- | --- |
| GET | `/entregas/` | `listarEntregasController` -> `submissionService.listarEntregasFrontend` | Lista todas las entregas con filtros.
| GET | `/entregas/:id` | `obtenerEntregaPorIdController` -> `submissionService.obtenerEntregaFrontend` | Obtiene entrega específica.
| POST | `/entregas/` | `crearEntregaController` -> `submissionService.crearEntregaFrontend` | Crea nueva entrega.
| PUT | `/entregas/:id` | `actualizarEntregaController` -> `submissionService.actualizarEntregaFrontend` | Actualiza entrega existente.
| DELETE | `/entregas/:id` | `eliminarEntregaController` -> `submissionService.eliminarEntregaFrontend` | Elimina entrega (204).

### `/usuarios` (gestión de usuarios)
Middlewares globales: `auth`, `allowRoles(superadmin, profesor)` (aplicados con `router.use`).

| Método | Ruta | Controlador -> Servicio | Notas |
| --- | --- | --- | --- |
| GET | `/usuarios/` | `listarUsuariosController` -> `userService.listarUsuarios` | Soporta filtros por `role` y `moduleNumber`. Profesor ve solo usuarios de su módulo.
| GET | `/usuarios/:id` | `obtenerUsuarioController` -> `userService.obtenerUsuario` | Obtiene usuario específico.
| POST | `/usuarios/` | `crearUsuarioController` -> `userService.crearUsuario` | Crea nuevo usuario (delega a authService.register).
| PUT | `/usuarios/:id` | `actualizarUsuarioController` -> `userService.actualizarUsuario` | Actualiza usuario existente.
| DELETE | `/usuarios/:id` | `eliminarUsuarioController` -> `userService.eliminarUsuario` | Elimina usuario (204).

## 6. Middlewares clave (`middlewares/`)
### Arquitectura de Inversión de Control
Todos los middlewares **lanzan errores** en lugar de responder directamente. El `errorHandler.mjs` centraliza todas las respuestas HTTP.

- **`auth.mjs`**: 
  * Exige `Authorization: Bearer <token>`, valida JWT.
  * **Lanza** `throw { status: 401, message: "Token requerido" }` si falta token.
  * **Lanza** `throw { status: 401, message: "Token inválido o expirado" }` si JWT inválido.
  * Adjunta usuario en `req.user` / documento en `req.userDocument` si válido.

- **`roles.mjs`**: 
  * `allowRoles(...roles)` valida que `req.user.role` esté en la lista permitida.
  * **Lanza** `throw { status: 401, message: "No autorizado" }` si no hay usuario.
  * **Lanza** `throw { status: 403, message: "Acceso denegado" }` si rol no permitido.

- **`requireApproved.mjs`**: 
  * Valida que la cuenta esté aprobada: `req.userDocument.status === "Aprobado"`.
  * **Lanza** `throw { status: 403, message: "Tu cuenta debe ser aprobada por un profesor o administrador" }` si no aprobado.
  * Nota: El campo `isApproved` fue eliminado del modelo.

- **`validationResult.mjs`**: 
  * Procesa errores de `express-validator`.
  * **Lanza** `throw { status: 400, message: "Error de validacion", errores: [{campo, mensaje}] }` si hay errores.
  * Genera array `errores` con formato: `[{ campo: "fieldName", mensaje: "error message" }]`.

- **`errorHandler.mjs`**: 
  * Middleware final que captura todos los errores lanzados.
  * Extrae `status` del error (default 500) y devuelve:
    ```json
    {
      "message": "mensaje descriptivo",
      "errores": [/* opcional, solo en validaciones */]
    }
    ```
  * **NO** incluye campos legacy (`msg`, `code`, `status` en body).

## 7. Validadores (`validators/`)
- `assignmentValidator`: obliga `title`, `description`, `dueDate` (ISO) y `module` entero.
- `authValidator`: valida login/registro aceptando email o username alfanumérico, exige contraseñas =6 caracteres y `cohort` numérico opcional.
- `slotValidator`: controla ID de turno, fecha ISO, horarios `HH:MM`, `cohort/reviewNumber` enteros, estados permitidos.
- `submissionValidator`: chequea `assignment` como ObjectId opcional, `githubLink` o `link` apuntando a `github.com`, `renderLink` válido.

## 8. Utilidades y otros componentes
- **`utils/permissionUtils.mjs`**: Centraliza lógica de permisos:
  * `buildModuleFilter(user, options)`: Genera filtros de consulta según rol y módulo del usuario.
  * `buildUserListFilter(user, queryFilters)`: Filtros específicos para listado de usuarios.
  * `getModuleNumber(user)`: Extrae número de módulo desde `moduleNumber`, `moduleCode` o `cohort`.
- **`utils/moduleMap.mjs`**: Mapea número ↔ etiqueta de módulo; funciones `ensureModuleLabel`, `labelToModule`.
- **`utils/security/sanitizeUser.mjs`**: Elimina `passwordHash`, `__v` y metadata antes de exponer usuarios.
- **`utils/mappers/`**: 
  * `slotMapper.mjs`: Transforma slots DB a DTO frontend con campos calculados (duración, fechas ISO, módulo, solicitanteNombre).
  * `submissionMapper.mjs`: Normaliza submissions usando campo `id` (no `_id`) y resuelve estado canonical.
  * `userMapper.mjs`: Formatea usuarios para respuestas frontend (incluye `moduleLabel`, `isApproved` virtual).
- **`utils/normalizers/normalizers.mjs`**: Funciones de normalización de strings, estados, fechas y números; constantes `REVIEW_STATUS_CANONICAL`, `ESTADO_TO_REVIEW_STATUS`, `VALID_ESTADOS`.
- **`utils/validation/dbValidation.mjs`**: Validaciones de ObjectId y lógica de negocio.
- **`repository/slotRepository.mjs`**: Hace `populate` de `assignment` y `student` para entregar contexto completo a los servicios.
- **Directorios extra**: `scripts/` (seed/reset/índices), `logs/`, `tests/`, `public/`, `constants/`.

## 9. Testing y Quality Assurance

### Suite de Tests (Vitest + Supertest)
**71 tests en total** distribuidos en 7 archivos:

#### Tests Core (44 tests originales)
1. **`tests/auth.test.mjs`** (7 tests)
   - Login con credenciales del seed
   - Registro de alumnos (status pendiente)
   - Email duplicado (409)
   - Login exitoso sin exponer passwordHash
   - Login con contraseña incorrecta (401)
   - Aprobación de usuarios por superadmin
   - Autorización 403 para alumnos en listado de usuarios

2. **`tests/assignment.test.mjs`** (9 tests)
   - Alumno no puede crear asignación (403)
   - Validación de dueDate inválido (400)
   - Ownership del profesor creador
   - Profesor ajeno no puede actualizar/eliminar (403)
   - Superadmin puede actualizar/eliminar cualquier asignación
   - Listado filtrado por módulo del profesor
   - Campos extra ignorados en creación

3. **`tests/submission.test.mjs`** (7 tests)
   - Alumno no puede entregar sin reservar turno (403)
   - Validación de links de GitHub
   - Estado "A revisar" tras creación
   - Alumnos no pueden ver entregas ajenas (403)
   - Alumnos no pueden editar entregas de otros (403)
   - Superadmin puede consultar cualquier entrega
   - Profesor aprueba entrega y alumno no puede modificarla (409)

4. **`tests/slot.test.mjs`** (6 tests)
   - Alumno de otro módulo no puede reservar (403)
   - Alumno sin aprobación no puede solicitar (403)
   - Profesor actualiza estado del turno
   - Alumno no autorizado no puede cambiar estado (403)
   - Validación de estado inválido (400)
   - Prevención de doble reserva (403)

5. **`tests/user.test.mjs`** (5 tests)
   - Superadmin lista usuarios sin exponer datos sensibles
   - Profesor filtra usuarios por rol
   - Superadmin filtra por módulo
   - Alumno recibe 403 al listar usuarios
   - Superadmin aprueba usuarios pendientes

6. **`tests/cohort-isolation.test.mjs`** (10 tests)
   - Aislamiento de datos por cohorte/módulo
   - Alumnos solo ven asignaciones/turnos de su módulo
   - Profesores solo gestionan su módulo
   - Prevención de acceso cross-cohorte

#### Tests de Manejo de Errores (27 tests nuevos)
7. **`tests/error-handling.test.mjs`** (27 tests)
   Valida el contrato de error unificado `{message, errores?}` sin campos legacy:

   **a) Middlewares de Autenticación - 401** (4 tests)
   - GET /slots sin token
   - POST /assignments sin token
   - PATCH /auth/aprobar/:id sin token
   - Token inválido/expirado

   **b) Middlewares de Autorización - 403** (4 tests)
   - Alumno intentando crear asignación
   - Alumno intentando listar usuarios
   - Alumno intentando crear slot
   - Profesor intentando aprobar usuario (404 si ID inexistente)

   **c) Middleware requireApproved - 403** (1 test)
   - Alumno no aprobado intentando solicitar turno

   **d) Middleware de Validación - 400** (4 tests)
   - POST /assignments con dueDate inválido (con array `errores`)
   - POST /assignments sin campos requeridos
   - PATCH /slots/:id/estado con estado inválido
   - POST /auth/register sin password

   **e) Servicios - Errores 404** (8 tests)
   - GET /assignments/:id con ID inválido (400 por validación de parámetro)
   - GET /assignments/:id con ID válido inexistente (404)
   - GET /slots/:id con ID inválido (400/404 por validación)
   - GET /slots/:id con ID válido inexistente (404)
   - PUT /assignments/:id con ID inválido (400 por validación)
   - DELETE /assignments/:id con ID inválido (400 por validación)
   - PATCH /auth/aprobar/:id con ID inválido (404)
   - PATCH /auth/aprobar/:id con ID válido inexistente (404)

   **f) Servicios - Errores de Negocio** (5 tests)
   - POST /auth/login con credenciales incorrectas (401)
   - POST /auth/register con email duplicado (409)
   - PATCH /slots/:id/solicitar sin reservar (403)
   - PATCH /slots/:id/solicitar turno ya reservado (403)
   - PUT /submissions/:id de entrega aprobada (409 conflicto)

   **g) Verificación de Formato Unificado** (1 test)
   - Todos los errores 4xx/5xx devuelven solo `{message, errores?}`
   - Sin campos legacy: `msg`, `code`, `status` en body

### Configuración de Tests
- **Framework:** Vitest 3.2.4 con Supertest
- **Setup:** `tests/setup.mjs` - inicializa DB, crea superadmin, limpia después de cada suite
- **Helpers:** `tests/helpers/testUtils.mjs` - funciones de creación de usuarios base, asignaciones, turnos
- **Ejecución:**
  ```bash
  npm test                    # Suite completa con logs
  npx vitest run             # Ejecución directa
  npx vitest run --reporter=verbose  # Output detallado
  ```
- **Pre-test:** Script `crearSuperadmin.mjs` garantiza usuario admin existente
- **Coverage:** 71/71 tests passing (100%)

### Principios de Testing
1. **Aislamiento:** Cada test suite limpia la BD antes de ejecutar
2. **Datos realistas:** Usuarios base creados con roles/módulos variados
3. **Validación completa:** Status code + estructura de respuesta + campos específicos
4. **Seguridad:** Tests verifican que datos sensibles no se exponen
5. **Contratos:** Validación estricta del formato de error unificado

## 10. Arquitectura consolidada y eliminación de deuda técnica

### Consolidación de rutas (Noviembre 2025)
- **Eliminadas rutas duplicadas:** El endpoint legacy `/turnos` ha sido completamente eliminado. Toda la funcionalidad de gestión de turnos está ahora unificada en `/slots`.
- **Rutas activas finales:**
  * `/auth` - Autenticación y aprobación de usuarios
  * `/usuarios` - Gestión de usuarios (profesor/superadmin)
  * `/slots` - CRUD completo de turnos + operaciones de reserva
  * `/assignments` - Gestión de asignaciones
  * `/submissions` - API de entregas para alumnos/profesores
  * `/entregas` - Panel administrativo de entregas
- **Centralización de permisos:** Se creó `utils/permissionUtils.mjs` para centralizar la lógica de filtros por rol/módulo, eliminando duplicación en servicios.
- **Tests actualizados:** Suite completa migrada de rutas legacy a rutas consolidadas (71/71 tests passing).

## 11. Reglas y consideraciones para integrar un frontend a medida

### Autenticación y Seguridad
1. **JWT:** Todos los endpoints (excepto `/health`, `/auth/ping`, `/auth/login`, `/auth/register`) requieren header `Authorization: Bearer <token>`.
   - Payload JWT: `{ id, role }` firmado con `JWT_SECRET`, expiración 7 días.
   - Almacenar token en cliente y reenviarlo en cada petición.
   - Errores de auth: 401 con `{message: "Token requerido"}` o `{message: "Token inválido o expirado"}`.

2. **Roles y permisos:**
   - **`alumno`**: 
     * Listar/reservar/cancelar turnos (`/slots`)
     * Crear/editar sus propias submissions (bloqueadas si aprobadas)
     * Ver solo sus entregas
     * Requiere `status === "Aprobado"` para operaciones principales
   - **`profesor`**: 
     * Crear/editar/eliminar assignments propias
     * Crear/gestionar turnos (`/turnos` panel)
     * Aprobar/rechazar submissions y usuarios
     * Ver entregas de alumnos de su módulo
   - **`superadmin`**: 
     * Todos los permisos de profesor
     * Gestión completa de usuarios (`/usuarios`)
     * Puede modificar/eliminar recursos de otros profesores

### Manejo de Errores en el Cliente
3. **Formato de respuesta de error:**
   ```typescript
   interface ErrorResponse {
     message: string;           // Mensaje descriptivo
     errores?: Array<{          // Solo en errores de validación
       campo: string;
       mensaje: string;
     }>;
   }
   ```
   - **NO** esperar campos legacy: `msg`, `code`, `status` en body.
   - El status HTTP viene en `response.status` (401, 403, 404, 400, 409, 500).

4. **Códigos de estado comunes:**
   - `400`: Validación fallida (incluye array `errores`)
   - `401`: No autenticado (token faltante/inválido)
   - `403`: Acceso denegado (rol insuficiente, cuenta no aprobada, recurso ajeno)
   - `404`: Recurso no encontrado (ID inválido o inexistente)
   - `409`: Conflicto de negocio (email duplicado, entrega ya aprobada, turno reservado)
   - `500`: Error interno del servidor

### Datos y Formatos
5. **Estados canónicos:**
   - **Turnos (ReviewSlot):** 
     * `estado`: `"Disponible"` | `"Solicitado"` | `"Aprobado"` | `"Rechazado"`
     * `reviewStatus`: `"A revisar"` | `"Aprobado"` | `"Desaprobado"`
   - **Submissions:** 
     * `reviewStatus`: `"A revisar"` | `"Aprobado"` | `"Desaprobado"` | `"Pendiente"` | `"Rechazado"`
   - **Usuarios:** 
     * `status`: `"Pendiente"` | `"Aprobado"` | `"Rechazado"`
     * Nota: Campo `isApproved` eliminado, derivar de `status === "Aprobado"`

6. **Módulos/cohortes:**
   - Etiquetas canónicas: `"HTML-CSS"`, `"JAVASCRIPT"`, `"BACKEND - NODE JS"`, `"FRONTEND - REACT"`
   - Backend normaliza y convierte a números internamente.
   - Usuarios tienen `moduleCode` (número) y `moduleLabel` (virtual, etiqueta).

7. **DTOs Frontend:**
   - **Turnos:** Campo `id` (no `_id`), incluye `modulo`, `profesorId`, `zoomLink`, fechas ISO, `estado`, `reviewStatus`, `solicitanteId`, `solicitanteNombre`, duración calculada.
   - **Submissions:** Campo `id` (no `_id`), incluye `assignmentId`, `studentId`, `alumnoNombre`, `githubLink`, `renderLink`, `comentarios`, `reviewStatus`, timestamps. Módulo se deriva vía `assignment`.
   - **Usuarios:** Campos sanitizados (sin `passwordHash`, `__v`).

### Validaciones del Cliente
8. **Antes de enviar:**
   - Fechas en formato ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`)
   - Horarios en formato `HH:MM` (24 horas)
   - Links de GitHub: deben contener `github.com`
   - Emails válidos (regex server-side flexible pero recomendable validar cliente)
   - IDs: 24 caracteres hexadecimales (ObjectId de MongoDB)

### Deployment y Configuración
9. **Variables de entorno:**
   - `MONGO_URL`: Conexión a MongoDB (actualmente Atlas)
   - `JWT_SECRET`: Clave secreta para firmar JWT
   - **CRÍTICO:** Valores en `.env` son de desarrollo; **SOBRESCRIBIR** en producción.

10. **Health Check:**
    - `GET /health` → `{status: "ok"}` (sin autenticación)
    - Usar para verificar disponibilidad del servidor

### Estado del Sistema
Este reporte refleja el estado **ACTUAL** tras:
- ✅ Refactorización de modelos (eliminación de campos redundantes `isApproved`, `nombre`, `apellido`, etc.)
- ✅ Arquitectura de **Inversión de Control** (middlewares lanzan errores, errorHandler centraliza respuestas)
- ✅ Estandarización de manejo de errores (formato único `{message, errores?}`)
- ✅ **Consolidación de rutas** (eliminación completa de `/turnos` duplicado, funcionalidad unificada en `/slots`)
- ✅ **Centralización de permisos** (creación de `permissionUtils.mjs` con `buildModuleFilter`, `buildUserListFilter`)
- ✅ **Filtrado defensivo** para alumnos en slots (solo ven disponibles o propios, normalización de `student._id`)
- ✅ Suite de tests completa (71/71 passing) validando contratos de error y migrada a rutas consolidadas
- ✅ Mappers y normalizadores para DTOs consistentes
- ✅ Validación de IDs en servicios (404 para IDs inexistentes)
- ✅ Eliminación física de archivos obsoletos (`turnosRoutes.mjs`, imports redundantes)

**Última actualización:** 22 Noviembre 2025 - Sistema completamente consolidado, sin deuda técnica legacy, listo para integración frontend.
