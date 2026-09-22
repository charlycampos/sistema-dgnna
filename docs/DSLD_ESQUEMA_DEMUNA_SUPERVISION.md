# DSLD · Paso 1: Esquema Oracle de DEMUNA y Supervisión

**Estado:** aprobado; importación implementada (paso 2). El script aún no se ejecuta en Oracle.
**Script:** `servicios/servicio-gestion-datos/infrastructure/db/dsld_01_demuna_supervision.sql`
**Base:** `ANALISIS_POWERBI_DSLD.md` y `MODELO_DATOS_POWERBI_DSLD.md`
**Fecha:** 16/09/2026

---

## 1. Alcance

Este paso cubre solo lo que viene del **Access `DNA.mdb`**: el padrón de DEMUNA, las supervisiones, el catálogo geográfico, la población NNA y los catálogos. Capacitación, CCONNA, PIAS y Modo Niñez se diseñarán cuando lleguen sus archivos.

Con esto, el sistema **ya no depende del CSV `TB_DISTRITO` del OneDrive**: el catálogo geográfico y la población salen del mismo Access.

---

## 2. Tablas

```
DSLD_CARGAS ◄──────────────── (carga_id en todas las tablas de datos)

DSLD_UBIGEO ◄── DSLD_POBLACION
     ▲
     │ ubigeo (1 a 1)
DSLD_DEMUNAS ──► DSLD_CAT_MODELO   (01 Provincial / 02 Distrital)
     │   └─────► DSLD_CAT_ESTADO   (a / b / c …)
     ▲
     │ codigo_demuna (1 a muchos)
DSLD_SUPERVISIONES ··► DSLD_CAT_SUPERVISOR (sin FK)
```

| Tabla | Qué guarda | Origen en `DNA.mdb` | Filas esperadas |
|---|---|---|---|
| `DSLD_CARGAS` | Una fila por importación: archivo, hash, usuario, fechas, estado y conteos | — | — |
| `DSLD_UBIGEO` | Departamentos, provincias y distritos, con `DEPARTAMENTO_MOD` y `CCDD_ANALITICO` | `ubigeo` | 25 + 196 + 1,899 |
| `DSLD_POBLACION` | Población total y menor de 18 años por distrito | `Perú población INEI 2015` | 1,891 |
| `DSLD_CAT_ESTADO` | Códigos de estado y su grupo en el tablero | `estadodna` | 12 |
| `DSLD_CAT_MODELO` | Tipos de defensoría y sus siglas | `modelodna` | 13 |
| `DSLD_CAT_SUPERVISOR` | Id y nombre del supervisor (**sin DNI**) | `supervisores` | 75 |
| `DSLD_DEMUNAS` | Padrón de DEMUNA municipales | `dna` con `modelo IN ('01','02')` | **1,892** |
| `DSLD_SUPERVISIONES` | Cada supervisión realizada | `supervisadas` unida a `dna` | **10,983** |

**Vistas para la API:**

| Vista | Equivale en Power BI a | Uso |
|---|---|---|
| `VW_DSLD_DEMUNA` | Tabla `dna` con sus columnas calculadas | Pestaña DEMUNA, directorio, mapa |
| `VW_DSLD_SUPERVISION` | `DNA_SUPERVISION` | Pestaña Supervisión |
| `VW_DSLD_RESUMEN_DEPARTAMENTO` | Medidas `Total_*` agrupadas | Ranking y mapa por departamento |
| `VW_DSLD_SUPERVISION_ANIO` | Medidas `DEMUNA Supervisadas 20xx` | Comparativos por año |

---

## 3. Mapeo de columnas

### 3.1 `dna` → `DSLD_DEMUNAS`

**Filtro:** `modelo IN ('01','02')`. Equivale a `rangoPI2023 <> 9` (ver análisis, punto 8.1).

| Access (`dna`) | Oracle | Transformación |
|---|---|---|
| codigo | CODIGO (PK) | Texto de 5 caracteres, tal cual |
| dna | NOMBRE | "Defensoria" → "Defensoría" |
| dna | NOMBRE_CORTO | "Defensoría Municipal de la Niña, Niño y Adolescente" → "DEMUNA" |
| ubigeo | UBIGEO (único, FK) | 6 dígitos |
| dpto / prov / dist | DEPARTAMENTO / PROVINCIA / DISTRITO | Mayúsculas (conserva tildes, como el Power BI) |
| modelo | MODELO (FK) | 01 o 02 |
| estado_acreditacion | ESTADO_ACREDITACION (FK) | a / b / c |
| f_acreditacion | FECHA_ACREDITACION y ANIO_ACREDITACION | Fecha del Access (mes/día/año) → DATE |
| resolución_acreditación | RESOLUCION_ACREDITACION | Tal cual |
| estado_registro | ESTADO_REGISTRO (FK) | 7 / 9 / a |
| f_registro, f_inicio, f_rof | FECHA_REGISTRO, FECHA_INICIO, FECHA_ROF | DATE |
| resolución_inscripción | RESOLUCION_INSCRIPCION | Tal cual |
| direccion, fono1, fono2, email, horario | DIRECCION, TELEFONO1, TELEFONO2, EMAIL, HORARIO | Recorte de espacios |
| def_f, def_m, promdef_f, promdef_m, otros_f, otros_m | DEFENSORES_F/M, PROMOTORES_F/M, OTROS_F/M | Número |
| f_supervisión | FECHA_ULTIMA_SUP_ACCESS | Solo referencial |
| f_cconna, fortalecida | FECHA_CCONNA, FORTALECIDA | Tal cual |
| PI 2022, PI 2025, rangoPI2023 | PI_2022, PI_2025, RANGO_PI_2023 | Tal cual |

**No se importan:** `trash`, `doc_creacion`, `rof`, `observaciones`, `estado_concilia`, `codigo_concilia`, `resolucion_ministerial`, `f_resolucion`, `curso`, `f_curso` y `f_registro_old`, porque el tablero no los usa. Se pueden agregar después.

### 3.2 `supervisadas` → `DSLD_SUPERVISIONES`

**Filtro:** solo las supervisiones cuyo `codigo_dna` exista en `DSLD_DEMUNAS`. Esto reproduce la consulta Access "DEMUNA supervisadas" y deja fuera las de defensorías no municipales y 4 códigos huérfanos.

| Access (`supervisadas`) | Oracle | Transformación |
|---|---|---|
| codigo | ID (PK) | Número |
| codigo_dna | CODIGO_DEMUNA (FK) | Texto de 5 caracteres |
| f_supervision | FECHA_SUPERVISION y ANIO | DATE y año |
| tipo_supervisión | TIPO_SUPERVISION | **1 = VIRTUAL, 2 = PRESENCIAL** (confirmado por la DSLD) |
| supervisor | SUPERVISOR_ID | Sin FK: 5 supervisiones apuntan a ids que no están en el catálogo |
| resumen | RESUMEN | Hasta 4,000 caracteres (el máximo actual es 2,052) |
| comentarios | COMENTARIOS | Hoy siempre vacío |

El ubigeo, el departamento y el estado de la DEMUNA **no se copian** a esta tabla: se obtienen por la vista `VW_DSLD_SUPERVISION`.

### 3.3 `ubigeo` → `DSLD_UBIGEO`

| Regla | Resultado |
|---|---|
| Termina en `0000` | NIVEL = DEPARTAMENTO |
| Termina en `00` | NIVEL = PROVINCIA |
| Otro código | NIVEL = DISTRITO |
| `000000` (Perú) | No se importa |
| Nombres de departamento y provincia | Se toman de sus propias filas, en mayúsculas |
| `DEPARTAMENTO_MOD` | CCDD 15 + CCPP 01 → **LIMA METROPOLITANA**; CCDD 15 + otra provincia → **GORE LIMA**; resto → su departamento |
| `CCDD_ANALITICO` | GORE LIMA → **26**; resto → su CCDD |

### 3.4 `Perú población INEI 2015` → `DSLD_POBLACION`

`UBIGEO` → UBIGEO, `Total Nacional` → POBLACION_TOTAL, `Menor_17` → POBLACION_NNA. 1,891 de las 1,892 DEMUNA tienen población.

---

## 4. Reglas del tablero ya resueltas en las vistas

| Regla del Power BI | Dónde queda |
|---|---|
| Operativa = estado `b` o `c` | `VW_DSLD_DEMUNA.ES_OPERATIVA` |
| Tipo de gobierno (`modelodna.siglas`) | `VW_DSLD_DEMUNA.TIPO_GOBIERNO` |
| `Ultima_Fecha_Supervision` | `VW_DSLD_DEMUNA.ULTIMA_FECHA_SUPERVISION` |
| `Estado_Supervision` | `VW_DSLD_DEMUNA.ESTADO_SUPERVISION` |
| `Estado_Supervision_PERIODO` (este año, año anterior…) | `VW_DSLD_DEMUNA.ESTADO_SUPERVISION_PERIODO` |
| `UBIGEO_PROV`, `UBIGEO_DEP`, `DEPARTAMENTO_MOD` | Columnas de la vista, desde `DSLD_UBIGEO` |
| `POBLACION_NNA` | `VW_DSLD_DEMUNA.POBLACION_NNA` |

Las medidas con comparativos (corte al mismo mes, variaciones y textos) se calcularán en la API (paso 2), sobre estas vistas.

---

## 5. Cómo se cargará (lo implementa el paso 2)

1. Se registra una fila en `DSLD_CARGAS` con estado `EN_PROCESO`.
2. Se lee el Access y se **valida antes de borrar nada**:
   - existen las tablas `dna`, `supervisadas`, `ubigeo`, `estadodna` y `modelodna`;
   - hay más de 0 DEMUNA;
   - todos los ubigeos existen en el catálogo;
   - los estados son a/b/c.
3. En **una sola transacción** se reemplazan catálogos, ubigeo, población, DEMUNA y supervisiones, y se registran los conteos.
4. Si algo falla, se revierte todo y la carga queda como `FALLIDA`, con el detalle del error.

---

## 6. Validación hecha contra el `DNA.mdb` actual

| Verificación | Resultado |
|---|---|
| DEMUNA municipales | 1,892 ✔ |
| Código y ubigeo únicos | ✔ |
| Todos los ubigeos existen en el catálogo | ✔ |
| Estados de registro (7, 9, a) existen en `estadodna` | ✔ |
| La población cruza con el catálogo, sin duplicados | ✔ (1,891 DEMUNA con población) |
| Los textos caben en las longitudes definidas | ✔ |
| Supervisiones de DEMUNA municipales | 10,983 ✔ |
| Supervisores sin catálogo | 5 supervisiones (por eso no lleva FK) |

**Cifras que deben salir en Oracle después de la primera carga:**

| Indicador | Valor |
|---|---|
| Total / acreditadas / no acreditadas / no operativas | 1,892 / 869 / 853 / 170 |
| Operativas | 1,722 |
| Provinciales / distritales | 196 / 1,696 |
| Supervisiones 2024 / 2025 / 2026 | 736 / 806 / 548 |
| DEMUNA con alguna supervisión | 1,691 |

El DDL no se ha ejecutado todavía en Oracle; la validación se hizo sobre los datos.

---

## 7. Impacto y avisos

- **El script no borra datos.** Las tablas anteriores `DSLD_DEMUNAS` y `DSLD_SUPERVISIONES` se renombran a `*_V1`.
- **El código actual quedará desalineado:** `models.py` y `router_dsld.py` usan la estructura vieja, y el endpoint `/dsld/resumen` y la importación dejarán de funcionar hasta el paso 2. Por eso conviene ejecutar el script junto con el paso 2, no antes.
- **Seguridad:** resuelto (17/09/2026). `crear_schema_oracle.sql` ya crea el usuario con privilegios mínimos, y en instalaciones existentes se corrige con `dsld_00_permisos_minimos.sql`, que revoca `DBA` y `RESOURCE`.

## 8. Pendientes

1. ~~Significado de `tipo_supervisión`~~ **Resuelto:** 1 = virtual, 2 = presencial.
2. Confirmar que la consulta "DEMUNA 2026 con población" usa la tabla `Perú población INEI 2015` (sus nombres de columna coinciden).

---

## 9. Paso 2: importación implementada

### Archivos del servicio `servicio-gestion-datos`

| Archivo | Qué hace |
|---|---|
| `domain/services/dsld_access_reader.py` | Lee el Access con **mdbtools** (o `access-parser` como respaldo) y normaliza las fechas |
| `domain/services/dsld_demuna_etl.py` | Aplica las reglas del Power BI y valida todo **antes** de tocar la base |
| `infrastructure/db/dsld_demuna_repo.py` | Carga en una sola transacción, registra la carga en `DSLD_CARGAS` y hace las consultas del tablero |
| `infrastructure/db/models.py` | Modelos del esquema v2: DEMUNA, supervisiones, ubigeo, población, catálogos y cargas |
| `infrastructure/api/router_dsld.py` | Endpoints actualizados (abajo) |
| `Dockerfile` | Instala `mdbtools` y configura UTF-8 |
| `tests/test_dsld_demuna_etl.py` | Pruebas: reglas, validaciones y **cifras de referencia del Power BI** |

### Endpoints (`/api/gestion-datos/dsld/...`)

| Método | Ruta | Uso |
|---|---|---|
| POST | `/importar` (`tipoEje=access_dsld`, archivo `.mdb`/`.accdb`) | Carga manual del DNA.mdb |
| POST | `/sincronizar-ruta` (`origenId=access_dsld`) | Carga desde la ruta de red (archivo, o carpeta con el `.mdb` más reciente) |
| GET | `/resumen?departamento=&provincia=` | KPIs, acreditación por año, supervisión por año y modalidad, comparativos al mismo corte, periodo de última supervisión, ranking y última carga |
| GET | `/demunas?departamento=&provincia=&estadoAcreditacion=&tipoGobierno=&busqueda=` | Directorio paginado |
| GET | `/supervision/departamentos?anios=2024,2025,2026` | Supervisiones por departamento y año |
| GET | `/catalogo-geografico` | Departamentos analíticos y provincias para los filtros |
| GET | `/cargas` | Historial de importaciones |
| GET | `/origenes` | Orígenes, con la última carga real (ya no hay fechas fijas) |

La ruta por defecto del Access es `Z:\Base de Datos\DNA.mdb` y se puede cambiar con la variable de entorno `DSLD_RUTA_DNA_MDB`. El usuario de cada carga se toma del token JWT.

### Resultado de la prueba de punta a punta (DNA.mdb del 16/09/2026)

| Verificación | Resultado |
|---|---|
| Importación completa por `/importar` | ✔ en unos 3 s: 1,892 DEMUNA y 10,983 supervisiones |
| KPIs: total / b / c / a / operativas | ✔ 1,892 / 869 / 853 / 170 / 1,722 |
| Provinciales / distritales | ✔ 196 / 1,696 |
| Supervisiones 2024 / 2025 / 2026 | ✔ 736 / 806 / 548 (virtual 580 / 728 / 483; presencial 156 / 78 / 65) |
| DEMUNA con alguna supervisión | ✔ 1,691 |
| Ranking frente al Power BI | ✔ Áncash 166 (52 acreditadas), GORE Lima 128 (50), Lima Metropolitana 43 (43) |
| Archivo dañado o con extensión incorrecta | ✔ Error 400, carga registrada como FALLIDA, **datos intactos** |
| Ruta inexistente | ✔ Error 404 |

La prueba se hizo con una base temporal en el entorno de desarrollo, no en Oracle. Falta ejecutar el script DDL y repetir la carga en el Oracle real.

### Pasos para ponerlo en marcha

1. Ejecutar `dsld_01_demuna_supervision.sql` en XEPDB1 (renombra las tablas viejas a `*_V1`).
2. Reconstruir el contenedor: `docker compose build gestion-datos-service && docker compose up -d gestion-datos-service`.
3. En `/gestion-datos/dsld` → "Sincronizar Orígenes" → fila Access → **Cargar** → `DNA.mdb`.
4. Validar con las consultas de la sección 9 del script SQL.


---

## 10. Paso 4: tablero conectado a Oracle

`frontend/src/app/gestion-datos/dsld/DemunaDashboardClient.tsx` ya no usa datos fijos en las pestañas migradas:

| Pestaña | Datos | Endpoint |
|---|---|---|
| Situación DEMUNA | Tarjetas, tipología, población NNA y gráfico por departamento; filtros de departamento (con Lima Metropolitana / GORE Lima) y provincia | `/resumen`, `/catalogo-geografico` |
| Supervisión | Supervisiones de los 3 últimos años (virtual/presencial), cobertura, comparativo al mismo corte, antigüedad de la última supervisión y gráfico por departamento | `/resumen`, `/supervision/departamentos` |
| Directorio | Búsqueda, filtros, paginación de 50 en 50 y exportación a Excel del padrón filtrado (hasta 2,000) | `/demunas` |
| Gestor de orígenes | Fecha y registros de la última carga real; el tablero se recarga solo al importar el DNA.mdb | `/origenes` |
| Capacitación, CCONNA, Modo Niñez, PIAS | Siguen con datos de referencia del Power BI y muestran un aviso de "pendiente de migración" | — |

El encabezado muestra la fuente, la fecha de la última carga y los cortes de acreditación y supervisión. Si el servicio falla, aparece un aviso con "Reintentar"; si no hay datos, un aviso para cargar el DNA.mdb.

**Verificación:** `tsc --noEmit` sin errores y prueba en navegador simulado contra el servicio con los datos del DNA.mdb (1,892 DEMUNA; Lima Metropolitana 43; Cusco/Cusco 8; supervisiones 736 / 806 / 548; directorio de 38 páginas; búsqueda "miraflores" = 5; aviso de error con el servicio caído).
