# 🧠 PROMPT PARA CODEX — ANÁLISIS Y COMPRENSIÓN DEL SERVIDOR BACKEND

---

## 🎯 OBJETIVO PRINCIPAL

Analizar **completamente** el servidor backend existente, entender cómo está estructurado y documentar **qué partes están implementadas y qué partes faltan** para integrarse correctamente con el **frontend React + Vite + Tailwind** actual.

Este análisis debe preparar el terreno para una futura integración funcional (API ↔ Frontend).

---

## 🧩 ARCHIVOS RELEVANTES DEL SERVIDOR

Los archivos proporcionados se encuentran en la carpeta raíz del backend:

```
/routes
 ├── assignmentRoutes.mjs
 ├── authRoutes.mjs
 ├── slotRoutes.mjs
 └── submissionRoutes.mjs

/services
 ├── assignmentService.mjs
 ├── authService.mjs
 ├── slotService.mjs
 ├── submissionService.mjs
 └── userService.mjs
```

---

## 🔍 TAREA DE CODEX

### 1️⃣ Recorrer y analizar **todo el código** del servidor
Codex debe:
- Leer todos los archivos `.mjs` provistos.  
- Identificar las dependencias entre rutas y servicios.  
- Determinar el framework base (Express, Mongoose, etc.) y su configuración general.  
- Detectar middlewares, controladores, validaciones y estructura de imports/exports.  
- Analizar cómo están organizadas las capas:
  - **Routes** → Definición de endpoints y métodos HTTP.  
  - **Services** → Lógica de negocio y conexión a base de datos o mock.  
  - **Auth** → Manejo de autenticación (si existe).  

---

### 2️⃣ Extraer información clave de cada archivo

Codex debe generar un **mapa de arquitectura** que incluya:

| Archivo | Propósito | Endpoints definidos | Dependencias principales | Funciones exportadas | Estado actual | Observaciones |
|----------|------------|--------------------|---------------------------|-----------------------|----------------|----------------|

Ejemplo (solo ilustrativo):

| File | Purpose | Endpoints | Depends on | Exports | Status | Notes |
|------|----------|------------|-------------|----------|--------|-------|
| `authRoutes.mjs` | Maneja login y registro | `/login`, `/register` | `authService` | router | Parcial | Falta JWT middleware |

---

### 3️⃣ Determinar qué funcionalidades ya existen

Codex debe identificar si ya están implementados los módulos clave del proyecto:

- ✅ **Autenticación (login / register / roles / JWT)**  
- ✅ **Gestión de usuarios (get, update, delete)**  
- ✅ **Gestión de entregas o submissions (create, update, delete, list)**  
- ✅ **Gestión de asignaciones o turnos (assignments, slots)**  
- ✅ **Validaciones de entrada (middlewares, Joi, Express Validator, etc.)**

Y marcar cuáles están incompletos o ausentes.

---

### 4️⃣ Detectar faltantes para una integración completa con el frontend

Codex debe analizar el documento `Sprint5.md` (si está disponible en el mismo proyecto) y determinar **qué endpoints o servicios son necesarios para que el frontend funcione plenamente**:

Por ejemplo:
| Requisito del Sprint | Endpoint necesario | Estado actual | Qué falta implementar |
|-----------------------|--------------------|----------------|------------------------|
| CRUD de entregas | `/api/submissions` (GET/POST/PUT/DELETE) | Parcial | Falta DELETE y validación |
| Login | `/api/auth/login` | Implementado | Falta guardar token en cookies |
| Feedback visual | — | — | Integrar status codes y mensajes claros |

---

### 5️⃣ Verificar coherencia entre backend y frontend

Codex debe evaluar si el backend cumple con los requerimientos de consumo del frontend:
- Formato de respuesta (`{ success, message, data }`).  
- Tipos de datos esperados (`entregas`, `usuarios`, `slots`, etc.).  
- Naming y estructura (`id`, `estado`, `review`, `fecha`, `horario`, etc.).  
- Autenticación y autorización (roles: profesor, superadmin, alumno).  
- Validaciones necesarias en los endpoints.

---

### 6️⃣ Generar un informe técnico final

El resultado esperado es un **informe claro y detallado**, con:
1. Descripción de cómo está compuesto el servidor (arquitectura y dependencias).  
2. Listado de endpoints disponibles y qué hacen.  
3. Diagnóstico de qué falta para cumplir con los requerimientos del frontend y del `Sprint5.md`.  
4. Propuesta general de pasos para completar la integración.  

> ⚠️ **Sin modificar ni agregar código aún.**  
> Este análisis es únicamente para comprensión estructural y planificación de la integración.

---

## 📘 CONDICIONES A RESPETAR

1. **No cambiar ni reescribir código** del servidor durante este análisis.  
2. **No generar nuevas rutas o servicios todavía.**  
3. **No eliminar ni renombrar archivos.**  
4. Solo **analizar, documentar y preparar el plan de integración.**

---

## ⚙️ OBJETIVO FINAL DEL ANÁLISIS

Al finalizar, Codex debe entregar:
- Un **mapa completo** del backend (rutas, servicios, relaciones).  
- Un **listado de endpoints existentes y faltantes**.  
- Un **diagnóstico de compatibilidad** con el frontend React actual.  
- Una **propuesta clara de integración** para la siguiente fase (conexión funcional API ↔ Frontend).

---

## 🧾 RESUMEN DE INSTRUCCIÓN FINAL PARA CODEX

> “Analiza exhaustivamente todos los archivos `.mjs` del servidor, incluyendo rutas y servicios.  
> Documenta su estructura, dependencias y propósito.  
> No modifiques nada todavía.  
> Genera un informe técnico detallado que explique cómo está compuesto el servidor, qué endpoints existen y qué falta para integrarlo correctamente con el frontend React y los requerimientos del Sprint5.md.  
> Asegúrate de que el informe sea claro, legible y útil para preparar la implementación completa posterior.”
