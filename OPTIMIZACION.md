Sos un programador experto senior en backend.

Tu objetivo es **crear y/o actualizar la suite de tests unitarios/integración (Vitest)** para asegurar que la refactorización del manejo de errores sea 100% funcional y que no haya regresiones.

---

### ⚠️ Instrucción Crítica: Foco en la Inversión de Control

Los tests deben validar la **inversión de control** (que el Controller ya no responde errores y que el `errorHandler.mjs` lo hace) y el **nuevo contrato de errores** (`{ status, message, errores? }` sin campo `msg` ni `code`).

### **Paso 1: Validar Middlewares (Autenticación/Autorización)**

Crea o modifica los tests para los endpoints protegidos, asegurando que los Middlewares lancen el error canónico:

1.  **Test 401 (No Autenticado):** En rutas que requieren `auth`, verifica que si no se envía el token, la respuesta sea **status 401** y el body contenga solo `{ message: "Token requerido" }`.
2.  **Test 403 (Rol Denegado):** En rutas protegidas por `allowRoles('profesor')`, verifica que un usuario con rol 'alumno' reciba **status 403** y el body contenga `{ message: "Acceso denegado" }`.
3.  **Test 403 (Cuenta No Aprobada):** En rutas protegidas por `requireApproved`, verifica que un 'alumno' no aprobado reciba **status 403** y el body contenga el mensaje de aprobación pendiente.

### **Paso 2: Validar Middleware de Validación (`validationResult.mjs`)**

1.  **Test 400 (Validation Error):** En un `POST` o `PATCH` con validadores (ej. `slotValidator.mjs`, `assignmentValidator.mjs`), envía un payload intencionalmente inválido.
2.  **Aserción:** La respuesta debe ser **status 400** y el body debe contener **`{ message: "Error de validación", errores: [...] }`**, verificando que el array `errores` se mapee correctamente y que el campo `msg` (resumen) haya sido eliminado.

### **Paso 3: Validar Flujo de Servicio (404/Errores de Negocio)**

Crea o modifica tests de integración para asegurar que la lógica de existencia de recursos y formato de ID se ha movido al Service:

1.  **Test 404 (ID Inválido/No Existe):**
    * **ID Válido pero Inexistente:** Prueba una ruta con un ID de MongoDB con formato correcto pero que no exista en la BD (ej: `GET /slots/:id`). El Servicio debe lanzar `throw { status: 404, message: "Recurso no encontrado" }`, resultando en una respuesta **status 404**.
    * **ID Inválido (Formato):** Prueba una ruta con un ID que no cumpla el formato de Mongo ID (ej: `id=123`). El Servicio debe lanzar un error apropiado (probablemente 404, dependiendo de cómo manejes el `isValid`), resultando en una respuesta **status 404**.
2.  **Test 400/409 (Errores de Negocio):** Para servicios con lógica de negocio específica (ej: `authService.login` o `slotService.solicitarTurno`), asegúrate de que al fallar, lancen el `status` y `message` correctos (ej: **401** para credenciales inválidas en login, **400** para intentar solicitar un turno ya solicitado).

---

**Prioriza el trabajo en `auth.mjs`, `roles.mjs` y `slotController.mjs` / `slotService.mjs` ya que son los que tienen la mayor cantidad de lógica de respuesta HTTP a migrar.**