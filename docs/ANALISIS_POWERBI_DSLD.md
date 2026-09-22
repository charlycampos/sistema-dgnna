# Análisis del Power BI DSLD_GENERAL_V3

**Objetivo:** entender cómo funciona el tablero actual de la DSLD (orígenes, transformaciones, modelo y cálculos) antes de trasladarlo al Sistema DGNNA.

**Fuentes analizadas:**
- `docs/DSLD_GENERAL_V3.pbit`: consultas Power Query, medidas DAX y relaciones.
- `docs/DSLD_GENERAL_V3.pbix`: páginas y visuales.
- `docs/DNA.mdb`: la base Access real.

**Fecha:** 16/09/2026

---

## 1. Qué es y qué hace

Es el tablero oficial de la DSLD. Consolida en **17 páginas** cinco líneas de trabajo con los gobiernos locales:

| Eje | Páginas | Qué muestra |
|---|---|---|
| DEMUNA | RESUMEN DSLD, DEMUNA, DEMUNA DETALLE, Directorio DEMUNA | Padrón, acreditación, operatividad, tipo de gobierno y población NNA por distrito |
| Supervisión | RESUMEN_SUPERVISION, DEMUNA SUPERVISIÓN | DEMUNA supervisadas por año, cobertura, última supervisión y comparativo al mismo corte |
| Capacitación | RESUMEN_CAPACITACION, DEMUNA CAPACITACIÓN, DEMUNA ESTADO CAPACITACIÓN | Defensores capacitados (solo aprobados), virtual o presencial, cobertura distrital, provincial y regional |
| CCONNA | RESUMEN_CCONNA, CCONNA, CONNAN DETALLE | CCONNA conformados por nivel (distrital, provincial, regional) y NNA integrantes |
| PIAS | RESUMEN PIAS, PIAS v2 | Personas atendidas (NNA, padres de familia y autoridades) en las PIAS |
| Ponte en Modo Niñez | RESUMEN MODO NIÑEZ, MODO NIÑEZ, MODO NIÑEZ DETALLE | Gobiernos adheridos por nivel, acumulados y fechas de presentación |

Casi todas las páginas incluyen un **mapa del Perú** (GeoJSON de departamentos y distritos) con filtros de departamento, provincia y distrito.

---

## 2. Orígenes de datos (de dónde lee)

| Tabla Power BI | Origen real | Tipo |
|---|---|---|
| `dna` | `Z:\Base de Datos\DNA.mdb` → tabla **dna** | Access |
| `estadodna` | `DNA.mdb` → tabla **estadodna** | Access |
| `TIPO_GOBIERNO` (auxiliar) | `DNA.mdb` → tabla **modelodna** | Access |
| `DNA_SUPERVISION` | `DNA.mdb` → **consulta guardada "DEMUNA supervisadas"** | Access (consulta) |
| `DNA_POBLACION` | `DNA.mdb` → **consulta guardada "DEMUNA 2026 con población"** (columna `Menor_17`) | Access (consulta) |
| `TB_CAPA_DEMUNA` | `D:\Usuario\dsld14\OneDrive\...\DEMUNA\CAPACITACION_20214-2026 NOMINAL.xlsx` → tabla **TB_CAPA_DEMUNA** | Excel (**OneDrive personal**) |
| `CCONNA` | Carpeta `X:\CCONNA\` → todos los Excel, hoja **"BD ORGANIZACIONAL"** | Carpeta de Excel |
| `TB_CCONNA_NIÑOS` | Carpeta `X:\CCONNA\` → todos los Excel, tabla **"Tabla5"** | Carpeta de Excel |
| `TB_PIAS_PADRE_AUTORIDADES` | `X:\PIAS\PIAS_PBI_AUTORIDADES_PADRES.xlsx` → tablas **TB_PIAS_AUTORIDADES**, **TB_PIAS_PADRES** y **TB_PIAS_NNA** | Excel |
| `TB_MODO_NINEZ_*` (4 tablas) | `X:\MODO_NIÑEZ\MATRIZ DE REPORTE PBI 2026.xlsx` → tabla **TB_MODO_NINEZ_2026** | Excel |
| `TB_DISTRITO` | `D:\Usuario\dsld14\OneDrive\...\recursos\TB_DISTRITO.csv` | CSV (**OneDrive personal**) |
| `TB_PROVINCIA`, `TB_DEPARTAMENTO` | Derivadas de `TB_DISTRITO` | — |

**Observaciones:**
- Las rutas reales son `Z:\Base de Datos\DNA.mdb` y `X:\...`. El sistema actual usa `Z:\DSLD\Base de Datos\dna.mdb`, `W:\` e `Y:\`, que **no coinciden**.
- Dos fuentes están en el **OneDrive personal de un usuario (dsld14)**. Son un riesgo de continuidad y deben pasar a una ruta institucional.
- Dos tablas vienen de **consultas guardadas en Access**, no de tablas. El sistema debe reproducir esas consultas.
- **Datos personales:** capacitación, CCONNA y PIAS traen nombres, DNI, fecha de nacimiento y celular, incluidos datos de **niñas, niños y adolescentes**. El tablero solo usa conteos, así que el sistema debería guardar solo lo necesario o anonimizar.

---

## 3. Transformaciones (Power Query)

### 3.1 `dna` (padrón DEMUNA)
1. Convierte a fecha: `f_acreditacion`, `f_rof`, `f_registro`, `f_registro_old`, `f_resolucion` y `f_supervisión`. En el Access vienen como mes/día/año.
2. Pasa a mayúsculas `dpto`, `prov` y `dist`.
3. **Filtra `rangoPI2023 <> 9`.** Esta es la regla clave: de 3,208 filas quedan **1,892 DEMUNA**.
4. Reemplaza "Defensoria" por "Defensoría" en el nombre.
5. Cruza `modelo` con `modelodna.codigo` y obtiene **TIPO_GOBIERNO** (`siglas`: Provincial o Distrital).
6. Cruza `codigo` con `DNA_POBLACION` y obtiene **POBLACION_NNA**.
7. Columnas calculadas (DAX):
   - `DEMUNA`: nombre corto ("Defensoría Municipal de la Niña, Niño y Adolescente" → "DEMUNA").
   - `Ultima_Fecha_Supervision`: la supervisión más reciente del mismo ubigeo.
   - `Estado_Supervision`: SUPERVISADA o NO SUPERVISADA.
   - `Estado_Supervision_PERIODO`: este año, año anterior, más de 1 año o sin supervisión.
   - `Estado_CCONNA`: ACTIVO si el ubigeo está en CCONNA.
   - `UBIGEO_PROV` (4 dígitos), `UBIGEO_DEP` (2 dígitos) y `Año Acreditación`.

### 3.2 `estadodna` (códigos de estado)
Pasa el texto a mayúsculas. Los códigos que usa el tablero son:

| Código | Significado | Uso en el tablero |
|---|---|---|
| `b` | Acreditada | Acreditada |
| `c` | No acreditada | No acreditada |
| `a` | No operativa | No operativa |

**Operativa = `b` + `c`.**

### 3.3 `DNA_SUPERVISION`
Viene de la consulta Access "DEMUNA supervisadas": une `dna` con `supervisadas` (`codigo` = `codigo_dna`) y filtra **modelo 01 o 02**. Columnas: código, nombre, ubigeo, dpto/prov/dist, modelo, `f_supervision`, `tipo_supervisión`, supervisor, estado y fecha de acreditación, resolución y resumen. Calcula `Año Supervision`.

### 3.4 `TB_CAPA_DEMUNA`
1. Convierte `CÓDIGO` a texto y limpia `FECHA INGRESO SERVICIO DNA`.
2. Cruza `CÓDIGO` con `dna.codigo` y obtiene el **UBIGEO**. El Excel no trae ubigeo.
3. **Se queda solo con las filas donde `Estado de aprobación = "APROBADO"`.**
4. Calcula `Año_Capacitacion` = año de `FECHA INICIO CURSO`, además de `UBIGEO_PROV` y `UBIGEO_DEP`.

### 3.5 `CCONNA` (organizaciones)
1. Combina todos los Excel de `X:\CCONNA\` (hoja "BD ORGANIZACIONAL") y excluye los archivos ocultos.
2. Pasa Departamento, Provincia y Distrito a mayúsculas y quita las tildes.
3. Conserva: N°, Ubigeo, Departamento, Provincia, Distrito, **Tipo de CCONNA**, Nombre del CCONNA, número de oficio DSLD y fecha de registro.
4. Marca `ESTADO = "CCONNA CONFORMADO"` en todas las filas.
5. Se divide en tres tablas según `Tipo de CCONNA`:
   - **CCONNA_DISTRITAL** ("CCONNA Distrital").
   - **CCONNA_PROVINCIAL** ("CCONNA Provincial"), con `UBIGEO_PROV`.
   - **CCONNA_REGIONAL** ("CCONNA Regional"), con `CCDD`. El código 26 corresponde a GORE Lima y se mapea a 15 en el mapa.

### 3.6 `TB_CCONNA_NIÑOS` (integrantes)
Combina los Excel de `X:\CCONNA\` (tabla "Tabla5"), con 54 columnas: datos del NNA, adulto acompañante y participación por nivel. **Excluye** las filas con `CCONNA DISTRITAL (participación) = "Ex CCONNA"`. Se relaciona con CCONNA_REGIONAL por departamento y alimenta el conteo por **SEXO**.

### 3.7 `TB_PIAS_PADRE_AUTORIDADES`
Une las tres tablas del Excel PIAS, cada una con su columna `TIPO_PERSONA_PIA`:
- `TB_PIAS_AUTORIDADES` → **"AUTORIDAD"**.
- `TB_PIAS_PADRES` → **"PADRE DE FAMILIA"**.
- `TB_PIAS_NNA` → **"NNA"**. Aquí `FEC_INI_ACT_FOR` se renombra a `FEC_EPE`.

Normaliza los nombres a: PERIODO, ENTIDAD, UBIGEO, DEPAR_CA, PROVIN_CA, DISTR_CA, CCPP_CA, AREA_RES_CA, NOM_CA, NOMBRE, APE_PAT, APE_MAT, TIPO_DOC, NUM_DOC, FEC_NAC, EDAD, SEXO, FEC_EPE y NUM_SES. Recorta los espacios. **Cada fila es una persona atendida.**

### 3.8 `TB_MODO_NINEZ_*`
Todas leen la tabla `TB_MODO_NINEZ_2026` y filtran por `TIPO DE GOBIERNO`:
- **REGIONAL** ("Regional"), con `CCDD`.
- **PROVINCIAL** ("Provincial"), con `UBIGEO_PROV`.
- **DISTRITAL** ("Distrital").
- **COMPLETO** (sin filtro).

Columnas clave: UBIGEO, NOMBRE DE GOBIERNO, MACROREGIÓN, AÑO QUE SE SUMÓ A LA ESTRATEGIA, FECHA DE PRESENTACIÓN, FECHA DE ACTA DE COMPROMISO, ALCALDE/SA, CÓDIGO DE DEMUNA, ESTADO y **MODO_NIÑEZ (SI/NO)**.

### 3.9 Geografía (`TB_DISTRITO`, `TB_PROVINCIA`, `TB_DEPARTAMENTO`)
Parte de un CSV de distritos (UBIGEO, CCDD, CCPP, CCDI, nombres) y agrega:
- `UBIGEO_PROV`: los 4 primeros dígitos del ubigeo.
- **`DEPARTAMENTO_MOD`:** Lima + provincia Lima = **"LIMA METROPOLITANA"**; Lima + otra provincia = **"GORE LIMA"**; el resto conserva su departamento.
- `CCDD_ANALITICO`: GORE LIMA = **"26"**; el resto conserva su CCDD.

Provincia y departamento se obtienen quitando duplicados.

---

## 4. Modelo de relaciones

```
estadodna ◄── dna ──► TB_DISTRITO ──► TB_PROVINCIA ──► TB_DEPARTAMENTO
                         ▲   ▲   ▲          ▲                 ▲
   DNA_SUPERVISION ──────┘   │   │          │                 │
   TB_CAPA_DEMUNA ───────────┘   │          │                 │
   TB_PIAS_PADRE_AUT. ───────────┤          │                 │
   CCONNA_DISTRITAL ─────────────┤   CCONNA_PROVINCIAL   CCONNA_REGIONAL ◄── TB_CCONNA_NIÑOS
   TB_MODO_NINEZ_DISTRITAL ──────┤   TB_MODO_NINEZ_PROV. TB_MODO_NINEZ_REGIONAL
   DNA_POBLACION ────────────────┘
```

**El ubigeo es la llave de todo:** 6 dígitos para distrito, 4 para provincia y 2 para departamento, con `CCDD_ANALITICO`, que separa GORE Lima como 26.

---

## 5. Cálculos (medidas DAX) que hay que replicar

### DEMUNA
| Indicador | Regla |
|---|---|
| Total municipalidades | Filas de `dna` (tras el filtro `rangoPI2023 <> 9`) |
| Acreditadas / No acreditadas / No operativas | `estado_acreditacion` = `b` / `c` / `a` |
| Operativas | `estado_acreditacion` en (`b`, `c`) |
| % de cada estado | Estado ÷ total |
| Provinciales / Distritales | `TIPO_GOBIERNO` = Provincial / Distrital |
| Acreditadas 2024, 2025 y 2026 | Códigos distintos con estado `b` y año de `f_acreditacion` = año |
| Comparativo al mismo corte | Acreditadas 2026 hasta el último mes con datos frente a 2025 hasta ese mismo mes |
| Corte | Mes y año de la última `f_acreditacion` |
| Población NNA | Suma de `POBLACION_NNA` (por distrito, provincia, departamento y nación) |

### Supervisión
| Indicador | Regla |
|---|---|
| Supervisiones por año | Filas de `DNA_SUPERVISION` con año de `f_supervision` = año. **2024 usa códigos distintos; 2025 y 2026 cuentan filas** (inconsistencia del Power BI) |
| DEMUNA supervisadas / no supervisadas | DEMUNA con o sin `Ultima_Fecha_Supervision` |
| % cobertura supervisados | Supervisadas ÷ total de DEMUNA |
| Provincias / departamentos supervisados | Conteo distinto de `UBIGEO_PROV` / `UBIGEO_DEP` |
| Supervisadas del año actual por estado | Filas del año actual con estado `b` / `c` / `a` |
| Comparativo al mismo corte | Igual que en acreditación, con `f_supervision` |

### Capacitación (solo APROBADOS)
| Indicador | Regla |
|---|---|
| Personas capacitadas | Conteo de DNI (no distintos) |
| Participaciones | Filas |
| Virtual / Presencial | `TIPO DE CAPACITACIÓN` = "Virtual" / "Presencial"; % sobre participaciones |
| Regiones, provincias y distritos capacitados | Conteo distinto de departamento, `UBIGEO_PROV` y `UBIGEO` |
| % cobertura | Capacitados ÷ total del padrón DEMUNA (distritos, provincias, departamentos) |
| Capacitados 2024, 2025 y 2026 | DNI por año de `FECHA INICIO CURSO`, más el comparativo al mismo corte |
| Estado por distrito | "Con capacitación" o "Sin capacitación" |

### CCONNA
| Indicador | Regla |
|---|---|
| Distritales, provinciales y regionales | Conteo de filas por tipo |
| Conformados / no conformados | Ubigeos distintos con CCONNA ÷ total de distritos, provincias o departamentos geográficos |
| Estado por distrito | "CCONNA CONFORMADO" si existe un registro distrital |
| Integrantes por sexo | Filas de `TB_CCONNA_NIÑOS` por SEXO |

### PIAS
| Indicador | Regla |
|---|---|
| Personas atendidas | Filas |
| NNA / padres / autoridades | Filas por `TIPO_PERSONA_PIA`, con % sobre el total |
| Última actualización | Máximo de `FEC_EPE` |

### Ponte en Modo Niñez
| Indicador | Regla |
|---|---|
| Acumulado (completo, regional, provincial, distrital) | Filas con `MODO_NIÑEZ = "SI"` |
| Con fecha de presentación | Filas con `FECHA DE PRESENTACIÓN` no vacía, por nivel |

---

## 6. Cifras de referencia (calculadas desde `DNA.mdb`)

Aplicando las reglas del Power BI al Access de la carpeta `docs`:

| Indicador | Valor |
|---|---|
| DEMUNA en el padrón (`rangoPI2023 <> 9`) | **1,892** |
| Acreditadas (`b`) | **869** |
| No acreditadas (`c`) | **853** |
| No operativas (`a`) | **170** |
| Operativas (`b` + `c`) | **1,722** |
| Provinciales / Distritales | **196 / 1,696** |
| Acreditadas por año de acreditación: 2024 / 2025 / 2026 | 117 / 121 / 57 |
| Última fecha de acreditación | 15/09/2026 |
| Filas de supervisión (modelo 01/02) | 10,983 |
| Supervisiones por año: 2024 / 2025 / 2026 | 736 / 806 / 548 |
| DEMUNA con al menos una supervisión | 1,691 |
| Última supervisión | 05/09/2026 |

Estas cifras coinciden con las de `MIGRACION_DSLD_POWERBI_A_ORACLE.md` (1,891 municipalidades y 869 acreditadas). Servirán para **validar el sistema**: cuando Oracle muestre estos números, la importación está bien.

---

## 7. Brechas frente al sistema actual

| Tema | Power BI (real) | Sistema actual | Brecha |
|---|---|---|---|
| Padrón DEMUNA | `dna` filtrado por `rangoPI2023 <> 9` | Toma la primera tabla con "DNA" en el nombre y no filtra | Podría cargar `estadodna` o 3,208 filas |
| Estado | Códigos a/b/c con `estadodna` | Adivina por texto | Da 919 acreditadas en vez de 869 |
| Tipo de gobierno | `modelo` → `modelodna.siglas` | No lo lee | Todas quedan como distritales |
| Supervisión | Consulta "DEMUNA supervisadas" (join + modelo 01/02) | Busca una tabla con "SUP" | Sin ubigeo, todo en 2026 |
| Población NNA | Consulta "DEMUNA 2026 con población" | No existe | Falta |
| Capacitación | Solo APROBADOS; ubigeo cruzado desde `dna` | No filtra; no cruza | Cifras infladas, sin ubigeo |
| CCONNA | Carpeta de Excel: organizaciones y NNA por separado | Un solo Excel; inventa 6 NNA y 55 % mujeres | Modelo distinto |
| PIAS | 3 tablas (autoridad, padre, NNA), una fila por persona | Espera totales y una "cuenca" | Falla (error 500) |
| Modo Niñez | 1 tabla con nivel y `MODO_NIÑEZ` SI/NO | Campos que no existen en el modelo | Falla (error 500) |
| Geografía | CSV de distritos con LIMA METROPOLITANA / GORE LIMA | No existe | Falta el catálogo de ubigeo |
| Rutas | `Z:\Base de Datos\`, `X:\CCONNA`, `X:\PIAS`, `X:\MODO_NIÑEZ`, OneDrive | `Z:\DSLD\...`, `W:\`, `Y:\` | No coinciden |
| Tablero | 17 páginas con medidas | 7 pestañas con datos fijos | Sin conexión a datos reales |

---

## 8. Pendientes por confirmar con la DSLD

1. **Qué significa `rangoPI2023 = 9`.** Se asume "excluir del padrón".
2. **La consulta "DEMUNA 2026 con población":** su SQL no se pudo leer por codificación; hay que abrirla en Access.
3. **Ejemplos reales** de los Excel: capacitación, un archivo de `X:\CCONNA`, el Excel de PIAS y la matriz de Modo Niñez.
4. **El CSV `TB_DISTRITO`.** Confirmar si se puede reemplazar por el ubigeo que ya tiene el módulo Mapa.
5. **Rutas institucionales definitivas** (UNC) de Z: y X:, y sacar las fuentes del OneDrive personal.
6. **Qué datos personales se guardan en Oracle**, sobre todo de NNA (se recomienda guardar solo lo necesario para contar).
7. **La inconsistencia de supervisión 2024** (códigos distintos) frente a 2025 y 2026 (filas): hay que definir la regla oficial.
