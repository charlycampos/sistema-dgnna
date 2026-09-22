# DSLD · CCONNA (migración desde el Power BI)

Fecha: 17/09/2026 · Estado: **implementado y validado contra el Power BI**

## 1. Origen

| Dato | Valor |
|---|---|
| Archivo | `CCONNA nominal jul2026.xlsx` (el Power BI leía toda la carpeta `X:\CCONNA`) |
| Hojas y tablas | "BD ORGANIZACIONAL" (tabla `Tabla1`) y "BD NOMINAL" (tabla `Tabla5`) |
| Lo que reemplaza del Power BI | `CCONNA`, `CCONNA_DISTRITAL`, `CCONNA_PROVINCIAL`, `CCONNA_REGIONAL`, `TB_CCONNA_NIÑOS` y las medidas `MEDIDA_CCONNA` |
| Registro de cargas | `DSLD_CARGAS` con origen `CCONNA` |

El sistema importa **un archivo por vez**, no una carpeta. Si la DSLD llegara a manejar varios archivos, habría que consolidarlos antes o avisarme para adaptarlo.

## 2. Datos personales

- **Las niñas, niños y adolescentes no se guardan fila por fila.** La tabla `DSLD_CCONNA_INTEGRANTES` guarda solo **cuántas personas** hay por ubigeo, nivel, sexo y condición (integrante o ex integrante). No hay ninguna columna para nombre, apellidos, documento, fecha de nacimiento, edad, celular, lengua materna, discapacidad, grado de estudio, institución educativa ni datos del adulto acompañante.
- De la hoja organizacional tampoco se leen el nombre, teléfono ni correo del especialista encargado.

## 3. Qué se carga de cada hoja

**BD ORGANIZACIONAL → `DSLD_CCONNA`** (una fila por consejo): Ubigeo, nivel (según "Tipo de CCONNA"), nombre, departamento, provincia y distrito (del catálogo del DNA.mdb), número y fecha de la ordenanza, número y fecha de la resolución, fecha del acta de conformación, fecha del plan de trabajo, año de conformación, base nominal, registro MIMP (SI/NO/OBSERVADO), número de oficio DSLD y fecha de registro.

**BD NOMINAL → `DSLD_CCONNA_INTEGRANTES`** (solo conteos): nivel de participación (distrital, provincial, regional o nacional), ubigeo de ese nivel, sexo, condición y la cantidad.

## 4. Reglas (equivalencia con las medidas DAX)

| Medida del Power BI | En el sistema |
|---|---|
| `Total_Cconna_distrital` / `_provincial` / `_regional` | conteo por `nivel` |
| `Distritos_Conformado` | distintos `ubigeo` de los distritales |
| `Provincias_Conformado` | distintos `ubigeo_prov` de los provinciales |
| `Departamentos_Conformado` | distintos `ccdd` de los regionales (26 = GORE Lima) |
| `TB_CCONNA_NIÑOS` sin "Ex CCONNA" | integrantes con `condicion = 'INTEGRANTE'` en el nivel distrital |
| `Distritos_No_Conformado`, etc. | cobertura contra el padrón de DEMUNA del DNA.mdb |

Validaciones: si alguna fila de la hoja organizacional tiene un ubigeo inválido o repetido, un tipo de CCONNA desconocido o no tiene nombre, **no se carga nada** y el mensaje indica las filas.

## 5. Cifras de validación (archivo de julio 2026)

| Indicador | Power BI | Sistema |
|---|---|---|
| CCONNA conformados | 1,063 | 1,063 |
| Distritales / provinciales / regionales | 890 / 147 / 26 | igual |
| Integrantes NNA (sin ex integrantes) | 6,048 | 6,048 |
| Mujeres / hombres | 3,216 / 2,832 | igual |
| Con registro MIMP | — | 188 (17.7%) |
| Cobertura | — | 890 de 1,892 distritos (47%), 147 de 196 provincias (75%), 26 de 26 departamentos |

## 6. Avisos al importar

- Un CCONNA con un ubigeo que no está en el catálogo del DNA.mdb: es el **CCONNA regional de Lima con código 26** (GORE Lima), que el sistema reconoce y clasifica bien.
- 1,538 participaciones sin ubigeo en la hoja nominal: se cuentan igual, pero no se pueden ubicar en el mapa.

## 7. Piezas

- Script Oracle: `infrastructure/db/dsld_05_cconna.sql` (renombra la tabla anterior a `DSLD_CCONNA_V1`, crea `DSLD_CCONNA` y `DSLD_CCONNA_INTEGRANTES`, y la vista `VW_DSLD_CCONNA_DEPARTAMENTO`).
- ETL: `domain/services/dsld_cconna_etl.py`. Repositorio: `infrastructure/db/dsld_cconna_repo.py`.
- API: bloque `cconna` en `GET /resumen`, `GET /cconna/departamentos`, `GET /cconna/consejos`, `POST /importar` con `tipoEje=cconna` y `POST /sincronizar-ruta` con `origenId=cconna`.
- Pestaña "CCONNA": indicadores, cobertura, conformados por año, documentación registrada, participación por nivel, gráfico por departamento y listado con filtros y exportación.
- Pruebas: `tests/test_dsld_cconna_etl.py`, 6 pruebas (incluye que los integrantes solo se guardan como conteos).

## 8. Limpieza hecha en el tablero

Con CCONNA migrado, las 7 pestañas leen Oracle. Se eliminaron del frontend la tabla de cifras fijas del Power BI (`REFERENCIA_PBI`) y el aviso de "pendiente de migración". En el servicio se quitaron el limpiador antiguo y la importación genérica de archivos: ahora cada eje se importa con su propio validador.

## 9. Puesta en marcha

1. Ejecutar `dsld_05_cconna.sql` como `GESTION_DATOS_DB`.
2. `docker compose build gestion-datos-service frontend` y `docker compose up -d`.
3. Cargar `CCONNA nominal jul2026.xlsx` desde "Sincronizar Orígenes & Rutas". Antes debe estar cargado el DNA.mdb.
