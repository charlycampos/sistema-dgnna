# Modelo de datos del Power BI DSLD_GENERAL_V3

Extraído de `docs/DSLD_GENERAL_V3.pbit` (16/09/2026). Base para diseñar las tablas Oracle del eje DSLD.

**Leyenda de columnas:** *Origen* = viene del archivo; *Calculada* = fórmula DAX del Power BI (el sistema la calcula al importar o en la consulta).

## 1. Resumen de tablas

| Tabla | Tipo | Columnas | Medidas | Origen |
|---|---|---|---|---|
| `TB_DISTRITO` | Datos | 14 | 0 | TB_DISTRITO.csv (OneDrive) |
| `dna` | Datos | 54 | 1 | DNA.mdb → tabla dna |
| `estadodna` | Datos | 2 | 0 | DNA.mdb → tabla estadodna |
| `MEDIDAS` | Contenedor de medidas | 0 | 67 | Contenedor de medidas |
| `CCONNA` | Datos | 10 | 0 | Carpeta X:\CCONNA → hoja "BD ORGANIZACIONAL" |
| `TB_PROVINCIA` | Datos | 7 | 0 | Derivada de TB_DISTRITO |
| `TB_DEPARTAMENTO` | Datos | 4 | 0 | Derivada de TB_PROVINCIA |
| `CCONNA_DISTRITAL` | Datos | 10 | 0 | CCONNA filtrado Tipo = "CCONNA Distrital" |
| `CCONNA_PROVINCIAL` | Datos | 11 | 0 | CCONNA filtrado Tipo = "CCONNA Provincial" |
| `CCONNA_REGIONAL` | Datos | 13 | 0 | CCONNA filtrado Tipo = "CCONNA Regional" |
| `MEDIDA_CCONNA` | Contenedor de medidas | 1 | 10 | Contenedor de medidas |
| `Estado_CCONNA` | Calculada | 1 | 0 | Tabla calculada (2 valores) |
| `MEDIDADS_PIAS` | Contenedor de medidas | 1 | 8 | Contenedor de medidas |
| `TB_PIAS_PADRE_AUTORIDADES` | Datos | 23 | 0 | PIAS_PBI_AUTORIDADES_PADRES.xlsx → TB_PIAS_AUTORIDADES + TB_PIAS_PADRES + TB_PIAS_NNA |
| `TB_MODO_NINEZ_REGIONAL` | Datos | 24 | 0 | TB_MODO_NINEZ_2026 filtrado Regional |
| `MEDIDAS_MODO_NIÑEZ` | Contenedor de medidas | 1 | 7 | Contenedor de medidas |
| `TB_MODO_NINEZ_DISTRITAL` | Datos | 23 | 0 | TB_MODO_NINEZ_2026 filtrado Distrital |
| `TB_MODO_NINEZ_PROVINCIAL` | Datos | 24 | 0 | TB_MODO_NINEZ_2026 filtrado Provincial |
| `TB_MODO_NINEZ_COMPLETO` | Datos | 23 | 0 | MATRIZ DE REPORTE PBI 2026.xlsx → TB_MODO_NINEZ_2026 |
| `DNA_SUPERVISION` | Datos | 16 | 0 | DNA.mdb → consulta "DEMUNA supervisadas" |
| `DNA_POBLACION` | Datos | 8 | 0 | DNA.mdb → consulta "DEMUNA 2026 con población" |
| `TB_CAPA_DEMUNA` | Datos | 32 | 0 | CAPACITACION_20214-2026 NOMINAL.xlsx → tabla TB_CAPA_DEMUNA |
| `MEDIDA RESUMEN` | Contenedor de medidas | 1 | 50 | Contenedor de medidas |
| `TB_CCONNA_NIÑOS` | Datos | 54 | 0 | Carpeta X:\CCONNA → tabla "Tabla5" |

## 2. Relaciones

| Desde | Hacia | Cardinalidad | Filtro | Activa |
|---|---|---|---|---|
| `dna[estado_acreditacion]` | `estadodna[codigo]` | many → one | Una dirección | Sí |
| `CCONNA_DISTRITAL[Ubigeo]` | `TB_DISTRITO[UBIGEO]` | many → one | Ambas direcciones | Sí |
| `TB_PROVINCIA[CCDD_ANALITICO]` | `TB_DEPARTAMENTO[CCDD_ANALITICO]` | many → one | Una dirección | Sí |
| `TB_DISTRITO[UBIGEO_PROV]` | `TB_PROVINCIA[UBIGEO_PROV]` | many → one | Ambas direcciones | Sí |
| `CCONNA_PROVINCIAL[UBIGEO_PROV]` | `TB_PROVINCIA[UBIGEO_PROV]` | one → one | Ambas direcciones | Sí |
| `CCONNA_REGIONAL[CCDD]` | `TB_DEPARTAMENTO[CCDD_ANALITICO]` | one → one | Ambas direcciones | Sí |
| `dna[ubigeo]` | `TB_DISTRITO[UBIGEO]` | one → one | Ambas direcciones | Sí |
| `TB_PIAS_PADRE_AUTORIDADES[UBIGEO]` | `TB_DISTRITO[UBIGEO]` | many → one | Una dirección | Sí |
| `TB_MODO_NINEZ_REGIONAL[CCDD]` | `TB_DEPARTAMENTO[CCDD_ANALITICO]` | one → one | Ambas direcciones | Sí |
| `TB_MODO_NINEZ_DISTRITAL[UBIGEO]` | `TB_DISTRITO[UBIGEO]` | one → one | Ambas direcciones | Sí |
| `TB_MODO_NINEZ_PROVINCIAL[UBIGEO_PROV]` | `TB_PROVINCIA[UBIGEO_PROV]` | one → one | Ambas direcciones | Sí |
| `TB_MODO_NINEZ_COMPLETO[UBIGEO]` | `CCONNA[Ubigeo]` | one → one | Ambas direcciones | Sí |
| `TB_MODO_NINEZ_COMPLETO[UBIGEO]` | `CCONNA_REGIONAL[Ubigeo]` | one → one | Ambas direcciones | Sí |
| `DNA_SUPERVISION[ubigeo]` | `TB_DISTRITO[UBIGEO]` | many → one | Una dirección | Sí |
| `TB_CAPA_DEMUNA[UBIGEO]` | `TB_DISTRITO[UBIGEO]` | many → one | Una dirección | Sí |
| `TB_CCONNA_NIÑOS[DEPARTAMENTO]` | `CCONNA_REGIONAL[Departamento]` | many → one | Una dirección | Sí |
| `DNA_POBLACION[UBIGEO]` | `TB_DISTRITO[UBIGEO]` | one → one | Ambas direcciones | Sí |
| `DNA_POBLACION[codigo]` | `dna[codigo]` | one → one | Ambas direcciones | No |

## 3. Diccionario por tabla

### `TB_DISTRITO`

Origen: TB_DISTRITO.csv (OneDrive)

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| UBIGEO | Texto | Origen |  |
| CCDD | Texto | Origen |  |
| CCPP | Texto | Origen |  |
| CCDI | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| OBJECTID | Texto | Origen |  |
| ESRI_OID | Texto | Origen |  |
| UBIGEO_PROV | Texto | Origen |  |
| Estado_CCONNA_Distrito | Texto | Calculada | ` IF( CALCULATE( COUNTROWS(CCONNA_DISTRITAL) ) > 0, "CCONNA CONFORMADO", "CCONNA NO CONFORMADO" )` |
| DEPARTAMENTO_MOD | Texto | Origen |  |
| CCDD_ANALITICO | Texto | Origen |  |
| Estado_Capacitacion | Texto | Calculada | ` VAR TieneCapacitacion = CALCULATE( COUNTROWS(TB_CAPA_DEMUNA), FILTER( TB_CAPA_DEMUNA, TB_CAPA_DEMUNA[UBIGEO] = TB_DISTRITO[UBIGEO] ) ) RETURN IF( TieneCapacita` |

### `dna`

Origen: DNA.mdb → tabla dna

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| codigo | Texto | Origen |  |
| dna | Texto | Origen |  |
| dpto | Texto | Origen |  |
| prov | Texto | Origen |  |
| dist | Texto | Origen |  |
| estado_acreditacion | Texto | Origen |  |
| f_acreditacion | Fecha | Origen |  |
| resolución_acreditación | Texto | Origen |  |
| PI 2025 | Texto | Origen |  |
| PI 2022 | Texto | Origen |  |
| rangoPI2023 | Entero | Origen |  |
| trash | Texto | Origen |  |
| ubigeo | Texto | Origen |  |
| direccion | Texto | Origen |  |
| fono1 | Texto | Origen |  |
| fono2 | Texto | Origen |  |
| email | Texto | Origen |  |
| modelo | Texto | Origen |  |
| horario | Texto | Origen |  |
| f_inicio | Fecha | Origen |  |
| doc_creacion | Texto | Origen |  |
| f_rof | Fecha | Origen |  |
| rof | Texto | Origen |  |
| def_f | Entero | Origen |  |
| def_m | Entero | Origen |  |
| promdef_f | Entero | Origen |  |
| promdef_m | Entero | Origen |  |
| otros_f | Entero | Origen |  |
| otros_m | Entero | Origen |  |
| estado_registro | Texto | Origen |  |
| f_registro | Fecha | Origen |  |
| resolución_inscripción | Texto | Origen |  |
| f_registro_old | Fecha | Origen |  |
| estado_concilia | Texto | Origen |  |
| codigo_concilia | Texto | Origen |  |
| resolucion_ministerial | Texto | Origen |  |
| f_resolucion | Fecha | Origen |  |
| observaciones | Texto | Origen |  |
| curso | Texto | Origen |  |
| f_curso | Fecha | Origen |  |
| f_supervisión | Fecha | Origen |  |
| f_cconna | Fecha | Origen |  |
| fortalecida | Texto | Origen |  |
| Estado_CCONNA | Texto | Calculada | ` IF( dna[UBIGEO] IN VALUES(CCONNA[UBIGEO]), "ACTIVO", "INACTIVO" )` |
| DEMUNA | Texto | Calculada | ` SUBSTITUTE( dna[dna], "Defensoría Municipal de la Niña, Niño y Adolescente", "DEMUNA" )` |
| POBLACION_NNA | Decimal | Origen |  |
| Ultima_Fecha_Supervision | Fecha | Calculada | ` CALCULATE( MAX(DNA_SUPERVISION[f_supervision]), FILTER( DNA_SUPERVISION, DNA_SUPERVISION[ubigeo] = DNA[ubigeo] ) )` |
| Estado_Supervision | Texto | Calculada | ` IF( ISBLANK(DNA[Ultima_Fecha_Supervision]), "NO SUPERVISADA", "SUPERVISADA" )` |
| Estado_Supervision_PERIODO | Texto | Calculada | ` SWITCH( TRUE(), ISBLANK(DNA[Ultima_Fecha_Supervision]), "SIN SUPERVISIÓN", YEAR(DNA[Ultima_Fecha_Supervision]) = YEAR(TODAY()), "SUPERVISADAS ESTE AÑO", YEAR(D` |
| Año_ultima_fecha | Entero | Calculada | ` YEAR(dna[Ultima_Fecha_Supervision])` |
| UBIGEO_PROV | Texto | Calculada | ` LEFT(dna[ubigeo],4)` |
| TIPO_GOBIERNO | Texto | Origen |  |
| UBIGEO_DEP | Texto | Calculada | ` LEFT(dna[ubigeo],2)` |
| Año Acreditación | Entero | Calculada | `YEAR(dna[F_ACREDITACION])` |

### `estadodna`

Origen: DNA.mdb → tabla estadodna

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| codigo | Texto | Origen |  |
| estado | Texto | Origen |  |

### `CCONNA`

Origen: Carpeta X:\CCONNA → hoja "BD ORGANIZACIONAL"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| N° | Texto | Origen |  |
| Ubigeo | Texto | Origen |  |
| Provincia | Texto | Origen |  |
| Distrito | Texto | Origen |  |
| Tipo de CCONNA  | Texto | Origen |  |
| Nombre del CCONNA | Texto | Origen |  |
| ESTADO | Texto | Origen |  |
| FECHA  REGISTRO | Texto | Origen |  |
| Departamento | Texto | Origen |  |
| NUMERO DEOFICIO DSLD | Texto | Origen |  |

### `TB_PROVINCIA`

Origen: Derivada de TB_DISTRITO

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| UBIGEO_PROV | Texto | Origen |  |
| CCDD | Texto | Origen |  |
| CCPP | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DEPARTAMENTO_MOD | Texto | Origen |  |
| CCDD_ANALITICO | Texto | Origen |  |

### `TB_DEPARTAMENTO`

Origen: Derivada de TB_PROVINCIA

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| CCDD | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| DEPARTAMENTO_MOD | Texto | Origen |  |
| CCDD_ANALITICO | Texto | Origen |  |

### `CCONNA_DISTRITAL`

Origen: CCONNA filtrado Tipo = "CCONNA Distrital"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| N° | Texto | Origen |  |
| Ubigeo | Texto | Origen |  |
| Departamento | Texto | Origen |  |
| Provincia | Texto | Origen |  |
| Distrito | Texto | Origen |  |
| Tipo de CCONNA  | Texto | Origen |  |
| Nombre del CCONNA | Texto | Origen |  |
| ESTADO | Texto | Origen |  |
| FECHA  REGISTRO | Texto | Origen |  |
| NUMERO DEOFICIO DSLD | Texto | Origen |  |

### `CCONNA_PROVINCIAL`

Origen: CCONNA filtrado Tipo = "CCONNA Provincial"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| N° | Texto | Origen |  |
| UBIGEO_PROV | Texto | Origen |  |
| Ubigeo | Texto | Origen |  |
| Departamento | Texto | Origen |  |
| Provincia | Texto | Origen |  |
| Distrito | Texto | Origen |  |
| Tipo de CCONNA  | Texto | Origen |  |
| Nombre del CCONNA | Texto | Origen |  |
| ESTADO | Texto | Origen |  |
| FECHA  REGISTRO | Texto | Origen |  |
| NUMERO DEOFICIO DSLD | Texto | Origen |  |

### `CCONNA_REGIONAL`

Origen: CCONNA filtrado Tipo = "CCONNA Regional"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| N° | Texto | Origen |  |
| CCDD_MAPA | Texto | Origen |  |
| CCDD | Texto | Origen |  |
| Ubigeo | Texto | Origen |  |
| DEPARTAMENTO_OFICIAL | Texto | Origen |  |
| Departamento | Texto | Origen |  |
| Provincia | Texto | Origen |  |
| Distrito | Texto | Origen |  |
| Tipo de CCONNA  | Texto | Origen |  |
| Nombre del CCONNA | Texto | Origen |  |
| ESTADO | Texto | Origen |  |
| FECHA  REGISTRO | Texto | Origen |  |
| NUMERO DEOFICIO DSLD | Texto | Origen |  |

### `MEDIDA_CCONNA`

Origen: Contenedor de medidas

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Columna1 | Texto | Origen |  |

### `Estado_CCONNA`

Origen: Tabla calculada (2 valores)

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Estado | Texto | Calculada (tabla) |  |

### `MEDIDADS_PIAS`

Origen: Contenedor de medidas

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Columna1 | Texto | Origen |  |

### `TB_PIAS_PADRE_AUTORIDADES`

Origen: PIAS_PBI_AUTORIDADES_PADRES.xlsx → TB_PIAS_AUTORIDADES + TB_PIAS_PADRES + TB_PIAS_NNA

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| N° | Texto | Origen |  |
| PERIODO | Texto | Origen |  |
| ENTIDAD | Texto | Origen |  |
| LIN_INTERV | Texto | Origen |  |
| NOM_SERV | Texto | Origen |  |
| UBIGEO | Texto | Origen |  |
| DEPAR_CA | Texto | Origen |  |
| PROVIN_CA | Texto | Origen |  |
| DISTR_CA | Texto | Origen |  |
| CCPP_CA | Texto | Origen |  |
| AREA_RES_CA | Texto | Origen |  |
| NOM_CA | Texto | Origen |  |
| NOMBRE | Texto | Origen |  |
| APE_PAT | Texto | Origen |  |
| APE_MAT | Texto | Origen |  |
| TIPO_DOC | Texto | Origen |  |
| NUM_DOC | Texto | Origen |  |
| FEC_NAC | Texto | Origen |  |
| EDAD | Texto | Origen |  |
| SEXO | Texto | Origen |  |
| FEC_EPE | Fecha | Origen |  |
| NUM_SES | Texto | Origen |  |
| TIPO_PERSONA_PIA | Texto | Origen |  |

### `TB_MODO_NINEZ_REGIONAL`

Origen: TB_MODO_NINEZ_2026 filtrado Regional

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Nº | Entero | Origen |  |
| UBIGEO | Texto | Origen |  |
| NOMBRE DE GOBIERNO | Texto | Origen |  |
| TIPO DE GOBIERNO | Texto | Origen |  |
| MACROREGIÓN | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| AÑO DE REC. | Entero | Origen |  |
| AÑO DE REC.2 | Entero | Origen |  |
| AÑO DE REC.3 | Entero | Origen |  |
| AÑO DE REC.4 | Entero | Origen |  |
| AÑO DE REC.5 | Entero | Origen |  |
| AÑO DE IMPLEMENTACIÓN AL 2026 | Entero | Origen |  |
| AÑO QUE SE SUMÓ A LA ESTRATEGIA | Entero | Origen |  |
| FECHA DE PRESENTACIÓN | Fecha | Origen |  |
| FECHA DE ACTA DE COMPROMISO | Texto | Origen |  |
| SR/SRA | Texto | Origen |  |
| ALCALDE/SA | Texto | Origen |  |
| CÓDIGO DE DEMUNA | Entero | Origen |  |
| ESTADO | Texto | Origen |  |
| ACTA DE COMPROMISO DIGITALIZADA | Texto | Origen |  |
| CCDD | Texto | Origen |  |
| MODO_NIÑEZ | Texto | Origen |  |

### `MEDIDAS_MODO_NIÑEZ`

Origen: Contenedor de medidas

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Columna1 | Texto | Origen |  |

### `TB_MODO_NINEZ_DISTRITAL`

Origen: TB_MODO_NINEZ_2026 filtrado Distrital

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Nº | Entero | Origen |  |
| UBIGEO | Texto | Origen |  |
| NOMBRE DE GOBIERNO | Texto | Origen |  |
| TIPO DE GOBIERNO | Texto | Origen |  |
| MACROREGIÓN | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| AÑO DE REC. | Entero | Origen |  |
| AÑO DE REC.2 | Entero | Origen |  |
| AÑO DE REC.3 | Entero | Origen |  |
| AÑO DE REC.4 | Entero | Origen |  |
| AÑO DE REC.5 | Entero | Origen |  |
| AÑO DE IMPLEMENTACIÓN AL 2026 | Entero | Origen |  |
| AÑO QUE SE SUMÓ A LA ESTRATEGIA | Entero | Origen |  |
| FECHA DE PRESENTACIÓN | Fecha | Origen |  |
| FECHA DE ACTA DE COMPROMISO | Texto | Origen |  |
| SR/SRA | Texto | Origen |  |
| ALCALDE/SA | Texto | Origen |  |
| CÓDIGO DE DEMUNA | Entero | Origen |  |
| ESTADO | Texto | Origen |  |
| ACTA DE COMPROMISO DIGITALIZADA | Texto | Origen |  |
| MODO_NIÑEZ | Texto | Origen |  |

### `TB_MODO_NINEZ_PROVINCIAL`

Origen: TB_MODO_NINEZ_2026 filtrado Provincial

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Nº | Entero | Origen |  |
| UBIGEO | Texto | Origen |  |
| NOMBRE DE GOBIERNO | Texto | Origen |  |
| TIPO DE GOBIERNO | Texto | Origen |  |
| MACROREGIÓN | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| AÑO DE REC. | Entero | Origen |  |
| AÑO DE REC.2 | Entero | Origen |  |
| AÑO DE REC.3 | Entero | Origen |  |
| AÑO DE REC.4 | Entero | Origen |  |
| AÑO DE REC.5 | Entero | Origen |  |
| AÑO DE IMPLEMENTACIÓN AL 2026 | Entero | Origen |  |
| AÑO QUE SE SUMÓ A LA ESTRATEGIA | Entero | Origen |  |
| FECHA DE PRESENTACIÓN | Fecha | Origen |  |
| FECHA DE ACTA DE COMPROMISO | Texto | Origen |  |
| SR/SRA | Texto | Origen |  |
| ALCALDE/SA | Texto | Origen |  |
| CÓDIGO DE DEMUNA | Entero | Origen |  |
| ESTADO | Texto | Origen |  |
| ACTA DE COMPROMISO DIGITALIZADA | Texto | Origen |  |
| UBIGEO_PROV | Texto | Origen |  |
| MODO_NIÑEZ | Texto | Origen |  |

### `TB_MODO_NINEZ_COMPLETO`

Origen: MATRIZ DE REPORTE PBI 2026.xlsx → TB_MODO_NINEZ_2026

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Nº | Entero | Origen |  |
| UBIGEO | Texto | Origen |  |
| NOMBRE DE GOBIERNO | Texto | Origen |  |
| TIPO DE GOBIERNO | Texto | Origen |  |
| MACROREGIÓN | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| AÑO DE REC. | Entero | Origen |  |
| AÑO DE REC.2 | Entero | Origen |  |
| AÑO DE REC.3 | Entero | Origen |  |
| AÑO DE REC.4 | Entero | Origen |  |
| AÑO DE REC.5 | Entero | Origen |  |
| AÑO DE IMPLEMENTACIÓN AL 2026 | Entero | Origen |  |
| AÑO QUE SE SUMÓ A LA ESTRATEGIA | Entero | Origen |  |
| FECHA DE PRESENTACIÓN | Fecha | Origen |  |
| FECHA DE ACTA DE COMPROMISO | Texto | Origen |  |
| SR/SRA | Texto | Origen |  |
| ALCALDE/SA | Texto | Origen |  |
| CÓDIGO DE DEMUNA | Entero | Origen |  |
| ESTADO | Texto | Origen |  |
| ACTA DE COMPROMISO DIGITALIZADA | Texto | Origen |  |
| MODO_NIÑEZ | Texto | Origen |  |

### `DNA_SUPERVISION`

Origen: DNA.mdb → consulta "DEMUNA supervisadas"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| codigo | Texto | Origen |  |
| dna | Texto | Origen |  |
| ubigeo | Texto | Origen |  |
| dpto | Texto | Origen |  |
| prov | Texto | Origen |  |
| dist | Texto | Origen |  |
| modelo | Texto | Origen |  |
| f_supervision | Fecha | Origen |  |
| tipo_supervisión | Entero | Origen |  |
| supervisor | Entero | Origen |  |
| estado_acreditacion | Texto | Origen |  |
| f_acreditacion | Fecha | Origen |  |
| resolución_acreditación | Texto | Origen |  |
| resumen | Texto | Origen |  |
| DEMUNA | Texto | Calculada | ` SUBSTITUTE( DNA_SUPERVISION[dna], "Defensoría Municipal de la Niña, Niño y Adolescente", "DEMUNA" )` |
| Año Supervision | Entero | Calculada | `YEAR(DNA_SUPERVISION[f_supervision])` |

### `DNA_POBLACION`

Origen: DNA.mdb → consulta "DEMUNA 2026 con población"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| codigo | Texto | Origen |  |
| dna | Texto | Origen |  |
| dpto | Texto | Origen |  |
| prov | Texto | Origen |  |
| dist | Texto | Origen |  |
| estado_acreditacion | Texto | Origen |  |
| UBIGEO | Texto | Origen |  |
| POBLACION_NNA | Decimal | Origen |  |

### `TB_CAPA_DEMUNA`

Origen: CAPACITACION_20214-2026 NOMINAL.xlsx → tabla TB_CAPA_DEMUNA

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Nº | Texto | Origen |  |
| AÑO | Texto | Origen |  |
| CÓDIGO | Texto | Origen |  |
| DNA | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| CURSO | Texto | Origen |  |
| SIGLAS | Texto | Origen |  |
| SEDE DE CAPACITACIÓN | Texto | Origen |  |
| TIPO DE CAPACITACIÓN | Texto | Origen |  |
| FECHA INICIO CURSO | Fecha | Origen |  |
| FECHA CULMINA CURSO | Texto | Origen |  |
| TIPO ASISTENTE | Texto | Origen |  |
| TUTOR/A | Texto | Origen |  |
| NOMBRES DEL DEFENSOR/A | Texto | Origen |  |
| APELLIDOS DEL DEFENSOR/A | Texto | Origen |  |
| SEXO | Texto | Origen |  |
| DNI | Texto | Origen |  |
| NOTA | Texto | Origen |  |
| TELÉFONO/CELULAR | Texto | Origen |  |
| CORREO ELECTRÓNICO | Texto | Origen |  |
| FORMACIÓN ACADEMICA | Texto | Origen |  |
| PROFESIÓN | Texto | Origen |  |
| FUNCIÓN QUE CUMPLE EN LA DNA | Texto | Origen |  |
| FECHA INGRESO SERVICIO DNA | Fecha | Origen |  |
| Observación  | Texto | Origen |  |
| Estado de aprobación | Texto | Origen |  |
| UBIGEO | Texto | Origen |  |
| Año_Capacitacion | Entero | Calculada | ` YEAR(TB_CAPA_DEMUNA[FECHA INICIO CURSO])` |
| UBIGEO_PROV | Texto | Calculada | ` LEFT(TB_CAPA_DEMUNA[UBIGEO],4)` |
| UBIGEO_DEP | Texto | Calculada | ` LEFT([UBIGEO],2)` |

### `MEDIDA RESUMEN`

Origen: Contenedor de medidas

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Columna1 | Texto | Origen |  |

### `TB_CCONNA_NIÑOS`

Origen: Carpeta X:\CCONNA → tabla "Tabla5"

| Columna | Tipo | Clase | Fórmula / nota |
|---|---|---|---|
| Source.Name | Texto | Origen |  |
| N° | Texto | Origen |  |
| DEPARTAMENTO | Texto | Origen |  |
| PROVINCIA | Texto | Origen |  |
| DISTRITO | Texto | Origen |  |
| NOMBRES DEL NNA | Texto | Origen |  |
| APELLIDOS DEL NNA | Texto | Origen |  |
| SEXO | Texto | Origen |  |
| FECHA DE NACIMIENTO | Fecha | Origen |  |
| EDAD | Texto | Origen |  |
| NACIONALIDAD | Texto | Origen |  |
| DOCUMENTO DE IDENTIDAD | Texto | Origen |  |
| NÚMERO DE DOCUMENTO | Texto | Origen |  |
| CELULAR NNA | Texto | Origen |  |
| LENGUA MATERNA | Texto | Origen |  |
| USTED VIVE EN UNA ZONA | Texto | Origen |  |
| DISCAPACIDAD | Texto | Origen |  |
| GRADO DE ESTUDIO | Texto | Origen |  |
| NOMBRE DE LA INSTITUCIÓN EDUCATIVA | Texto | Origen |  |
| TIPO DE ADULTO ACOMPAÑANTE (padre, madre, apoderado ) | Texto | Origen |  |
| NOMBRE del ADULTO ACOMPAÑANTE | Texto | Origen |  |
| APELLIDOS del ADULTO ACOMPAÑANTE | Texto | Origen |  |
| DNI ADULTO ACOMPAÑANTE | Texto | Origen |  |
| CELULAR ADULTO ACOMPAÑANTE | Texto | Origen |  |
| Reportan documentación  | Texto | Origen |  |
| UBIGEO DISTRITAL | Texto | Origen |  |
| CCONNA DISTRITAL (participación) | Texto | Origen |  |
| ACTA CCONNA DISTRITAL | Texto | Origen |  |
| RESOLUCIÓN CCONNA DISTRITAL | Texto | Origen |  |
| OTRO DOCUMENTOCCONNA DISTRITAL | Texto | Origen |  |
| Fecha de inicio CCONNA DISTRITAL | Fecha | Origen |  |
| Fecha de termino CCONNA DISTRITAL | Fecha | Origen |  |
| UBIGEO PROVINCIAL | Texto | Origen |  |
| CCONNA PROVINCIAL (participación) | Texto | Origen |  |
| ACTA CCONNA PROVINCIAL | Texto | Origen |  |
| RESOLUCIÓN CCONNA PROVINCIAL | Texto | Origen |  |
| OTRO DOCUMENTOCCONNA PROVINCIAL | Texto | Origen |  |
| Fecha de inicio CCONNA PROVINCIAL | Texto | Origen |  |
| Fecha de termino CCONNA PROVINCIAL | Texto | Origen |  |
| UBIGEO REGIONAL | Texto | Origen |  |
| CCONNA REGIONAL (participación) | Texto | Origen |  |
| ACTA CCONNA REGIONAL | Texto | Origen |  |
| RESOLUCIÓN CCONNA REGIONAL | Texto | Origen |  |
| OTRO DOCUMENTOCCONNA REGIONAL | Texto | Origen |  |
| Fecha de inicio CCONNA REGIONAL | Texto | Origen |  |
| Fecha de termino CCONNA REGIONAL | Texto | Origen |  |
| PERIODO CCONNA REGIONAL | Texto | Origen |  |
| CCONNA NACIONAL (participación) | Texto | Origen |  |
| ACTA CCONNA NACIONAL | Texto | Origen |  |
| RESOLUCIÓN CCONNA NACIONAL | Texto | Origen |  |
| Fecha de inicio CCONNA NACIONAL | Fecha | Origen |  |
| Fecha de termino CCONNA NACIONAL | Fecha | Origen |  |
| Mes/Año (reportado) | Texto | Origen |  |
| COMENTARIOS / OBSERVACIONES | Texto | Origen |  |

## 4. Medidas por contenedor

### `dna` (1)

`Medida`

### `MEDIDAS` (67)

`Tot_municipalidades`, `Header_Distrito`, `Provincia_Texto`, `Departamento_Texto`, `Color_Estado`, `Total_acreditadas`, `Total_no_acreditadas`, `Total_no_operativas`, `Total_operativas`, `Color_Año`, `Total_Cconna_distrital`, `Total_Cconna_provincial`, `Total_Cconna_regional`, `CONNA_ACTIVOS`, `CONNA_INACTIVOS`, `Distrito_Texto`, `Header_Ultima_Supervision`, `Header_Distrito_MOD_2`, `Total_Poblacion_NNA`, `Header_Provincia_v2`, `Poblacion_Provincia`, `Header_Provincia_v3`, `Poblacion_Departamento`, `Header_Departamento`, `Total_NNA_Nacional`, `Header_NNA_Nacional`, `DEMUNA_Supervisadas`, `DEMUNA_No_Supervisadas`, `Personas_Capacitadas`, `Participaciones_Capacitacion`, `Regiones_Capacitadas`, `Distritos_capacitados`, `Total_Distritos`, `% Cobertura Distrital`, `Total_Provincias`, `% Cobertura_Provincial`, `Provincias_Capacitadas`, `% Cobertura_Departamental`, `Total_Departamentos`, `Ultima_Actualizacion_Texto`, `% Acreditadas`, `% No Acreditadas`, `% Operativas`, `% No Operativas`, `Participaciones_Virtual`, `Participaciones_Presencial`, `% Pct_Virtual`, `% Pct_Presencial`, `Virtual_K`, `Presencial_K`, `Ultima_Actualizacion_Supervisión`, `% Cobertura Distrital SUPERVISADOS`, `Provincias_Supervisadas`, `% Supervision_Provincial`, `Ultima_Actualizacion_acred`, `Mostrar_Tarjeta_Distrito`, `Mostrar_Tarjeta_Poblacion`, `Color_Tarjeta_Distrito`, `Color_Tarjeta_Poblacion`, `Header_Distrito_MOD`, `Total_Distritales`, `Total_Provinciales`, `Total_Provincias_Base`, `% Supervision_Departamental`, `Departamentos_Supervisados`, `Acreditadas al corte 2026`, `Ultima_Actualizacion_capacitacion`

### `MEDIDA_CCONNA` (10)

`Distritos_Conformado`, `Distritos_No_Conformado`, `Provincias_Conformado`, `Provincias_No_Conformado`, `Departamentos_Conformado`, `Departamentos_No_Conformado`, `Valor_Distrital_Estado`, `Valor_Provincial_Estado`, `Valor_Departamental_Estado`, `Departamento_Lima_Texto`

### `MEDIDADS_PIAS` (8)

`Total_autoridades_pias`, `Total_padres_pias`, `PERSONAS_ATENTIDAS_PIAS`, `Total_nna_pias`, `% Autoridades pias`, `% Padres pias`, `% NNA pias`, `Ultima_Actualizacion_pias`

### `MEDIDAS_MODO_NIÑEZ` (7)

`Registros con Fecha de Presentación`, `Registro_presntacion_provincial`, `Registro_presntacion_regional`, `Acumulado_provincial`, `Acumulado_regional`, `Acumulado_distrital`, `Acumulado_completo`

### `MEDIDA RESUMEN` (50)

`DEMUNA Acreditadas 2025`, `DEMUNA Acreditadas 2024`, `Dif Acreditadas`, `Var % Acreditadas`, `Comparado 2024 Var % Texto`, `Flecha`, `Dif Texto`, `Texto Corte Último Mes`, `DEMUNA Acreditadas 2026`, `Corte Último Mes`, `Mes Corte 2026`, `Total 2026 Corte`, `Total 2025 Mismo Corte`, `Var % Mismo Corte`, `Texto Comparativo Corte`, `Total_supervisadas`, `Texto Corte Último Mes Supervision`, `DEMUNA Supervisada 2026`, `DEMUNA Supervisadas 2025`, `DEMUNA Supervisadas 2024`, `Dif Supervisadas`, `Dif Texto sup 2024`, `Var % Supervisadas`, `Comparado 2024 Sup Var % Texto`, `Texto Comparativo Corte Supervision`, `Mes Corte 2026 Supervision`, `Total 2025 Mismo Corte Supervision`, `Var % Mismo Corte Supervision`, `Total 2026 Corte Supervision`, `Corte Último Mes Supervisión`, `DEMUNA Supervisadas Acreditadas`, `DEMUNA Supervisadas No Acreditadas`, `DEMUNA Supervisadas No Operativas`, `Nota Supervisadas Año Actual`, `Texto Corte Último Mes CAPA`, `DEMUNA Capacitadas 2026`, `DEMUNA Capacitadas 2025`, `DEMUNA Capacitadas 2024`, `Dif Capacitadas`, `Dif Texto CAPA`, `Var % CAPACITADAS 2025`, `Comparado 2024 Capa Var % Texto`, `Total 2026 Corte Capa`, `Mes Corte 2026 Capa`, `Total 2025 Mismo Corte Capa`, `Texto Comparativo Corte Capa`, `Var % Mismo Corte Capa`, `Corte Último Mes capa`, `Total_capa_2026`, `Texto Resumen Corte Último Mes`

Las fórmulas completas de las medidas y la lógica de cada una están en `ANALISIS_POWERBI_DSLD.md`, sección 5.
