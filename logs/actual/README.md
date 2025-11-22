# 🟢 Reportes de la Sesión Actual

Este directorio contiene los reportes **en tiempo real** de la sesión de trabajo actual (hoy).

## 📋 Contenido

### REPORTE_GLOBAL.md
**Estado**: Siempre muestra la **última ejecución** de tests  
**Actualización**: Se **SOBREESCRIBE** completamente en cada `npm test`

**Contenido**:
- ✅/⚠️ Estado global (tests pasando/fallando)
- 📋 Lista numerada de fallos críticos pendientes
- 📊 Métricas detalladas (success rate, duración)
- 🎯 Recomendaciones de próximos pasos

**¿Cuándo consultarlo?**
- Al llegar por la mañana (estado fresco del día)
- Después de ejecutar `npm test`
- Para ver el estado actual **sin ruido** de ejecuciones anteriores
- Para focus en los **fallos actuales** únicamente

---

### REPORTE_DIARIO.md
**Estado**: Historial **consolidado** de todas las ejecuciones del día  
**Actualización**: Se **AÑADE AL INICIO** (prepend) cada nueva ejecución

**Contenido**:
- 🔄 Bloques de ejecución ordenados de **más reciente a más antiguo**
- ⏰ Cada bloque tiene: timestamp, resultado, métricas, detalle completo
- 📈 Permite ver evolución durante el día

**¿Cuándo consultarlo?**
- Para **comparar regresiones** durante el día
- Para ver la **evolución** de fixes aplicados
- Para **auditoría** de actividad de testing
- Para verificar si un bug reapareció después de un fix

---

## 🔄 Ciclo de Vida

### Durante el día (mismo día)
1. Primera ejecución: Crea ambos reportes
2. Siguientes ejecuciones:
   - `REPORTE_GLOBAL.md` → **sobreescribe** (solo última)
   - `REPORTE_DIARIO.md` → **prepend** (acumula todas)

### Al cambiar de día
- `REPORTE_DIARIO.md` del día anterior → `logs/historial/REPORTE_DIARIO_YYYYMMDD.md`
- Se crean nuevos reportes para el nuevo día

---

**Sistema**: Consolidado de Reportes v2.0  
**Ruta**: `logs/actual/`
