# 📦 Historial de Reportes Diarios

Este directorio contiene los reportes diarios archivados automáticamente.

## 📋 Contenido

Cada archivo representa el historial consolidado de **todas las ejecuciones de tests** de un día específico.

**Formato de nombres**: `REPORTE_DIARIO_YYYYMMDD.md`

Ejemplo:
```
REPORTE_DIARIO_20251121.md  → Todas las ejecuciones del 21 de noviembre de 2025
REPORTE_DIARIO_20251122.md  → Todas las ejecuciones del 22 de noviembre de 2025
```

## 🔄 Proceso de Archivado

El archivado es **100% automático**:

1. Al ejecutar `npm test`, el sistema verifica la fecha del `REPORTE_DIARIO.md` actual
2. Si la fecha no coincide con hoy:
   - El archivo `REPORTE_DIARIO.md` se mueve a `historial/REPORTE_DIARIO_YYYYMMDD.md`
   - Se crea un nuevo `REPORTE_DIARIO.md` para el día actual
3. Si es del mismo día:
   - La nueva ejecución se añade al inicio (prepend) del `REPORTE_DIARIO.md` existente

## 📂 Estructura de los Archivos

Cada archivo archivado contiene:

```markdown
# 📑 HISTORIAL CONSOLIDADO DEL DÍA
**Fecha:** DD/MM/YYYY

---
## ➡️ EJECUCIÓN: DD/MM - HH:MM:SS
**Resultado:** ✅/⚠️ X/Y tests pasando (Z%)
**Duración:** Xs
[Detalle completo del REPORTE_GLOBAL de esa ejecución]

---
## ➡️ EJECUCIÓN: DD/MM - HH:MM:SS
[Siguiente ejecución del mismo día...]
```

## 🔍 Consultar Historial

### Ver reportes archivados disponibles
```powershell
# Windows PowerShell
dir historial/REPORTE_DIARIO_*.md | Sort-Object Name

# Bash
ls -lh historial/REPORTE_DIARIO_*.md | sort
```

### Abrir un reporte específico
```powershell
# Ver reporte del 21 de noviembre
type historial\REPORTE_DIARIO_20251121.md | more

# Buscar fallos específicos
Select-String -Path historial\REPORTE_DIARIO_20251121.md -Pattern "FAIL"
```

### Comparar métricas entre días
```powershell
# Extraer success rates de los últimos 7 días
Get-ChildItem historial\REPORTE_DIARIO_*.md | 
  Select-Object -Last 7 | 
  ForEach-Object { Select-String -Path $_ -Pattern "Success Rate" }
```

## 🎯 Casos de Uso

### Análisis de Tendencias
Comparar la estabilidad del proyecto semana a semana:
```powershell
# Ver todos los success rates del mes actual
Select-String -Path "historial\REPORTE_DIARIO_202511*.md" -Pattern "Success Rate"
```

### Debugging de Regresiones
Si un test que pasaba antes ahora falla:
```powershell
# Buscar cuándo empezó a fallar
Select-String -Path "historial\REPORTE_DIARIO_*.md" -Pattern "nombre-del-test-fallando"
```

### Auditoría de Actividad
Ver cuántas veces se ejecutaron tests en un día:
```powershell
# Contar bloques de ejecución
(Select-String -Path "historial\REPORTE_DIARIO_20251121.md" -Pattern "EJECUCIÓN:").Count
```

## 🧹 Limpieza de Archivos Antiguos

Por defecto, los archivos no se eliminan automáticamente. Para limpiar archivos antiguos:

### Eliminar reportes > 30 días
```powershell
# Windows PowerShell
$fecha_limite = (Get-Date).AddDays(-30).ToString("yyyyMMdd")
Get-ChildItem historial\REPORTE_DIARIO_*.md | 
  Where-Object { $_.BaseName -match "REPORTE_DIARIO_(\d{8})" -and $matches[1] -lt $fecha_limite } |
  Remove-Item -WhatIf  # Quitar -WhatIf para ejecutar realmente
```

### Archivar reportes > 90 días en ZIP
```powershell
# Comprimir reportes antiguos
$archivos_antiguos = Get-ChildItem historial\REPORTE_DIARIO_*.md | 
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-90) }

if ($archivos_antiguos) {
  Compress-Archive -Path $archivos_antiguos -DestinationPath "historial\archive_$(Get-Date -Format 'yyyy').zip"
  $archivos_antiguos | Remove-Item
}
```

## 📊 Estadísticas Útiles

### Días con más ejecuciones
```powershell
Get-ChildItem historial\REPORTE_DIARIO_*.md | 
  ForEach-Object {
    [PSCustomObject]@{
      Archivo = $_.Name
      Ejecuciones = (Select-String -Path $_ -Pattern "EJECUCIÓN:").Count
    }
  } | 
  Sort-Object Ejecuciones -Descending | 
  Select-Object -First 10
```

### Success rate promedio del último mes
```powershell
$rates = Select-String -Path "historial\REPORTE_DIARIO_202511*.md" -Pattern "(\d+)% Success Rate" | 
  ForEach-Object { [int]$_.Matches.Groups[1].Value }

$promedio = ($rates | Measure-Object -Average).Average
Write-Host "Success rate promedio del mes: $promedio%"
```

## 📝 Notas

- **Tamaño**: Cada archivo típicamente ocupa 20-100 KB dependiendo de la cantidad de ejecuciones
- **Retención**: Considerar política de retención según necesidades del proyecto
- **Git**: Los archivos `.md` del historial están en `.gitignore` (no se versionan)
- **Backup**: Incluir `logs/historial/` en backups del proyecto si se desea conservar histórico largo

---

**Sistema**: Consolidado de Reportes v2.0  
**Archivado**: Automático diario  
**Formato**: Markdown (`.md`)
