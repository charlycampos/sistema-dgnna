# DSLD · Ponte en Modo Niñez (migración desde el Power BI)

Fecha: 17/09/2026 · Estado: **implementado y validado contra el Power BI**

## 1. Origen

| Dato | Valor |
|---|---|
| Archivo | `X:\MODO_NIÑEZ\MATRIZ DE REPORTE PBI 2026.xlsx` (variable `DSLD_RUTA_MODO_NINEZ`) |
| Tabla de Excel | `TB_MODO_NINEZ_2026` (hoja "MATRIZ INTERNA 28.02") |
| Tablas del Power BI que reemplaza | `TB_MODO_NINEZ_COMPLETO`, `_REGIONAL`, `_PROVINCIAL`, `_DISTRITAL` y `MEDIDAS_MODO_NIÑEZ` |
| Registro de cargas | `DSLD_CARGAS` con origen `MODO_NINEZ` |

## 2. Columnas: qué se carga y qué no

| Columna del Excel | Se carga como | Nota |
|---|---|---|
| Nº | `numero_orden` | |
| UBIGEO | `ubigeo` (PK), `ccdd`, `ubigeo_prov` | Se completa a 6 dígitos. La provincial usa el ubigeo del distrito capital |
| NOMBRE DE GOBIERNO | `nombre_gobierno` | Nombre de la institución |
| TIPO DE GOBIERNO | `nivel_gobierno` | REGIONAL / PROVINCIAL / DISTRITAL |
| MACROREGIÓN | `macroregion` | |
| DEPARTAMENTO / PROVINCIA / DISTRITO | `departamento`, `provincia`, `distrito`, `departamento_mod` | Se usan los nombres del catálogo del DNA.mdb (`DSLD_UBIGEO`); Lima se divide en Lima Metropolitana y GORE Lima |
| MODO_NIÑEZ | `adherido` (S/N) | |
| AÑO QUE SE SUMÓ A LA ESTRATEGIA | `anio_adhesion` | |
| FECHA DE PRESENTACIÓN | `fecha_presentacion`, `anio_presentacion` | |
| FECHA DE ACTA DE COMPROMISO | `fecha_acta` | Una fecha inexistente (p. ej. 29/02/2023) se guarda vacía y se avisa |
| CÓDIGO DE DEMUNA | `codigo_demuna` | Se completa a 5 dígitos |
| ESTADO | `estado_demuna` | Se normaliza a ACREDITADA / NO ACREDITADA / NO OPERATIVA |
| **SR/SRA, ALCALDE/SA** | **no se leen** | Datos personales |
| AÑO DE REC. 1-5, AÑO DE IMPLEMENTACIÓN, ACTA DIGITALIZADA | no se leen | El tablero no los usa |

## 3. Reglas (equivalencia con las medidas DAX)

| Medida del Power BI | En el sistema |
|---|---|
| `Acumulado_regional/provincial/distrital/completo` = filas con `MODO_NIÑEZ = "SI"` | `adherido = 'S'`, agrupado por `nivel_gobierno` |
| `Registro_presentacion_*` = filas con `FECHA DE PRESENTACIÓN` | `fecha_presentacion IS NOT NULL` |

Validaciones: si alguna fila tiene un ubigeo inválido o repetido, un tipo de gobierno desconocido, un MODO_NIÑEZ distinto de SI/NO o no tiene nombre, **no se carga nada** y el mensaje indica las filas.

## 4. Cifras de validación (matriz del 28/02/2026)

| Indicador | Power BI | Sistema |
|---|---|---|
| Gobiernos en la matriz | 546 | 546 |
| En Modo Niñez | 545 | 545 |
| Regionales / Provinciales / Distritales | 15 / 136 / 394 | 15 / 136 / 394 |
| Presentaron reporte 2026 | 71 (4 / 10 / 57) | 71 (4 / 10 / 57) |
| Por año de adhesión | 2019=51, 2020=33, 2021=62, 2022=42, 2023=121, 2024=105, 2025=71, 2026=45 | igual (15 sin año) |
| Lima Metropolitana | 43 | 43 |

## 5. Piezas

- Script Oracle: `infrastructure/db/dsld_02_modo_ninez.sql` (renombra la tabla anterior a `DSLD_MODO_NINEZ_V1` y crea la vista `VW_DSLD_MODO_NINEZ_DEPARTAMENTO`).
- Lector: `domain/services/dsld_excel_reader.py` (lee tablas de Excel por nombre y solo las columnas pedidas; se reutilizará en PIAS, Capacitación y CCONNA).
- ETL: `domain/services/dsld_modo_ninez_etl.py`. Repositorio: `infrastructure/db/dsld_modo_ninez_repo.py`.
- API:
  - `GET /resumen`: bloque `modoNinez` con `migrado: true`.
  - `GET /modo-ninez/departamentos`.
  - `GET /modo-ninez/gobiernos` (filtros: departamento, provincia, nivel, presento, busqueda).
  - `POST /importar` con `tipoEje=modo_ninez` (.xlsx).
  - `POST /sincronizar-ruta` con `origenId=modo_ninez`.
- Tablero, pestaña "Ponte en Modo Niñez":
  - Indicadores por nivel y reportes presentados.
  - Gráficos por año de adhesión (apilado por nivel), por macrorregión, por estado de la DEMUNA y por departamento.
  - Lista paginada con filtros y exportación a Excel.
- Pruebas: `tests/test_dsld_modo_ninez_etl.py` (8 pruebas; incluye la verificación de que no se guardan datos personales y la referencia del Power BI).

## 6. Puesta en marcha

1. Ejecutar `dsld_02_modo_ninez.sql` como `GESTION_DATOS_DB`.
2. Reconstruir `gestion-datos-service` y `frontend`.
3. Cargar primero DNA.mdb (para los nombres del catálogo) y después la matriz de Modo Niñez.
