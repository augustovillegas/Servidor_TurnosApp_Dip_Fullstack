# 🎓 Sistema de Gestión de Turnos - Diplomatura Backend

API RESTful para gestionar revisiones de proyectos, asignaciones y entregas de alumnos.

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo .env con:
# MONGODB_URI=mongodb://localhost:27017/gestion-turnos
# JWT_SECRET=tu_secret_aqui
# PORT=3000

# Limpiar estructura del proyecto (primera vez)
node scripts/limpiarEstructura.mjs

# Inicializar base de datos con datos de prueba
npm run seed

# Iniciar servidor
npm run dev

# Ejecutar tests
npm test
```

El servidor estará disponible en `http://localhost:3000`

---

## 📂 Estructura del Proyecto

```
├── config/           # Configuración de DB
├── constants/        # Constantes globales
├── controllers/      # Controladores de rutas
├── middlewares/      # Auth, validación, errores
├── models/           # Schemas Mongoose
├── repository/       # Acceso a datos
├── routes/           # Definición de endpoints
├── scripts/          # Seeds y utilidades
│   ├── lib/          # Utilidades compartidas
│   ├── limpiarEstructura.mjs    # [NUEVO] Limpieza automática
│   └── test-reporter.mjs        # Sistema de reportes QA
├── services/         # Lógica de negocio
├── tests/            # ✅ TODOS los tests aquí
│   ├── helpers/
│   └── *.test.mjs
├── utils/            # Helpers y mappers
├── validators/       # Validaciones express-validator
└── logs/             # ✅ Sistema de reportes QA
    ├── actual/       # Reportes de sesión actual
    ├── historial/    # Archivo de días anteriores
    └── docs/         # Documentación técnica
```

**Ver:** [`docs/ESTRUCTURA_PROYECTO.md`](docs/ESTRUCTURA_PROYECTO.md) para detalles completos.

---

## 🔑 Características Principales

### Autenticación y Autorización
- JWT Bearer token
- 3 roles: `alumno`, `profesor`, `superadmin`
- Estados de usuario: `Pendiente`, `Aprobado`, `Rechazado`
- Middleware de aprobación para alumnos

### Gestión de Módulos
- 4 módulos con cohortes 1-4:
  - **HTML-CSS** (cohorte 1)
  - **JAVASCRIPT** (cohorte 2)
  - **BACKEND - NODE JS** (cohorte 3)
  - **FRONTEND - REACT** (cohorte 4)

### Aislamiento por Módulo
- Usuarios solo ven datos de su módulo
- Profesores gestionan su módulo
- Superadmins tienen acceso total

### Sistema de Turnos
- Creación de turnos de revisión por profesores
- Reserva de turnos por alumnos aprobados
- Estados: Disponible, Solicitado, Aprobado, Rechazado
- Validación de conflictos de horarios

### Entregas y Calificaciones
- Vinculadas a turnos reservados por alumnos
- Validación de links de GitHub (dominio github.com)
- Estados de revisión: A revisar, Pendiente, Aprobado, Desaprobado
- Sistema de sprints (1-5)
- Alumnos aprobados pueden crear entregas
- Profesores y superadmins pueden calificar

---

## 🧹 Limpieza y Mantenimiento

### Limpiar archivos fuera de lugar
```bash
node scripts/limpiarEstructura.mjs
```

Este script:
- ✅ Elimina `test-output.txt` y archivos `.log` de la raíz
- ✅ Remueve archivos legacy (`test-summary.md`, `test-current.log`)
- ✅ Verifica que `SEED_USERS.md` esté solo en `logs/docs/`
- ✅ Elimina directorios obsoletos (`logs/history/`)
- ✅ Valida estructura de carpetas requeridas
- ✅ Crea carpetas faltantes (`docs/`, `logs/docs/`, etc.)

### Verificar estructura correcta
```bash
# Verificar ubicación de archivos
node scripts/verificar_seed_location.mjs

# Ver estado de git (archivos no trackeados)
git status

# Ver qué archivos están siendo ignorados
git check-ignore -v *
```

---

## 🔒 Archivos Sensibles

**⚠️ Nunca versionar:**
- `.env` - Variables de entorno con credenciales
- `logs/docs/SEED_USERS.md` - Contiene contraseñas de seed
- `logs/actual/*.md` - Reportes generados automáticamente
- `logs/historial/*.md` - Reportes archivados
- `test-*.log` - Logs de ejecución de tests
- `*.log` - Logs de ejecución

**Ver:** [`.gitignore`](.gitignore) para lista completa.

---

## 📚 Documentación

- **[API Documentation](SERVIDOR_BACKEND.md)** - Endpoints, modelos y ejemplos completos
  - Auth: `/auth`
  - Usuarios: `/usuarios`
  - Asignaciones: `/assignments`
  - Turnos: `/slots`
  - **Entregas: `/submissions`** (única ruta)
- **[Testing & Reportes](logs/README.md)** - Sistema de reportes QA
- **[Estructura del Proyecto](docs/ESTRUCTURA_PROYECTO.md)** - Organización de archivos
- **[Credenciales de Seed](logs/docs/SEED_USERS.md)** - Usuarios de prueba (generado)

---

## 🧪 Testing

```bash
npm test              # Suite completa con limpieza previa
npm run test:watch    # Modo watch para desarrollo
```

**Reportes generados automáticamente:**
- `logs/actual/REPORTE_GLOBAL.md` - Estado actual de todos los tests
- `logs/actual/REPORTE_DIARIO.md` - Historial de ejecuciones del día
- `logs/historial/REPORTE_DIARIO_YYYYMMDD.md` - Archivo de días anteriores

**Suite de Tests (98 tests):**
- ✅ Autenticación y sesiones
- ✅ Gestión de usuarios y roles
- ✅ CRUD de asignaciones
- ✅ Sistema de turnos y reservas
- ✅ Entregas y calificaciones
- ✅ Aislamiento por módulo
- ✅ Manejo de errores
- ✅ Consistencia de DTOs

**Ver:** [`logs/README.md`](logs/README.md) para detalles del sistema de reportes.

---

## 🌱 Seeds y Datos de Prueba

```bash
# Seed completo (interactivo - pide confirmación)
npm run seed

# Seed sin confirmación
node scripts/seedCompleto.mjs --interactive=false

# Solo limpiar base de datos
node scripts/limpiarDB.mjs

# Aplicar índices actualizados
node scripts/aplicarIndices.mjs
```

**Genera:**
- 2 superadmins fijos
- 4 módulos (HTML-CSS, JavaScript, Backend Node, React)
- 1 profesor + 20 alumnos por módulo
- 5 asignaciones por módulo
- 5 entregas por alumno (400 total)
- 20 turnos por módulo (80 total)

**Credenciales de acceso:**
- Se guardan automáticamente en `logs/docs/SEED_USERS.md`
- Superadmins:
  - `admin.seed@gmail.com / admin123`
  - `superadmin.diplomatura@gmail.com / Superadmin#2025`
- Profesores: `profesor.{modulo}@gmail.com / password123`
- Alumnos: `alumno.{modulo}.{numero}@gmail.com / password123`

---

## 🐛 Troubleshooting

### Tests fallan con errores de índices
```bash
node scripts/aplicarIndices.mjs
npm test
```

### Base de datos corrupta
```bash
node scripts/limpiarDB.mjs
npm run seed
npm test
```

### Archivo SEED_USERS.md no se encuentra
```bash
node scripts/verificar_seed_location.mjs
# Debería estar en: logs/docs/SEED_USERS.md
```

### Archivos fuera de lugar (test-output.txt, logs en raíz)
```bash
node scripts/limpiarEstructura.mjs
git status
```

### Reportes no se generan correctamente
```bash
# Verificar estructura de logs/
ls -R logs/

# Regenerar reportes
npm test

# Ver reportes generados
cat logs/actual/REPORTE_GLOBAL.md
```

### El servidor no inicia
```bash
# Verificar variables de entorno
cat .env

# Verificar MongoDB corriendo
# En Windows:
net start MongoDB

# En Linux/Mac:
sudo systemctl status mongod
```

---

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Iniciar en modo desarrollo con nodemon
npm start            # Iniciar en modo producción
npm test             # Ejecutar suite completa de tests
npm run test:watch   # Tests en modo watch
npm run seed         # Seed completo (interactivo)
```

**Scripts de utilidades:**
```bash
node scripts/limpiarDB.mjs              # Limpiar base de datos
node scripts/aplicarIndices.mjs         # Aplicar índices MongoDB
node scripts/limpiarEstructura.mjs      # Limpiar archivos fuera de lugar
node scripts/verificar_seed_location.mjs # Verificar ubicación de archivos
node scripts/crearSuperadmin.mjs        # Crear superadmin manualmente
node scripts/diagnostico_datos.mjs      # Diagnóstico de datos en DB
```

---

## ✅ Checklist Pre-Commit

Antes de hacer commit, ejecutar:

```bash
# 1. Limpiar estructura
node scripts/limpiarEstructura.mjs

# 2. Verificar que no hay archivos sensibles sin ignorar
git status

# 3. Ejecutar tests
npm test

# 4. Verificar .gitignore está actualizado
git check-ignore -v logs/docs/SEED_USERS.md
# Debe devolver: .gitignore:XX:logs/docs/SEED_USERS.md

# 5. Ver archivos que se van a commitear
git diff --staged
```

---

## 🏗️ Stack Tecnológico

- **Runtime**: Node.js 20+
- **Framework**: Express 5.x
- **Base de Datos**: MongoDB 6.x+ con Mongoose 8.x
- **Autenticación**: JWT (jsonwebtoken)
- **Validación**: express-validator
- **Testing**: Vitest + Supertest
- **Dev Tools**: nodemon, fs-extra

---

## 📝 Convenciones de Código

### Nomenclatura (Español)
- **Todos los campos de modelo y DTOs en español**
- ❌ NO: `name`, `role`, `cohort`, `room`, `date`
- ✅ SÍ: `nombre`, `rol`, `cohorte`, `sala`, `fecha`

### Estados vs Status
- **`status`**: Solo para cuentas de usuario (Pendiente/Aprobado/Rechazado)
- **`estado`**: Para slots y submissions (Disponible/Solicitado/Aprobado)
- **`reviewStatus`**: Para calificación de entregas (A revisar/Aprobado/Desaprobado)

### Formato de Fechas
- **Request**: ISO 8601 (`2025-12-20T14:00:00.000Z`)
- **Response Slots**: Doble formato (`fecha` + `fechaISO`)
- **Query params**: Acepta ISO 8601 o DD/MM/YYYY

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisar [`SERVIDOR_BACKEND.md`](SERVIDOR_BACKEND.md) para documentación de API
2. Revisar [`docs/ESTRUCTURA_PROYECTO.md`](docs/ESTRUCTURA_PROYECTO.md) para organización
3. Ejecutar `node scripts/diagnostico_datos.mjs` para debug de datos
4. Revisar logs en `logs/actual/` para errores de tests

---

**Última actualización**: Diciembre 2025  
**Versión**: 2.0 (Arquitectura consolidada + Estructura limpia)  
**Licencia**: MIT
