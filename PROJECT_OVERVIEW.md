# Proyecto Turnos App – Resumen Integral

Guía completa para comprender cómo está construido el frontend, cómo se conecta con el backend y cómo validar la integración extremo a extremo.

---

## 1. Arquitectura General

- **Framework**: React 19 + Vite 7 (ESM, plugin React SWC).  
- **Estilos**: Tailwind CSS 4 + componentes propios (Botones, Tablas, Sidebar, etc.).  
- **Estado global**: Context API (`AuthContext`, `AppContext`, `LoadingContext`, `ErrorContext`, etc.).  
- **UI/UX**: Routing con React Router v7 (modo futuro activado), toasts con `react-toastify`, animaciones con Framer Motion, íconos Bootstrap.  
- **HTTP Client**: Axios con interceptores (adjunta `Authorization` cuando hay token y hace logout ante 401).  
- **Testing**: Vitest (unit/integration/e2e en jsdom), Testing Library, MSW, script de smoke tests HTTP (`npm run test:api`).

Estructura base relevante:
```
turnos-app/
├─ src/
│  ├─ components/            # UI reutilizable
│  ├─ context/               # Auth, App data, Loading, Error, etc.
│  ├─ pages/                 # Dashboards y vistas principales
│  ├─ routes/                # Lazy routes para React Router
│  ├─ services/              # Clientes Axios (turnos, entregas, usuarios)
│  ├─ shell/Layout.jsx       # Envoltorio con Header/Footer y protecciones
│  └─ utils/                 # Helpers (formularios, feedback, etc.)
├─ test/                     # Integración/e2e + utilidades y logs
├─ scripts/                  # Herramientas adicionales (p.ej. apiSmokeTest)
└─ *.config / package.json
```

---

## 2. Configuración y Entorno

### Variables
- `.env` define `VITE_API_BASE_URL`. Actualmente: `http://localhost:3000`.  
- `src/services/apiClient.js` normaliza la URL, elimina `//` finales y usa fallback `http://localhost:3000` en modo dev si la env no existe.  
- El cliente se comporta igual para build y tests porque `test/setupTests.js` fuerza `process.env.VITE_API_BASE_URL` y stubea la variable para Vitest.

### Scripts relevantes
| Script | Propósito |
| --- | --- |
| `npm run dev` | Arranca Vite en modo desarrollo. |
| `npm run build` | Genera el bundle de producción. |
| `npm run lint` | Ejecuta ESLint (config `eslint.config.js`). |
| `npm run test` | Vitest completo (unit + integration + e2e) siguiendo `vite.config.js`. |
| `npm run test:e2e` | Ejecuta sólo los tests en `test/e2e`. |
| `npm run test:api` | Script Node que golpea la API real (ver sección 5). |

### Router y Layout
- Rutas declaradas en `src/router/createAppRouter.jsx`; `createRouterMemoria` permite usar un router de memoria para pruebas (resuelve automáticamente las rutas lazy para Vitest).  
- `src/shell/Layout.jsx` controla Header/Footer y protege `/dashboard/*`: si no hay token+usuario redirige a `/`.  
- `RequestsPanel` se muestra sólo en dashboards autenticados.

---

## 3. Contextos y Flujo de Datos

### AuthContext (`src/context/AuthContext.jsx`)
- Persistencia de `user` y `token` en `localStorage`, sincronizados entre pestañas.  
- `iniciarSesion` guarda credenciales; `cerrarSesion` limpia todo.  
- Usado por `Layout`, `AppContext`, dashboards y componentes que necesitan `usuario`/`token`.

### AppContext (`src/context/AppContext.jsx`)
Centraliza los datos de `turnos`, `entregas`, `usuarios` y expone métodos para CRUD, carga remota y métricas. Características:
- Persiste colecciones en `localStorage` (`useLocalStorage` custom).  
- En ausencia de token usa un seed local (`DEFAULT_TURNOS_SEED`) para onboarding.  
- Métodos clave: `loadTurnos`, `createTurno`, `updateTurno`, `removeTurno`, `findTurnoById`, equivalentes para entregas y usuarios (`approveUsuario`, `updateUsuarioEstado`).  
- Maneja loaders por recurso (`LoadingContext`) y notifica errores via `ErrorContext`.  
- Se apoya en los servicios Axios descritos más abajo.

### Otros contextos
- **LoadingContext**: trackea carga por etiquetas (`start/stop/isLoading`).  
- **ErrorContext**: centraliza mensajes de error para mostrar overlays/notificaciones.  
- **ModalContext**, **SoundContext**, **ThemeContext**: soporte UX (modales, sonidos retro, tema oscuro).  
- **AppProviders.jsx** compone todos los providers en el orden correcto.

---

## 4. Servicios HTTP y Contratos Esperados

### Cliente base (`src/services/apiClient.js`)
- Apunta a `import.meta.env.VITE_API_BASE_URL` (sin `/api`).  
- Request interceptor: lee `localStorage.token` y adjunta `Authorization`.  
- Response interceptor: ante 401 limpia storage y redirige a `/login` salvo en rutas públicas de auth.

### Servicios específicos
| Servicio | Archivo | Endpoints | Notas |
| --- | --- | --- | --- |
| Turnos | `src/services/turnosService.js` | `/turnos` (GET/POST/PUT/DELETE), `/turnos/:id` | `mapTurnoPayload` asegura `review`, `fecha`, `horario`, `start/end`, `estado`. |
| Entregas | `src/services/entregasService.js` | `/entregas` (GET/POST/PUT/DELETE) | Normaliza `sprint`, links, `estado`/`reviewStatus`, detecta `alumnoId`. |
| Usuarios | `src/services/usuariosService.js` | `/usuarios`, `/auth/aprobar/:id`, `/usuarios/:id` | `updateUsuarioEstado` usa `PUT /usuarios/:id` (alineado a backend). |
| Auth (uso directo) | `src/pages/Login.jsx`, `apiClient` | `/auth/login` | Se requiere `user.isApproved` previo para navegar al dashboard según rol. |

### Correspondencia con backend (según `REPORTE_FRONTEND.md`)
- Backend expone rutas **sin prefijo `/api`**: `/turnos`, `/entregas`, `/usuarios`, `/auth`, `/slots`, `/assignments`, etc.  
- Estados válidos: turnos (`Disponible`, `Solicitado`, `Aprobado`, `Rechazado`), entregas (`A revisar`, `Aprobado`, `Desaprobado`).  
- Módulos aceptados: `HTML-CSS`, `JAVASCRIPT`, `NODE`, `REACT`.  
- Los servicios de frontend envían esos valores exactos; cualquier cambio en el backend debe mantener compatibilidad o el front quedará en blanco (p.ej. `/entregas` actualmente rechaza `reviewStatus: "A revisar"` con 500).

---

## 5. Pruebas y Logs

### Vitest
- Configuración consolidada en `vite.config.js` (sin proyectos múltiples). Tests unitarios, de integración y e2e corren con jsdom y `test/setupTests.js`.  
- `test/setupTests.js`:  
  - Stub de `localStorage`/`sessionStorage`, `matchMedia`, `IntersectionObserver`.  
  - Inyecta `React` en `globalThis` para evitar errores al renderizar JSX en tests.  
  - Fuerza `VITE_API_BASE_URL` para las pruebas.  
  - Genera logs detallados en `test/logs/test-run.log` (timestamp de cada test, duración, errores).  
- `renderWithProviders.jsx`: renderiza la app con todos los providers y resuelve rutas lazy para que los tests e2e funcionen sin navegador real.

### Tests E2E (jsdom)
- `test/e2e/appNavigation.e2e.test.jsx`: verifica navegación pública (landing, redirección a login, vista pública de turnos).  
- `test/e2e/dashboardFlows.e2e.test.jsx`: simula dashboards para alumno/profesor/superadmin usando fixtures locales (turnos/usuarios).  
- `test/e2e/serverAvailability.e2e.test.js`: preparado para validar la API real; actualmente marcado como `describe.skip` hasta activar `RUN_REMOTE_TESTS`.

### Smoke test HTTP real
- Script: `scripts/apiSmokeTest.mjs` (`npm run test:api`).  
- Escenarios cubiertos: `/health`, CRUD de `/turnos`, operaciones de error (payload inválido, 404), `/entregas` (incluye caso esperado de error), `/usuarios`.  
- Detecta errores reales del backend: hoy `POST /entregas` devuelve 500 por enum de `reviewStatus`, por lo que el script marca ese escenario como `FALLÓ` y omite la eliminación asociada.  
- Usa `axios` y limpia los recursos creados para no dejar basura.

### Logs
- `test/logs/test-run.log`: bitácora de Vitest (se actualiza con cada ejecución de `npm run test` o `npm run test:full`).  
- `scripts/apiSmokeTest` escribe la tabla de resultados en consola.  
- Errores comunes actuales: `/entregas` 500, ausencia de datos en `/turnos`/`/entregas` deja tablas vacías pero no es fallo de frontend.

---

## 6. Frontend y Backend: Puntos a Verificar

1. **Base URL**: confirmada como `http://localhost:3000` sin `/api`. Cambiarla sólo en `.env`.  
2. **Estados y enums**: el frontend envía exactamente lo documentado (`A revisar`, `Desaprobado` etc.). Backend debe aceptar estos valores para evitar errores 400/500.  
3. **Datos iniciales**: si `/turnos` o `/entregas` responden `[]`, los dashboards se muestran vacíos aunque el frontend esté bien configurado. Sembrar datos o permitir creación desde la API para pruebas.  
4. **Autenticación**: `AuthContext` exige `user.isApproved` y `token`. Si el backend no marca usuarios como aprobados, los dashboards redireccionarán a landing.  
5. **Errores**: cualquier 401 provoca logout automático (limpia storage y redirige).  
6. **Documentación**: `frontend_api_summary.md` está desactualizado (menciona base `/api`). Usar `REPORTE_FRONTEND.md` o `FRONTEND_BACKEND_SYNC.md` + este documento como referencia.

---

## 7. Checklist de Integración
1. **Levantar backend** (`npm run dev` o comando equivalente) en `http://localhost:3000`. Confirmar `GET /health` → `{ status: "ok" }`.  
2. **Actualizar `.env`** si el backend usa otra URL. Reiniciar Vite tras cambios.  
3. **Probar login** con usuarios aprobados (`superadmin@adminapp.com`, `profesor@adminapp.com`, etc., según seeds).  
4. **Verificar endpoints públicos**: `GET /turnos`, `GET /entregas`, `GET /usuarios` deberían devolver datos. Si no hay registros, crear mediante `/turnos` o scripts de backend.  
5. **Ejecutar `npm run test:api`**: asegura que la API responde como espera el frontend; revisar la tabla para detectar endpoints fallando.  
6. **Ejecutar `npm run lint` y `npm run test`** antes de cualquier entrega para validar reglas del proyecto.  
7. **Sincronizar documentación**: cualquier cambio en contratos debe reflejarse en `REPORTE_FRONTEND.md` y en este archivo para futuros agentes.

---

Con este resumen, cualquier integrante (o agente Codex) puede entender rápidamente cómo está armado el frontend, qué espera del backend y cómo ejecutar las herramientas necesarias para diagnosticar problemas de integración. Use este documento junto con `FRONTEND_BACKEND_SYNC.md` para mantener una comunicación precisa entre equipos. 
