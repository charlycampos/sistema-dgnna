# Sistema de Triaje de Apelaciones - DGNNA

## Análisis del Excel Actual (triaje_apelaciones_2026_v3.xlsx)

---

## 1. Estructura del Archivo

El archivo tiene **3 hojas**:

| Hoja | Propósito |
|------|-----------|
| **Registro** | Registro principal de apelaciones con panel de asignación |
| **Catalogos** | Tablas de configuración (complejidad, extensión, abogados) |
| **Resumen** | Dashboard de carga por abogado y análisis de balance |

---

## 2. Hoja "Registro" - Columnas

### Panel Superior (Filas 1-5)
- Muestra los 4 abogados con sus **puntos activos**
- Indicador verde **"ASIGNAR A →"** sugiere el abogado con menos carga

### Tabla Principal (desde Fila 8)

| # | Columna | Descripción | Tipo |
|---|---------|-------------|------|
| 1 | **N°** | Número correlativo | Auto-incremento |
| 2 | **Fecha Ingreso** | Fecha en que ingresa la apelación | Fecha |
| 3 | **N° Expediente** | Código único del expediente | Texto (ej: UPELIMA20240007210, 2025-0000817) |
| 4 | **Sujeto** | Persona/entidad involucrada (NNA, familias, CAR, adultos) | Texto libre |
| 5 | **Procedencia** | Dependencia de origen del caso | Texto libre |
| 6 | **Documento** | Tipo y número de documento de ingreso | Texto (ej: NOTA 000015-2025-DPE) |
| 7 | **Asunto** | Descripción del recurso interpuesto | Texto largo |
| 8 | **Folios** | Cantidad de folios del expediente | Número entero |
| 9 | **Pts Folios** | Puntos calculados por extensión | Fórmula (1-4) |
| 10 | **Complejidad Jurídica** | Tipo de caso según complejidad | Lista desplegable |
| 11 | **Pts Compl** | Puntos por complejidad | Fórmula (1-4) |
| 12 | **Abogado** | Abogado asignado | Lista desplegable |
| 13 | **Fecha Asignación** | Fecha en que se asigna al abogado | Fecha |
| 14 | **Estado** | Estado actual del caso | Lista desplegable |
| 15 | **Puntos Total** | Suma de Pts Folios + Pts Compl | Fórmula |
| 16 | **N° Resolución** | Número de resolución emitida | Texto |
| 17 | **Documento de Atención** | Memorándum de atención | Texto |
| 18 | **Cargos** | Estado de cargos | Texto |

---

## 3. Catálogos - Valores Configurables

### Complejidad Jurídica

| Tipo | Puntos |
|------|--------|
| Adopciones | 1 |
| UPE (1-2 apelantes) | 2 |
| UPE (3+ apelantes) | 3 |
| Procedimiento Administrativo Sancionador | 4 |

### Extensión del Expediente (Folios)

| Rango | Puntos |
|-------|--------|
| 1-500 | 1 |
| 501-1000 | 2 |
| 1001-2000 | 3 |
| 2001+ | 4 |

### Abogados

| Nombre | Activo |
|--------|--------|
| Clara Michaud | SI |
| Karla Garcia | SI |
| Karol Castro | NO |
| Sofia Goicochea | NO |

---

## 4. Valores Actuales en los Datos

### Procedencia (17 valores únicos encontrados)
- LIMA, PIURA, HUANCAVELICA, PUNO, AREQUIPA
- LIMA NORTE, LIMA SUR, LIMA ESTE
- UCAYALI, TUMBES, MOQUEGUA, ANCASH
- LAMBAYEQUE, LORETO, HUANUCO, AYACUCHO
- ADOPCIONES

> **Nota:** No es lista cerrada. Pueden aparecer más: DPNNA, CAR, DEMUNAs, Beneficencias, etc.

### Estados

| Estado | Descripción |
|--------|-------------|
| Pendiente | Caso en proceso, suma puntos activos |
| Atendido | Caso resuelto, no suma puntos |

---

## 5. Lógica de Triaje

### Fórmula de Puntos
```
PUNTOS TOTAL = Pts Folios + Pts Complejidad
```
- Rango posible: **2 a 8 puntos**

### Niveles de Carga
| Nivel | Puntos |
|-------|--------|
| Baja | 2-3 |
| Media | 4-5 |
| Alta | 6-7 |
| Muy Alta | 8 |

### Regla de Asignación
- **Asignar al abogado con menos puntos activos**
- Solo cuentan casos con Estado ≠ "Atendido"
- Al cerrar caso → puntos se restan automáticamente

---

## 6. Requerimientos para Sistema Web (Antigravity)

### Entidades de Base de Datos

```
Apelacion {
  id
  numero                    // N°
  fechaIngreso              // Fecha Ingreso
  expediente                // N° Expediente (único)
  sujeto                    // Sujeto
  procedencia               // Procedencia (texto libre)
  documento                 // Documento
  asunto                    // Asunto
  folios                    // Folios
  ptosFolios                // Calculado automático
  complejidadId             // FK a ComplejidadJuridica
  ptosComplejidad           // Calculado automático
  ptosTotal                 // Suma
  abogadoId                 // FK a Abogado
  fechaAsignacion           // Fecha Asignación
  estado                    // Pendiente | Atendido
  numeroResolucion          // N° Resolución
  documentoAtencion         // Documento de Atención
  cargos                    // Cargos
}

Abogado {
  id
  nombre
  activo                    // SI | NO
}

ComplejidadJuridica {
  id
  tipo
  puntos
  activo
}

ExtensionRango {
  id
  descripcion               // "1-500", "501-1000", etc.
  minFolios
  maxFolios
  puntos
  activo
}
```

### Funcionalidades Requeridas

1. **Panel de Asignación Inteligente**
   - Mostrar puntos activos de cada abogado
   - Indicar "ASIGNAR A → [Nombre]" (el de menos puntos)

2. **Registro de Apelaciones**
   - Formulario con todos los campos
   - Validación de expediente único
   - Cálculo automático de puntos

3. **Tabla de Apelaciones**
   - Filtros por: Estado, Abogado, Procedencia, Fechas
   - Búsqueda por expediente/sujeto
   - Ordenamiento por columnas
   - Exportar a Excel

4. **Módulo de Mantenimiento**
   - CRUD Abogados (activar/desactivar)
   - Editar tipos de Complejidad Jurídica
   - Editar rangos de Extensión

5. **Dashboard/Resumen**
   - Casos activos y cerrados por abogado
   - Puntos activos por abogado
   - Indicador de balance (equilibrado/desbalanceado)

---

## 7. Campos de Entrada del Formulario

| Campo | Tipo Input | Obligatorio | Notas |
|-------|------------|-------------|-------|
| Fecha Ingreso | DatePicker | ✓ | Default: hoy |
| N° Expediente | Input texto | ✓ | Validar único |
| Sujeto | Input texto | ✓ | Texto libre |
| Procedencia | Input texto | ✓ | Texto libre (con autocompletado de históricos) |
| Documento | Input texto | ✓ | Ej: NOTA 000015-2025-DPE |
| Asunto | Textarea | ✓ | Descripción larga |
| Folios | Input número | ✓ | Min: 1 |
| Complejidad Jurídica | Select | ✓ | Lista del catálogo |
| Abogado | Select | ✓ | Solo activos, sugerir el de menos puntos |
| Fecha Asignación | DatePicker | ✓ | Default: hoy |
| Estado | Select | ✓ | Pendiente (default) / Atendido |
| N° Resolución | Input texto | - | Al cerrar caso |
| Documento de Atención | Input texto | - | Al cerrar caso |
| Cargos | Input texto | - | Estado de cargos |

---

## 8. Diferencias con Diseño Anterior

| Aspecto | Diseño Anterior | Diseño Actual (Real) |
|---------|-----------------|----------------------|
| Columna NNA | "Nombre del Menor" | **"Sujeto"** |
| Columna origen | "UPE" | **"Procedencia"** |
| Campo Documento | No existía | **Nuevo campo** |
| Campo Asunto | No existía | **Nuevo campo** |
| Campo Cargos | No existía | **Nuevo campo** |
| Estado "Resuelto" | Sí | Cambia a **"Atendido"** |
| Procedencia | Lista cerrada | **Texto libre** |

---

## 9. Estadísticas Actuales

- **Total registros**: 27 apelaciones
- **Rango de folios**: 7 - 946
- **Abogados activos**: 2 (Clara Michaud, Karla Garcia)
- **Estados usados**: Pendiente, Atendido
