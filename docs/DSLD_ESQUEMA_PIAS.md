# DSLD · PIAS (migración desde el Power BI)

Fecha: 17/09/2026 · Estado: **implementado y validado contra el Power BI**

## 1. Origen

| Dato | Valor |
|---|---|
| Archivo | `X:\PIAS\PIAS_PBI_AUTORIDADES_PADRES.xlsx` (variable `DSLD_RUTA_PIAS`) |
| Tablas de Excel | `TB_PIAS_AUTORIDADES`, `TB_PIAS_PADRES`, `TB_PIAS_NNA` |
| Lo que reemplaza del Power BI | `TB_PIAS_PADRE_AUTORIDADES` (unión de las tres) y `MEDIDADS_PIAS` |
| Registro de cargas | `DSLD_CARGAS` con origen `PIAS` |

## 2. Columnas: qué se carga y qué no

| Se carga | Columna del Excel | Nota |
|---|---|---|
| `tipo_persona` | (tabla de origen) | AUTORIDAD / PADRE DE FAMILIA / NNA |
| `fecha_atencion`, `anio` | FEC_EPE (NNA: FEC_INI_ACT_FOR) | Obligatoria |
| `mes` | PERIODO | Si falta, se usa el mes de la fecha |
| `ubigeo`, `departamento`, `provincia`, `distrito`, `departamento_mod` | UBIGEO (y DEPAR_CA/PROVIN_CA/DISTR_CA si el ubigeo no está en el catálogo) | Los nombres salen del DNA.mdb |
| `centro_poblado` | CCPP_CA | Comunidad |
| `area_residencia` | AREA_RES_CA / AR_LA | RURAL / URBANA; otros textos se guardan vacíos |
| `cuenca` | NOM_CA | Se unifican las variantes en mayúsculas o minúsculas (NAPO = Napo) |
| `modalidad` | T_mod / TIP_INT | PRESENCIAL / REMOTO / MIXTO |
| `sexo` | SEXO_AUT / SEXO_PoM / SEXO_NNA | H / M (aprobado por la DSLD) |
| `num_sesiones` | Num_ses | |

**No se leen:**
- Datos personales: nombres, apellidos, tipo y número de documento, fecha de nacimiento, edad, CELULAR, N°-TEL, cargo e institución de la autoridad.
- Columnas que el tablero no usa: ENTIDAD, LIN_INTERV, NOM_SERV, TIP_CA, N_Z y las fechas de cada sesión.

## 3. Reglas (equivalencia con las medidas DAX)

| Medida del Power BI | En el sistema |
|---|---|
| `PERSONAS_ATENTIDAS_PIAS` = COUNTROWS | `COUNT(*)` |
| `Total_nna/padres/autoridades_pias` | conteo por `tipo_persona` |
| `% NNA/Padres/Autoridades` | conteo por tipo ÷ total |
| `Ultima_Actualizacion_pias` = MAX(FEC_EPE) | `MAX(fecha_atencion)` |

Validaciones:
- Si falta una de las tres tablas, **no se carga nada**.
- Tampoco se carga nada si algún registro tiene un UBIGEO que no tiene 6 dígitos, no tiene fecha o no tiene cuenca.
- Un UBIGEO que no está en el catálogo del DNA.mdb sí se carga, con los nombres del Excel, y queda un aviso. En el archivo actual es el caso de 250251, en 220 registros de NNA.

## 4. Cifras de validación (archivo al 24/07/2026)

| Indicador | Power BI | Sistema |
|---|---|---|
| Personas atendidas | 17,402 | 17,402 |
| NNA / madres y padres / autoridades | 10,544 / 5,674 / 1,184 | igual |
| % NNA / padres / autoridades | 60.6 / 32.6 / 6.8 | igual |
| Última actualización | 24 julio 2026 | 24/07/2026 |
| Mujeres / hombres | — | 9,184 / 8,218 |
| Loreto | — | 11,849 |

## 5. Piezas

- Script Oracle: `infrastructure/db/dsld_03_pias.sql`. Renombra la tabla anterior a `DSLD_PIAS_V1` y crea `DSLD_PIAS_ATENCIONES` y la vista `VW_DSLD_PIAS_CUENCA`.
- ETL: `domain/services/dsld_pias_etl.py`.
- Repositorio: `infrastructure/db/dsld_pias_repo.py`.
- Lector: `leer_tablas_excel` abre el archivo una sola vez para las tres tablas.
- API:
  - `GET /resumen`: el bloque `pias` trae `migrado: true`.
  - `GET /pias/resumen`, con filtro de año.
  - `GET /pias/distritos`.
  - `POST /importar` con `tipoEje=pias`.
  - `POST /sincronizar-ruta` con `origenId=pias`.
- Pestaña "PIAS" del tablero:
  - Indicadores por tipo de persona.
  - Gráficos por cuenca y por mes.
  - Mujeres y hombres por tipo, y modalidad.
  - Tabla por distrito y cuenca, con exportación a Excel.
- Pruebas: `tests/test_dsld_pias_etl.py`, con 7 pruebas. Verifican que no se guardan datos personales y que las cifras coinciden con el Power BI.

## 6. Puesta en marcha

1. Ejecutar `dsld_03_pias.sql` como `GESTION_DATOS_DB`.
2. Reconstruir `gestion-datos-service` y `frontend`.
3. Cargar el archivo PIAS desde "Sincronizar Orígenes & Rutas". Antes debe estar cargado el DNA.mdb.
