## 💻 Instrucciones para el Equipo de Backend (Corrección de Fallos Críticos)

Las siguientes tareas deben abordar los errores 4xx reportados por la suite de pruebas E2E, centrándose en la funcionalidad faltante y la validación del contrato de errores unificado.

### 1. 🛑 Implementación Crítica de Rutas Faltantes (Error 404)

El principal problema es la falta de soporte para las operaciones de modificación de `Slot` individuales.

* **Implementar `PUT /slots/:id`:**
    * Crear la ruta y el método en `slotsController` para manejar la actualización completa de un slot.
    * Debe invocar a la lógica de negocio en `slotService.actualizarTurno`.
    * Proteger la ruta con `auth` y `allowRoles(profesor, superadmin)`.
* **Implementar `DELETE /slots/:id`:**
    * Crear la ruta y el método en `slotsController` para manejar la eliminación de un slot.
    * Debe invocar a la lógica de negocio en `slotService.eliminarTurno`.
    * Proteger la ruta con `auth` y `allowRoles(profesor, superadmin)`.
* **Objetivo:** Resolver los errores **404** que fallan al intentar actualizar o eliminar turnos/slots.

### 2. ✅ Refuerzo en Contrato de Errores y Seguridad (400 / 403)

* **Validación de Datos (400):** Verificar que, en el test de `CreateUsers` (que falla con 400), el *payload* de error retorne estrictamente el formato esperado por el frontend: **`{ message: string, errores: [{campo: string, mensaje: string}] }`**. Esto asegura que `validationResult.mjs` no haya retornado un formato *legacy*.
* **Permisos en Entregas (403):** Corroborar la lógica en `submissionService` para garantizar que la consulta de entregas de un alumno **solo devuelva las suyas** (filtrado por `userId` del token). Esto valida la defensa de seguridad en profundidad reportada en los tests.

