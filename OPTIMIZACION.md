<!-- BACKEND_INSTRUCCIONES.md -->

# Plan de refactor y endurecimiento del backend

> Objetivo: simplificar y robustecer el servidor **sin cambiar el dominio** ni inventar nuevas capas “raras”.  
> Se trabajan solo **rutas, controladores, servicios y middlewares que ya existen**, ajustando su comportamiento y borrando lo que sobra.

---

## 0. Principios generales

1. **No crear rutas paralelas** (nada de duplicar `/turnos` como `/admin/turnos` ni cosas similares).  
   - Se trabaja sobre las rutas ya registradas en `server.mjs`: `/auth`, `/assignments`, `/slots`, `/submissions`, `/turnos`, `/entregas`, `/usuarios`, etc.
2. **No inventar nuevos modelos ni servicios**:
   - Se usan los modelos existentes (`User`, `ReviewSlot`, `Submission`, `Assignment`) y los services actuales (`slotService`, `submissionService`, `authService`, servicios “frontend”, etc.).
3. **Todo cambio de reglas de negocio va a los services**, no a los controladores ni a las rutas.
4. **Evitar duplicación**:
   - Si una misma validación o transformación existe en más de un sitio, se deja en un único service/función existente y se borra de los demás.
5. **Mantener el contrato con el frontend**:
   - Campos y nombres de rutas se respetan. Solo se endurece seguridad, claridad y validación.

---

## 1. Seguridad: rutas sin autenticación (`/turnos`, `/entregas`, `/usuarios`)

Estas rutas están pensadas “para panel interno”, pero ahora se van a proteger **sin cambiar su path ni su payload**.

### 1.1. Asegurar uso de middlewares de auth

1. Abrir los archivos de rutas correspondientes en `routes/*.mjs`:
   - `routes/turnosRoutes.mjs` (o nombre equivalente).
   - `routes/entregasRoutes.mjs`.
   - `routes/usuariosRoutes.mjs`.
2. Confirmar que en `server.mjs` estas rutas se montan algo así como:
   - `app.use('/turnos', turnosRouter);`
   - `app.use('/entregas', entregasRouter);`
   - `app.use('/usuarios', usuariosRouter);`
3. En cada router, **incluir el middleware de autenticación ya existente**:
   - Importar el middleware `auth` (el mismo usado por `/slots`, `/submissions`, `/assignments`, `/auth/me`, etc.).
   - Envolver todas las rutas de estos archivos con `auth`:
     - `router.use(auth);` al inicio del router.
4. Verificar que el frontend **ya envía `Authorization: Bearer`** (se hace desde `apiClient`, ver reporte de frontend). No hay que cambiar clientes.

### 1.2. Limitar por rol y aprobación

1. En los mismos routers de `/turnos`, `/entregas`, `/usuarios`:
   - Importar el middleware de roles que ya se utiliza en el canal autenticado (por ejemplo el que aplicas en `/assignments` y `/slots`).
   - Importar el middleware que refleja la lógica de “usuario aprobado” (`requireApproved` o equivalente).
2. Aplicar las reglas:
   - Para `/turnos` y `/entregas` (panel docente / superadmin):
     - Aplicar middleware de rol que permita solo `profesor` y `superadmin`.
   - Para `/usuarios`:
     - GET listado: solo `superadmin` (o el rol que ya decides como administrador global).
     - Alta/baja/modificación: mismo criterio.
3. Donde el backend ya aplica `requireApproved` en `/slots` o `/submissions`, **usar la misma lógica**:
   - Que un alumno no pueda ver ni tocar recursos si `status` o `isApproved` indican lo contrario.
4. Después de aplicar estos middlewares, ejecutar pruebas manuales:
   - Con un usuario alumno: intentar acceder a `/turnos`, `/entregas`, `/usuarios` → deben devolver 403/401.
   - Con profesor/superadmin: las rutas deben seguir funcionando como hasta ahora.

---

## 2. Claridad en `/submissions` (uso de `:id`)

La ruta `/submissions` usa `:id` con significados distintos según el método:

- `GET /submissions/detail/:id` → id de **submission**.
- `GET /submissions/:userId` → id de **usuario**.
- `POST /submissions/:id` → id de **slot**.
- `PUT /submissions/:id` → id de **submission**.
- `DELETE /submissions/:id` → id de **submission**.

El refactor aquí es **declarativo**, sin crear nuevas rutas:

1. Abrir el controller de `submissions` en `controllers/submissionsController.mjs` (o equivalente).
2. Para cada handler:
   - Dejar muy claro con **comentarios** qué representa `req.params.id`:
     - `// en POST, req.params.id es el ID del slot asociado`
     - `// en PUT/DELETE, req.params.id es el ID de la submission`
   - Comprobar que:
     - En `GET /submissions/detail/:id` y en `PUT`/`DELETE` usas `submissionService` recibiendo el id de submission.
     - En `POST /submissions/:id` usas el service que espera un `slot` y validas que `slot.student` coincida con el usuario autenticado.
3. En `routes/submissionsRoutes.mjs`:
   - Asegurarse de que no hay ambigüedades en orden de las rutas (primero rutas más específicas como `/detail/:id`, luego las genéricas `/:id`).
4. Añadir tests (o pruebas manuales) para los cuatro casos:
   - Crear entrega para un slot existente con alumno correcto → 201/200.
   - Intentar crear entrega para slot de otro alumno → 403.
   - Leer, actualizar y borrar por `submissionId` → 200/204 con los permisos correctos.

*(Si más adelante decides cambiar las rutas a algo como `/slots/:slotId/submissions` es otro refactor, pero no es parte de este plan.)*

---

## 3. Consistencia de estados (`estado` y `reviewStatus`)

Modelos implicados:

- `ReviewSlot`: campos `estado` y `reviewStatus`.
- `Submission`: campos `estado` y `reviewStatus`.

Objetivo: evitar combinaciones incoherentes (por ejemplo `estado = Aprobado` y `reviewStatus = A revisar`).

### 3.1. Definir en `services` la tabla de equivalencias

1. En `services/slotService.mjs`:
   - Localizar todas las partes donde se escriben o transforman `estado` y `reviewStatus`.
   - Asegurarse de que:
     - Cada cambio de `estado` se hace **en una sola función** del service.
     - Esa función ya existente:
       - Recibe el nuevo `estado` lógico (por ejemplo “Disponible”, “Solicitado”, “Aprobado”, “Rechazado”).
       - Ajusta internamente `reviewStatus` de forma consistente.
   - Quitar duplicaciones:
     - Si hay lógica similar en controllers, migrarla al service y dejar los controllers como simples pasadores de datos validados.
2. En `services/submissionService.mjs`:
   - Repetir el mismo proceso:
     - “Estados finales” (`Aprobado`, `Desaprobado`) deben impedir ediciones posteriores.
     - El mismo lugar del código debe encargarse de setear `estado` y `reviewStatus` juntos.
3. Revisar servicios “frontend”:
   - `frontendSlot...` y `frontendSubmission...` (los que adaptan para UI) deben **solo formatear**:
     - Labels de texto.
     - Cálculo de duración.
     - Visibilidad de campos.
   - Si allí hay reglas de negocio (p.ej. decidir si algo puede o no editarse) moverlas a los `services` principales.

---

## 4. Validación de entrada y protección contra “mass assignment”

En controllers de `User`, `ReviewSlot`, `Submission`, `Assignment`:

1. Abrir cada controller (`controllers/usersController.mjs`, `controllers/slotsController.mjs`, etc.).
2. Para cada operación de creación/actualización (`create`, `update`, etc.):
   - Verificar que **no** se hace algo como:
     - `Model.create(req.body);`
     - `Object.assign(modelInstance, req.body);`
   - En su lugar, el controller debe:
     - Extraer manualmente solo los campos permitidos desde `req.body`.
     - Pasar ese objeto al service:
       - Campos como `name`, `email`, `cohort`, `module`, `estado`, etc., según el modelo.
3. Confirmar que la validación con `express-validator`:
   - Se aplica realmente en las rutas.
   - Bloquea campos obligatorios: email válido, password longitud mínima, fecha en formato ISO, ObjectId para refs, etc.
4. En las rutas públicas “frontend” (`/turnos`, `/entregas`, `/usuarios`):
   - Asegurarse de que las validaciones son **mínimo igual de estrictas** que en la API autenticada.
   - Evitar que un payload mal formado pueda dejar estados incoherentes.

---

## 5. Configuración de Mongoose y arranque

### 5.1. `autoIndex` solo en desarrollo

1. Abrir `config/dbConfig.mjs`.
2. Cambiar la configuración de `mongoose.connect` para que:
   - `autoIndex` solo esté activado cuando `NODE_ENV` no es `production`.
3. Motivo:
   - Evitar coste de construcción de índices en caliente en producción.
   - Asegurarte de que los índices se crean vía migración o en una fase de despliegue controlada.

### 5.2. Manejo de errores globales

1. Revisar en `server.mjs` el manejo actual de:
   - `process.on('unhandledRejection', ...)`
   - `process.on('uncaughtException', ...)`
2. Confirmar la política:
   - En producción: loguear y terminar el proceso (para que el orquestador lo reinicie).
   - En desarrollo: mantener logs muy visibles.
3. Asegurarse de que el `errorHandler` registrado al final:
   - No filtra el stack en producción (mostrar solo mensaje genérico).
   - Sí puede mostrar detalles en desarrollo (`NODE_ENV !== 'production'`).

---

## 6. Manejo de errores y forma de respuesta (`errorHandler`)

1. Abrir el middleware `errorHandler` (generalmente en `middlewares/errorHandler.mjs` o similar).
2. Estándar de respuesta:
   - Asegurarse de que todos los errores enviados al frontend siguen el formato:
     - `{ message, msg, code }` o el formato que ya definiste en el reporte.
   - En producción:
     - `message` debe ser amable y genérico.
     - No exponer mensajes directos de Mongoose ni errores internos de Node.
3. Recorrer los controllers:
   - Confirmar que **no** se usan `res.status(500).json(err)` directos.
   - Siempre se delega al `next(err)` para centralizar el manejo en `errorHandler`.

---

## 7. Alineación con frontend y limpieza de servicios “frontend”

1. En `services/*.mjs` localizar los servicios etiquetados como “frontend”:
   - Los que adaptan datos para `/turnos`, `/entregas`, `/usuarios`.
2. Clasificar qué hacen:
   - Transformaciones de UI (labels, duraciones, campos opcionales) → se pueden dejar como están.
   - Reglas de negocio (quién puede modificar qué, cómo cambian estados) → deben moverse al service de dominio (`slotService`, `submissionService`, etc.).
3. Ajustar los controllers de rutas “frontend”:
   - Que llamen a los mismos servicios de dominio que usan `/slots` y `/submissions`.
   - Dejar los servicios “frontend” únicamente como capa de mapeo de entrada/salida (sin decidir reglas).

---

## 8. Checklist final de backend

Al terminar el refactor, comprobar:

- [ ] Todas las rutas `/turnos`, `/entregas`, `/usuarios` exigen JWT válido (`auth`).
- [ ] Esas rutas solo permiten roles adecuados (profesor/superadmin) y respetan aprobación del usuario.
- [ ] `/submissions` tiene bien documentado en comentarios qué significa `:id` en cada handler.
- [ ] No hay `create/update` que tomen `req.body` completo sin filtrar.
- [ ] Estados (`estado`, `reviewStatus`) se actualizan siempre desde services y de forma consistente.
- [ ] `autoIndex` está desactivado en producción.
- [ ] `errorHandler` es el único responsable de la respuesta de error hacia el cliente.
- [ ] Los servicios “frontend” ya no contienen reglas de negocio duplicadas.

