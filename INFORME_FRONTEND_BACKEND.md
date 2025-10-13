# Informe de Integracion Frontend ↔ Backend

## 1. Resumen ejecutivo
- El frontend (React + Vite + Tailwind) modela tres entidades principales: `turnos`, `entregas` y `usuarios`, mas un flujo de autenticacion pendiente.  
- Solo `turnos` esta conectado a servicios Axios (`src/services/turnosService.js`). `entregas` y `usuarios` se mantienen en LocalStorage.  
- No se encontraron archivos de backend (`routes/*.mjs`, `services/*.mjs`) en el repo, por lo que los endpoints requeridos aun no existen o no son visibles en esta base de codigo.  
- Para cumplir con el Sprint 5 se necesita exponer una API REST que sincronice esas entidades y respete los formatos y validaciones que hoy realiza el frontend.  
- Tambien se requiere ajustar la configuracion de entorno (`API_BASE_URL` debería ser `VITE_API_BASE_URL`) para que Vite exponga la variable a `import.meta.env`.

## 2. Entidades y datos esperados por el frontend
| Entidad | Campos clave esperados | Fuente actual | Uso principal |
|---------|-----------------------|---------------|---------------|
| `turno` | `id`, `review` (numero), `fecha` (DD/MM/AAAA), `horario` (“HH:MM - HH:MM”), `sala`, `zoomLink`, `estado` (`Disponible`, `Solicitado`, `Aprobado`, `Rechazado`), `start`, `end` (ISO), `comentarios` | API `/turnos` (mock) via `AppContext` | CRUD completo, asignacion, aprobacion, seguimiento y calculo de totales |
| `entrega` | `id`, `sprint`, `githubLink`, `renderLink`, `comentarios`, `reviewStatus` (`A revisar`, `Aprobado`, `Rechazado`), `estado`, `alumno`, `fechaEntrega` | LocalStorage (`AppContext`) | Registro por alumnos, revision por docentes, control de estados |
| `usuario` | `id`, `nombre`, `rol` (`Alumno`, `Profesor`, `Superadmin`), `estado` (`Pendiente`, `Aprobado`, `Rechazado`) | LocalStorage (`AppContext`) | Aprobacion manual por profesor/superadmin, filtros de acceso |
| `auth` (futuro) | `email/usuario`, `password`, `rol`, tokens | No implementado | Formulario de login en `Login.jsx` (solo UI) |

## 3. Endpoints requeridos por pagina / componente
| Componente / Pagina | Entidad | Accion requerida | Metodo HTTP | Endpoint necesario | Estado actual | Observaciones |
|---------------------|---------|------------------|-------------|--------------------|---------------|---------------|
| `AppContext` | turnos | Listar inicial | GET | `/turnos` | Implementado via Axios mock | Debe devolver arreglo de turnos con campos mencionados y `id` unico |
| `AppContext` | turnos | Crear | POST | `/turnos` | Mock | Backend debe validar payload (horarios coherentes, zoomLink) y responder objeto creado |
| `AppContext` | turnos | Actualizar | PUT | `/turnos/:id` | Mock | Usado para solicitar, aprobar, rechazar y cancelar turnos; debe aceptar cambios de `estado`, `comentarios` |
| `AppContext` | turnos | Eliminar | DELETE | `/turnos/:id` | Mock | Utilizado en CRUD y para limpieza desde `CreateTurnos`/`ItemsList` |
| `AppContext` | turnos | Buscar por id | GET | `/turnos/:id` | Mock | Requerido por `ItemDetail` y `ItemEdit` |
| `DashboardAlumno` | turnos | Solicitar turno | PUT | `/turnos/:id/solicitud` (o mismo `/turnos/:id`) | Simulado | Cambia `estado` a `Solicitado`, preserva resto del turno |
| `DashboardAlumno` | turnos | Cancelar solicitud | PUT | `/turnos/:id/cancelacion` | Simulado | Restablece `estado` a `Disponible` |
| `DashboardAlumno` | entregas | Listar propias | GET | `/entregas?alumno=:id` | Solo LocalStorage | Necesita soporte por usuario autenticado, paginacion opcional |
| `DashboardAlumno` | entregas | Crear | POST | `/entregas` | Solo LocalStorage | Backend debe validar URLs y sprint, devolver `reviewStatus` inicial `A revisar` |
| `DashboardAlumno` | entregas | Cancelar | DELETE | `/entregas/:id` | Solo LocalStorage | Solo permitido mientras `reviewStatus === "A revisar"` |
| `DashboardProfesor` | turnos | Listar pendientes | GET | `/turnos?estado=Solicitado` | Mock | Utiliza `ReviewFilter` para filtrar por numero de review |
| `DashboardProfesor` | turnos | Aprobar / rechazar | PUT | `/turnos/:id` | Mock | Debe registrar `estado` final y opcionalmente comentarios |
| `DashboardProfesor` | usuarios | Listar pendientes | GET | `/usuarios?estado=Pendiente&rol=Alumno` | LocalStorage | Necesario para onboarding de alumnos |
| `DashboardProfesor` | usuarios | Aprobar | PUT | `/usuarios/:id` | LocalStorage | Posible uso de `PATCH` para cambiar `estado` |
| `DashboardSuperadmin` | turnos | Listar | GET | `/turnos?estado=Solicitado` | Mock | Mismas necesidades que profesor |
| `DashboardSuperadmin` | turnos | Aprobar / rechazar | PUT | `/turnos/:id` | Mock | Idem |
| `DashboardSuperadmin` | usuarios | Listar | GET | `/usuarios?estado=Pendiente` | LocalStorage | Gestion total (aprobar y rechazar) |
| `DashboardSuperadmin` | usuarios | Aprobar / rechazar | PUT | `/usuarios/:id` | LocalStorage | Debe gestionar `estado` y, opcionalmente, enviar invitaciones |
| `DashboardSuperadmin` | entregas | Revisar | GET | `/entregas?estado=Pendiente` | LocalStorage | `EvaluarEntregas` reutilizado; necesita info de alumno y enlaces |
| `EvaluarEntregas` | entregas | Aprobar / rechazar | PUT | `/entregas/:id` | LocalStorage | Cambia `estado` y mantiene historico |
| `CreateTurnos` | turnos | Crear masivo | POST | `/turnos` | Mock | Reutiliza validaciones de `turnoHelpers`; backend debe generar `start/end` coherentes |
| `CreateTurnos` | turnos | Editar existente | PUT | `/turnos/:id` | Mock | Soporta `comentarios` y transicion de `estado` |
| `CreateTurnos` | turnos | Eliminar | DELETE | `/turnos/:id` | Mock | Confirmacion via SweetAlert |
| `ItemsList` | turnos | Listar y borrar | GET / DELETE | `/turnos`, `/turnos/:id` | Mock | Tabla administrativa, reutiliza `removeTurno` |
| `ItemDetail` | turnos | Obtener detalle | GET | `/turnos/:id` | Mock | Debe retornar todos los campos, incluso `comentarios` |
| `Login` | auth | Autenticar usuario | POST | `/auth/login` | No implementado | Para Sprint 5 se espera integrarlo con control de roles |
| `RequestsPanel` | turnos | Listar solicitudes activas | GET | `/turnos?estado=Solicitado` | Mock | Panel lateral usa conteo `totalTurnosSolicitados` |
| `ThemeProvider` | (preferencias) | Guardar tema | PATCH/POST opcional | `/usuarios/:id/preferences` | LocalStorage | Solo si se desea persistir en servidor |

## 4. Mapa de correspondencia Frontend ↔ Backend actual
| Entidad | Endpoint esperado | Endpoint backend detectado | Coincide | Requiere accion |
|---------|-------------------|----------------------------|----------|-----------------|
| turnos | `/turnos` (GET/POST/PUT/DELETE) | No se hallo backend en repo | ✗ | Implementar controlador REST completo con validaciones |
| entregas | `/entregas` (GET/POST/PUT/DELETE) | No disponible | ✗ | Crear recursos para registro y evaluacion de entregas |
| usuarios | `/usuarios` (GET/PUT) | No disponible | ✗ | Exponer endpoints para aprobacion y gestion de roles |
| auth | `/auth/login` | No disponible | ✗ | Integrar autenticacion y manejo de sesiones/tokens |
| metrics | `/turnos/metrics` (opcional) | No disponible | ✗ | Podria optimizar contadores (`totalTurnosSolicitados`) |
| config | `/config` (opcional) | No disponible | ✗ | Actual placeholder en `SideBar` |

> Nota: El repositorio no contiene archivos `routes` o `services` para backend. Si existen en otro repositorio, se recomienda alinear los nombres de recursos con los descritos arriba para evitar ajustes adicionales en el frontend.

## 5. Validaciones y formato de datos a replicar en el backend
- **Turnos** (`buildTurnoPayloadFromForm` / `validateTurnoForm`):  
  - `fecha` obligatoria y convertida a string local `DD/MM/AAAA`.  
  - `horaInicio` < `horaFin`; se calculan `start`/`end` ISO y `horario` legible.  
  - `zoomLink` obligatorio; `sala` no vacia; `review` numerico > 0.  
  - Estados esperados: `Disponible`, `Solicitado`, `Aprobado`, `Rechazado`.
- **Entregas** (`EntregaForm`, `CardEntrega`, `EvaluarEntregas`):  
  - `sprint` requerido (valores 1-5).  
  - `githubLink` y `renderLink` deben comenzar con `http`.  
  - `reviewStatus` inicia en `A revisar`; solo se puede cancelar si sigue en ese estado.  
  - `EvaluarEntregas` espera atributos `alumno`, `fechaEntrega`, `estado` (fallback `Pendiente`).
- **Usuarios pendientes**: objetos necesitan `id`, `nombre`, `rol`, `estado`. Cambios actuales solo actualizan `estado`, pero backend debe registrar auditoria/fecha de decision.
- **Toasts/Alerts**: backend debe retornar mensajes claros (`{ message: "..." }`) porque los interceptores Axios muestran `error.message`.  
- **Ergonomia**: `RequestsPanel` asume que el listado de turnos se mantiene actualizado tras cada `PUT`. Backend deberia responder con el objeto actualizado para refrescar el store.

## 6. Riesgos y recomendaciones
1. **Variable de entorno**: cambiar `import.meta.env.API_BASE_URL` por `import.meta.env.VITE_API_BASE_URL` en `src/services/apiClient.js` y definirla en `.env` para que Vite la exponga.  
2. **Fuente de datos unica**: reemplazar el uso de LocalStorage para `entregas` y `usuarios` por llamadas al backend, manteniendo localStorage solo como cache opcional.  
3. **Sincronizacion multiusuario**: considerar WebSockets o revalidaciones periodicas para que las vistas de profesor/superadmin vean actualizaciones de alumnos en tiempo real.  
4. **Autenticacion**: el formulario de `Login` no realiza ninguna llamada; se necesita endpoint `POST /auth/login` que devuelva token, rol y datos del usuario. El frontend luego deberia guardar ese contexto y proteger rutas.  
5. **Control de permisos**: todos los endpoints deben validar rol (alumno/mentor/superadmin) para impedir que un alumno apruebe o rechace turnos de otros.  
6. **Manejo de estados**: normalizar estados en backend (usar enums) para evitar discrepancias con strings utilizados por componentes `Status`.  
7. **Datos de referencia**: proveer seeds iniciales (turnos disponibles, usuarios pendientes) para facilitar pruebas y coincidir con supuestos del frontend.  
8. **Sprint5.md**: el archivo aparece eliminado (`git status` lo marca como `D Sprint5.md`), por lo que se desconoce el detalle de requisitos. Recomiendo restaurarlo o compartirlo para validar el coverage del backend.  
9. **Resiliencia**: manejar errores 4xx/5xx con mensajes consistentes; el interceptor actual solo examina `error.response.data.message`.  
10. **Seguridad**: validar URLs enviadas (GitHub/Render) y evitar ejecucion de HTML en toasts; sanitizar entradas en backend.

## 7. Tareas sugeridas para el backend
- [ ] Definir y documentar contrato REST para `/turnos`, `/entregas`, `/usuarios`, `/auth`.  
- [ ] Implementar servicios y controladores correspondientes, incluyendo validaciones mencionadas.  
- [ ] Configurar CORS para permitir origen del frontend.  
- [ ] Ajustar cliente Axios (variable `VITE_API_BASE_URL`).  
- [ ] Agregar seeds o endpoints de inicializacion para facilitar desarrollo.  
- [ ] Integrar autenticacion y control de roles en rutas protegidas.  
- [ ] Exponer mensajes de error consistentes (`{ message, details }`).  
- [ ] Entregar coleccion de pruebas (Postman / Thunder) para QA.

Con estos ajustes, el backend podra cubrir completamente las expectativas del frontend y habilitar la integracion necesaria para el Sprint actual.
