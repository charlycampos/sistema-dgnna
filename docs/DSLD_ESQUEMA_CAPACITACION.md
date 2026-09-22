# DSLD · Capacitación a defensores (migración desde el Power BI)

Fecha: 17/09/2026 · Estado: **implementado y validado contra el Power BI**

## 1. Origen

| Dato | Valor |
|---|---|
| Archivo | `CAPACITACION_20214-2026 NOMINAL.xlsx` (variable `DSLD_RUTA_CAPACITACION`) |
| Tabla de Excel | `TB_CAPA_DEMUNA` |
| Lo que reemplaza del Power BI | la tabla `TB_CAPA_DEMUNA` y sus medidas de capacitación |
| Registro de cargas | `DSLD_CARGAS` con origen `CAPACITACION` |

## 2. El DNI (opción A acordada con la DSLD)

El DNI **no se guarda en ninguna parte**. Al importar, el servicio lo convierte en `persona_id`, un código de 64 caracteres calculado con HMAC-SHA256 y una clave secreta del servidor (`DSLD_CLAVE_SEUDONIMO`). Del código no se puede volver al DNI.

- Sirve para contar personas distintas aunque una misma persona lleve varios cursos.
- Requiere configurar `DSLD_CLAVE_SEUDONIMO` (mínimo 16 caracteres) en el `.env`. Sin ella, la importación se rechaza con un mensaje claro.
- Si se cambia la clave, hay que volver a importar el Excel; si no, los conteos de personas se duplican.

## 3. Columnas: qué se carga y qué no

| Se carga | Columna del Excel |
|---|---|
| `anio`, `mes`, `fecha_inicio` | FECHA INICIO CURSO (el año equivale a Año_Capacitacion del Power BI) |
| `anio_registro` | AÑO |
| `fecha_fin` | FECHA CULMINA CURSO |
| `codigo_demuna`, `ubigeo`, `ccdd`, `departamento`, `provincia`, `distrito`, `departamento_mod` | CÓDIGO cruzado con el padrón del DNA.mdb; si no tiene código, el DEPARTAMENTO del Excel |
| `curso`, `siglas_curso`, `sede` | CURSO, SIGLAS, SEDE DE CAPACITACIÓN |
| `tipo_capacitacion` | TIPO DE CAPACITACIÓN (VIRTUAL / PRESENCIAL / MIXTA) |
| `tipo_asistente` | TIPO ASISTENTE |
| `estado` | Estado de aprobación (se guardan todos; el tablero muestra solo APROBADO) |
| `persona_id` | DNI convertido en código irreversible |
| `sexo` | SEXO (H/M) |

**No se leen:** nombres, apellidos, teléfono, correo, nota, formación académica, profesión, función que cumple en la DNA, fecha de ingreso al servicio, tutor/a, observación ni el nombre de la DEMUNA.

## 4. Reglas (equivalencia con las medidas DAX)

| Medida del Power BI | En el sistema |
|---|---|
| Filtro `Estado de aprobación = "APROBADO"` | `estado = 'APROBADO'` |
| `Participaciones_Capacitacion` = COUNTROWS | `COUNT(*)` |
| `Personas_Capacitadas` = COUNT(DNI) | `COUNT(persona_id)` (además se calcula el número de personas distintas, que el Power BI no muestra) |
| `Participaciones_Virtual` / `_Presencial` | conteo por `tipo_capacitacion` |
| `Distritos_capacitados` / `Provincias_Capacitadas` | distintos `ubigeo` / primeros 4 dígitos |
| `Regiones_Capacitadas` | distintos `ccdd` (el Power BI cuenta el texto DEPARTAMENTO del Excel, que trae variantes como "Lima", "LIMA " y "LIMA", y devuelve 47) |
| `% Cobertura` | dividido entre el padrón de DEMUNA del DNA.mdb |
| `Ultima_Actualizacion_capacitacion` | `MAX(fecha_inicio)` |
| Comparativo al mismo corte 2026 vs 2025 | mismo cálculo, hasta el último mes con datos |

Validaciones: si alguna fila no tiene FECHA INICIO CURSO o no tiene estado, **no se carga nada** y el mensaje indica las filas.

## 5. Cifras de validación (Excel al 22/06/2026)

| Indicador | Power BI | Sistema |
|---|---|---|
| Registros del Excel | 31,494 | 31,494 |
| Participaciones aprobadas | 27,444 | 27,445 |
| Personas (COUNT del DNI) | 25,341 | 25,341 |
| Personas distintas | no lo calculaba | 12,803 |
| Virtual / presencial | 18,367 / 9,078 | igual |
| Distritos / provincias / departamentos | 1,849 / 196 / 25 | igual |
| Último curso iniciado | 22 junio 2026 | 22/06/2026 |

La diferencia de 1 participación es una fila con "aprobado" en minúsculas: el Power BI la deja fuera y el sistema la cuenta.

## 6. Avisos que aparecen al importar

- **432 registros sin CÓDIGO de DEMUNA:** se cuentan, pero sin ubigeo. Los de Lima quedan agrupados como "LIMA" en el ranking, porque no se puede saber si son de Lima Metropolitana o de la región Lima.
- **125 registros con FECHA CULMINA CURSO no válida:** se guardan con esa fecha vacía.

## 7. Piezas

- Script Oracle: `infrastructure/db/dsld_04_capacitacion.sql` (renombra la tabla anterior a `DSLD_CAPACITACIONES_V1`, crea la nueva y la vista `VW_DSLD_CAPACITACION_DEPARTAMENTO`).
- ETL: `domain/services/dsld_capacitacion_etl.py`. Repositorio: `infrastructure/db/dsld_capacitacion_repo.py`.
- API: bloque `capacitacion` en `GET /resumen`, `GET /capacitacion/resumen` (con filtro de año), `GET /capacitacion/departamentos`, `POST /importar` con `tipoEje=capacitacion` y `POST /sincronizar-ruta` con `origenId=capacitacion`.
- Pestaña "Capacitación": indicadores, cobertura (DEMUNA, distritos, provincias, departamentos), participaciones por año y modalidad, cursos dictados, y ranking por departamento con exportación a Excel.
- Pruebas: `tests/test_dsld_capacitacion_etl.py`, 7 pruebas (incluye que el DNI no aparece en ningún campo y que el código cambia si cambia la clave).

## 8. Puesta en marcha

1. Agregar `DSLD_CLAVE_SEUDONIMO` al `.env` (mínimo 16 caracteres; por ejemplo el resultado de `openssl rand -hex 32`). Guardarla en un lugar seguro.
2. Ejecutar `dsld_04_capacitacion.sql` como `GESTION_DATOS_DB`.
3. `docker compose build gestion-datos-service frontend` y `docker compose up -d`.
4. Cargar el Excel desde "Sincronizar Orígenes & Rutas". Antes debe estar cargado el DNA.mdb, porque de ahí sale el ubigeo de cada DEMUNA.
