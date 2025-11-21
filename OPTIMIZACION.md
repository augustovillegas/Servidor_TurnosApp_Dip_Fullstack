A partir de la lógica implementada para el filtrado obligatorio por Módulo (campo 'cohort' en req.user) en los servicios, el siguiente paso es actualizar los scripts de prueba para garantizar la funcionalidad y la seguridad.

El objetivo es crear un conjunto de tests de integración para las rutas de listado y creación, verificando que la data devuelta o creada respete la segmentación por Módulo.

### Módulos de Prueba

Para la prueba, se deben simular al menos tres usuarios y dos módulos distintos:
1.  **MÓDULO 1 (HTML - CSS):** Profesor_M1, Alumno_M1
2.  **MÓDULO 2 (JAVASCRIPT):** Profesor_M2, Alumno_M2
3.  **SUPERADMIN:** Visión total.

### Casos de Prueba Requeridos

Generar tests de integración (usando el cliente HTTP/supertest) para los siguientes escenarios en los servicios mencionados:

#### 1. Tests de Listado de Datos (/slots, /assignments, /submissions, /users)

| Escenario | Rol del Usuario | Módulo del Usuario | Acción | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | Profesor_M1 | M1 | `GET /slots` (Listar Turnos) | Debe recibir turnos **SOLO de M1**. No debe recibir turnos de M2. |
| **P2** | Profesor_M1 | M1 | `GET /assignments` (Listar Asignaciones) | Debe recibir asignaciones **SOLO de M1**. No debe recibir asignaciones de M2. |
| **P3** | Profesor_M2 | M2 | `GET /users` (Listar Usuarios) | Debe recibir **SOLO alumnos de M2**. No debe recibir alumnos de M1 ni otros profesores. |
| **P4** | Alumno_M1 | M1 | `GET /submissions` (Listar Entregas) | Debe recibir **SOLO sus propias entregas de M1**. No debe recibir entregas de Alumno_M2. |
| **P5** | Alumno_M2 | M2 | `GET /slots` | Debe recibir turnos **SOLO de M2** y solo aquellos disponibles (`student: null`) o reservados por él mismo. |
| **P6** | Superadmin | N/A | `GET /slots` | Debe recibir **TODOS los turnos** (de M1 y M2). |
| **P7** | Profesor_M1 | M1 | `GET /submissions` (Listar Entregas) | Debe recibir **todas las entregas de M1**, incluyendo las de Alumno_M1. |

#### 2. Tests de Integridad en la Creación de Datos

| Escenario | Rol del Usuario | Módulo del Usuario | Acción | Payload Enviado | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C1** | Profesor_M1 | M1 | `POST /slots` (Crear Turno) | `{ cohort: M2, ... }` | El turno se crea correctamente, pero con **`cohort: M1`** (forzado por el `req.user`). |
| **C2** | Profesor_M2 | M2 | `POST /assignments` (Crear Asignación) | `{ cohort: M1, ... }` | La asignación se crea correctamente, pero con **`cohort: M2`** (forzado por el `req.user`). |
| **C3** | Alumno_M1 | M1 | `POST /slots` | `{...}` | **Falla** con status 403 (No autorizado por Rol), ya que los alumnos no pueden crear turnos. |

### Tarea a Realizar

1.  **Actualizar el *script* de *seeds*** para que cree usuarios y data (turnos, asignaciones) distribuidos entre MÓDULO 1 y MÓDULO 2.
2.  **Implementar los tests** para todos los escenarios P1 a P7 y C1 a C3.
3.  **Lanzar el *test suite*** y utilizar el *log* de *output* para identificar cualquier servicio que aún dependa de `req.query` o falle la segmentación de datos por Módulo.
4.  **Ajustar la lógica** en los servicios si los tests fallan, hasta que todos los escenarios pasen y el comportamiento de aislamiento por Módulo sea el esperado.