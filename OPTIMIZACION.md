# 🐛 Bug Report: Profesor no recibe entregas del alumno en GET /entregas

**Fecha:** 2025-11-23  
**Prioridad:** 🔴 **CRÍTICA** - Funcionalidad core bloqueada  
**Componente afectado:** Backend - Endpoint `/entregas` y filtrado por permisos

---

## 📋 Resumen del problema

El profesor `laura.silva.htmlcss@gmail.com` (módulo HTML-CSS, `moduleNumber: 1`) **NO recibe ninguna entrega** cuando consulta el endpoint `/entregas`, a pesar de que el alumno `abril.figueroa.htmlcss.14@gmail.com` (módulo HTML-CSS, cohort 14) creó una entrega exitosamente.

El backend está devolviendo un **array vacío** cuando debería devolver al menos 1 entrega.

---

## 🔍 Evidencia técnica

### Request del profesor (capturado en frontend)
```http
GET /entregas
Authorization: Bearer <token_profesor_laura>
```

**Usuario autenticado:**
```json
{
  "id": "6923bdbf8a11f6c6049ee87e",
  "name": "Laura Silva",
  "email": "laura.silva.htmlcss@gmail.com",
  "role": "profesor",
  "status": "Aprobado",
  "isApproved": true,
  "moduleNumber": 1,
  "moduleCode": 1,
  "moduleLabel": "HTML-CSS"
}
```

### Respuesta del backend
```json
[]
```
**❌ Esperado:** Array con al menos la entrega creada por `abril.figueroa.htmlcss.14@gmail.com`

### Log completo del frontend
```
[AppContext] loadEntregas: Fetching all entregas (profesor/superadmin)
[AppContext] loadEntregas: Raw entregas received: 0 items
[AppContext] loadEntregas: First 2 raw items: []
```

---

## 🎯 Usuarios involucrados

### Profesor (quien NO ve la entrega)
- **Email:** `laura.silva.htmlcss@gmail.com`
- **Rol:** `profesor`
- **Módulo:** `HTML-CSS` (moduleNumber: 1)
- **Estado:** Aprobado
- **Cohort:** *(verificar en BD - posiblemente NO tiene cohort asignado)*

### Alumno (quien creó la entrega)
- **Email:** `abril.figueroa.htmlcss.14@gmail.com`
- **Rol:** `alumno`
- **Módulo:** `HTML-CSS` (inferido del email)
- **Cohort:** `14` (inferido del email)

---

## 🔬 Hipótesis de la causa raíz

### Hipótesis #1: Filtrado incorrecto por `cohort` 🔴 **MÁS PROBABLE**
El middleware de permisos o la query en el endpoint `/entregas` está filtrando por **AMBOS** `moduleNumber` Y `cohort` del profesor.

**Problema:**
- Profesor tiene `moduleNumber: 1` pero **cohort: null** o cohort diferente a 14
- Alumno tiene `moduleNumber: 1` y `cohort: 14`
- La query filtra: `{ moduleNumber: 1, cohort: null }` → **NO coincide con la entrega del alumno**

**Solución esperada:**
- Profesores deben ver **TODAS** las entregas de su `moduleNumber`, independientemente del `cohort`
- Alumnos solo ven sus propias entregas
- Superadmin ve todo

### Hipótesis #2: Permisos restrictivos en modelo Submission
El modelo de permisos puede estar bloqueando entregas que no tengan una relación directa profesor-alumno.

**Verificar:**
- ¿La tabla/colección de entregas tiene una relación `profesor_id`?
- ¿El filtro requiere que `submission.profesor_id === req.user.id`?

### Hipótesis #3: Population faltante de campos relacionados
Si el backend usa populate/join para traer datos del alumno, podría estar fallando silenciosamente.

---

## ✅ Checklist de verificación para el equipo backend

### 1️⃣ Verificar query de filtrado en `/entregas`

**Ubicación esperada:** Controller o Service de `entregas`

```javascript
// ❌ INCORRECTO (probablemente lo que está pasando)
const filter = {
  moduleNumber: req.user.moduleNumber,
  cohort: req.user.cohort  // <- ESTO filtra por cohort del profesor (null o diferente)
};

// ✅ CORRECTO (lo que debería ser)
const filter = req.user.role === 'profesor' 
  ? { moduleNumber: req.user.moduleNumber }  // Solo filtrar por módulo
  : req.user.role === 'alumno'
    ? { student: req.user.id }  // Alumno solo ve las suyas
    : {};  // Superadmin ve todo
```

### 2️⃣ Verificar middleware de permisos

**Archivo:** `permissionUtils.js` o similar

- [ ] ¿Existe un middleware que filtra automáticamente por `cohort`?
- [ ] ¿El middleware diferencia entre rol `profesor` y `alumno`?
- [ ] ¿Se está usando el cohort del **profesor** en lugar del cohort de la **entrega**?

### 3️⃣ Inspeccionar base de datos directamente

**Query directa a ejecutar:**

```javascript
// MongoDB
db.submissions.find({
  $or: [
    { "assignment.moduleNumber": 1 },
    { "moduleNumber": 1 }
  ]
})

// O si usan campo student populado:
db.submissions.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "student",
      foreignField: "_id",
      as: "studentData"
    }
  },
  {
    $match: {
      "studentData.moduleNumber": 1
    }
  }
])
```

**Verificar:**
- [ ] ¿Existe al menos 1 entrega con `moduleNumber: 1`?
- [ ] ¿El campo `student` apunta al usuario `abril.figueroa.htmlcss.14@gmail.com`?
- [ ] ¿Los campos `moduleNumber`, `cohort` están correctamente guardados?

### 4️⃣ Verificar estructura del documento Submission

**Campos esperados en una entrega:**
```json
{
  "_id": "...",
  "student": "ObjectId_de_abril",
  "sprint": 1,
  "githubLink": "https://...",
  "renderLink": "https://...",
  "reviewStatus": "A revisar",
  "moduleNumber": 1,  // <- DEBE estar presente
  "cohort": 14,       // <- Del alumno, NO del profesor
  "assignment": {     // <- Si existe referencia a Assignment
    "moduleNumber": 1,
    "cohort": 14
  },
  "createdAt": "2025-11-23T...",
  "updatedAt": "2025-11-23T..."
}
```

### 5️⃣ Logs a agregar temporalmente

**En el controller de GET /entregas:**

```javascript
console.log('[GET /entregas] Usuario autenticado:', {
  id: req.user.id,
  email: req.user.email,
  role: req.user.role,
  moduleNumber: req.user.moduleNumber,
  cohort: req.user.cohort
});

console.log('[GET /entregas] Filtro aplicado:', filter);

const entregas = await Submission.find(filter);

console.log('[GET /entregas] Entregas encontradas:', entregas.length);
console.log('[GET /entregas] Primeras 2 entregas:', JSON.stringify(entregas.slice(0, 2), null, 2));
```

---

## 🛠️ Solución propuesta

### Opción 1: Modificar filtro por rol (RECOMENDADA)

```javascript
// En el controller/service de GET /entregas
const buildFilter = (user) => {
  if (user.role === 'superadmin') {
    return {};  // Ve todo
  }
  
  if (user.role === 'profesor') {
    // Profesor ve TODAS las entregas de su módulo (todos los cohorts)
    return { moduleNumber: user.moduleNumber };
  }
  
  if (user.role === 'alumno') {
    // Alumno solo ve sus propias entregas
    return { student: user.id };
  }
  
  return {};
};

const filter = buildFilter(req.user);
const entregas = await Submission.find(filter)
  .populate('student', 'name email moduleNumber cohort')  // Poblar datos del alumno
  .populate('assignment')
  .sort({ createdAt: -1 });
```

### Opción 2: Agregar campo virtual `alumnoNombre`

**El frontend espera recibir `alumnoNombre` en cada entrega:**

```javascript
// En el toJSON del modelo Submission o en el serializer
submissionSchema.virtual('alumnoNombre').get(function() {
  return this.student?.name || '-';
});

// O en el controller antes de enviar:
const entregas = await Submission.find(filter).populate('student');
const serialized = entregas.map(e => ({
  ...e.toObject(),
  alumnoNombre: e.student?.name || '-',
  student: e.student?._id  // ObjectId del alumno
}));

res.json(serialized);
```

---

## 📊 Testing requerido

Después de aplicar el fix, verificar:

### Test Case 1: Profesor ve entregas de su módulo
```
DADO un profesor con moduleNumber: 1
CUANDO consulta GET /entregas
ENTONCES debe recibir TODAS las entregas con moduleNumber: 1, independiente del cohort
```

### Test Case 2: Profesor NO ve entregas de otro módulo
```
DADO un profesor con moduleNumber: 1
Y existe una entrega con moduleNumber: 2
CUANDO consulta GET /entregas
ENTONCES NO debe recibir la entrega del módulo 2
```

### Test Case 3: Alumno solo ve sus entregas
```
DADO un alumno con id: "abc123"
Y existen 5 entregas en total (2 del alumno, 3 de otros)
CUANDO consulta GET /submissions/:userId
ENTONCES debe recibir solo las 2 entregas propias
```

### Test Case 4: Response incluye nombre del alumno
```
CUANDO cualquier usuario consulta entregas
ENTONCES cada entrega debe incluir el campo "alumnoNombre"
```

---

## 🚨 Impacto de negocio

- ❌ Profesores no pueden evaluar entregas de alumnos
- ❌ Flujo de revisión completamente bloqueado
- ❌ Afecta a TODOS los módulos si el problema es genérico
- ⏱️ **Tiempo estimado de fix:** 30-60 minutos (cambio de filtro + testing)

---

## 📞 Contacto

Para dudas o validaciones adicionales, el equipo frontend puede proveer:
- Logs completos de network requests
- Estructura esperada del response
- Token JWT del profesor para testing en Postman/Insomnia

**Desarrollador reportando:** Frontend Team  