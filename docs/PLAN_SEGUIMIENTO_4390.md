# Plan de continuación — Seguimiento PP 0117 / Indicador 4390 (PIAS)

Fecha: 21-oct-2026. Objetivo: en el módulo POI-PP117 agregar la sección **Seguimiento**
(Carga mensual + Dashboard) que cargue el archivo `docs/4390_PIAS NNA 2026_setiembre.2026.xlsx`
a Oracle para luego calcular el indicador y el dashboard.

## Indicador 4390
% de NNA (3-14 años) atendidos por PIAS que reciben al menos 3 sesiones.
- Numerador = filas con `NNA_ACT_FOR = 1` (col. P). Denominador = total filas hoja `Nominal`.
- Setiembre 2026: **6,208 / 11,089 = 55.98%** (valor de control). Meta MEF set: 46.1%.
- Semáforo: verde >= meta; amarillo hasta 5 pp debajo; rojo > 5 pp debajo; gris sin dato.
- El archivo es ACUMULADO: cada carga = foto completa del mes de corte; si se sube el mismo
  indicador+mes+año, se REEMPLAZA.

## Arquitectura (ya existente)
- Backend: `servicios/servicio-poi-pp117` (FastAPI, SQLAlchemy 2.0, Oracle, puerto 8007).
  Tablas se crean con `Base.metadata.create_all` en `main.py`. Columnas camelCase con `_qn()`.
- Frontend: Next.js en `frontend/src`. Proxy a backend con helpers de `lib/backend.ts`
  (`proxyToPoiService`, `proxyMultipartToPoiService`). Página modelo: `app/poi-pp117/carga/page.tsx`.
- Menú: `frontend/src/components/app-sidebar.tsx` (~línea 185, bloque `pathname.startsWith('/poi-pp117')`).

## HECHO (sin probar)
1. `infrastructure/db/models.py`: agregadas clases `SegCarga` (seg_cargas), `SegPiasNna`
   (seg_pias_nna), `SegPiasSesion` (seg_pias_sesion). Backup del original en la VM ($HOME/models.py.bak).
2. `infrastructure/seguimiento/pias_parser.py` (+ `__init__.py`): función `parsear_pias(bytes)`
   → `{hoja, nna[], sesiones[], avisos[], numerador, denominador, columnasFecha}`.
   Ubica columnas por código, toma toda col. `FEC_*` como sesión, normaliza textos, genera avisos.

## PENDIENTE
### Paso 1 — Router backend: `infrastructure/api/seguimiento_router.py`
`APIRouter(prefix="/api/poi-pp117/seguimiento")`. Reusar `_get_usuario` de `router.py`
(nombre = payload.get("nombre", payload.get("sub"))). Todos los endpoints con auth.
- `GET /indicadores` → `[{codigo:"4390", nombre:"% NNA PIAS con al menos 3 sesiones", hoja:"Nominal"}]`
- `GET /cargas` → lista de SegCarga (id, indicador, mes, anio, mesNombre, nombreArchivo,
  totalFilas, totalSesiones, numerador, denominador, porcentaje, cargadoPor, createdAt), orden desc.
- `POST /cargar?indicador=4390&mes=&anio=&reemplazar=` (multipart `archivo`):
  1. si existe y no reemplazar → 409. 2. `parsear_pias` (ErrorArchivo → 400).
  3. En UNA transacción: si existe, borrar `SegPiasSesion`, `SegPiasNna` por cargaId
     (`query().filter().delete(synchronize_session=False)`) y la carga; crear SegCarga con
     numerador/denominador/totales; `db.flush()`; insertar NNA y sesiones con
     `db.execute(insert(Modelo), chunk)` en bloques de 2000 (agregar cargaId a cada dict);
     commit; rollback ante error.
  4. Responder `{mensaje, filasGuardadas, sesionesGuardadas, numerador, denominador, porcentaje, avisos}`.
- `DELETE /carga/{id}` → borra sesiones, NNA y carga; responder 200 `{ok:true}` (no 204).
- `GET /resumen?indicador=4390&mes=&anio=` (sin mes/año = última carga) → numerador,
  denominador, %, totalSesiones y desglose por departamento, tipoIntervencion y grupo de edad
  (3-5, 6-8, 9-11, 12-14) con func.count / func.sum.
- En `main.py`: `from infrastructure.api.seguimiento_router import router as seg_router`;
  `app.include_router(seg_router)`.

### Paso 2 — Proxies Next.js en `frontend/src/app/api/poi-pp117/seguimiento/`
`indicadores/route.ts` (GET), `cargas/route.ts` (GET), `cargar/route.ts` (POST multipart,
reenviar `request.nextUrl.search`), `carga/[id]/route.ts` (DELETE), `resumen/route.ts` (GET con search).
Copiar el estilo de `app/api/poi-pp117/cargar/route.ts` y `carga/[id]/route.ts`.

### Paso 3 — Páginas
- `app/poi-pp117/seguimiento/carga/page.tsx`: copia de `poi-pp117/carga/page.tsx` con:
  título "Seguimiento · Carga mensual"; tabla de cargas con columna Indicador y %;
  formulario con selector **Indicador** (de /indicadores), Mes, Año, archivo;
  tras subir mostrar resultado (filas, sesiones, num/den/%) y lista de avisos.
- `app/poi-pp117/seguimiento/dashboard/page.tsx`: tarjeta del 4390 (última carga) con
  num/den/% y tablas del desglose de /resumen. (Semáforo cuando existan metas.)

### Paso 4 — Menú (`app-sidebar.tsx`)
Dentro del bloque POI, ANTES del título "POI - PP117", agregar título "Seguimiento"
(icono `ClipboardList` de lucide, importarlo) + NavLinks
`/poi-pp117/seguimiento/carga` "Carga mensual" y `/poi-pp117/seguimiento/dashboard` "Dashboard",
con un `<div className="pt-4">` separando ambas secciones.

### Paso 5 — Prueba
Reiniciar servicio (`servicios/servicio-poi-pp117/iniciar.bat` o docker). Cargar el Excel de
setiembre. Debe dar: **11,089 NNA, 6,208 cumplen, 55.98%, ~29,064 sesiones**.
Avisos esperados: ~512 "FEC2 distinta de la 2da sesión real", 4 "Edad vacía".

## Fase siguiente (no iniciada)
Tablas `indicador` (catálogo 10 indicadores: 4390, 4391, 4392, 4393, 4395, 4397, 4398, 4399,
5138, 5139), `indicador_meta` (indicador, año, mes, tipo_meta MEF/otro, valor),
`indicador_resultado`; semáforo; Dashboard tipo Looker + "Análisis de proceso" (cumplimiento por
región/edad/modalidad, sesiones por mes, continuidad 1→3→5, días para completar 3 sesiones).
Dudas abiertas con Chris: columnas H/I/J de su hoja, el 111.21% de Looker, meta mensual vs anual,
qué archivo alimenta cada indicador.

## Actualización 22-oct-2026 — Bandeja de metas
Nota: los pasos 1–4 de este plan YA están implementados (router, proxies, páginas, menú).

HECHO:
- Tabla `seg_metas` (`SegMeta`: indicador, anio, tipoMeta ANUAL|MES, mes 0 = anual, valor, fuente,
  actualizadoPor, updatedAt). Se crea con `create_all` al reiniciar el servicio.
- `GET /api/poi-pp117/seguimiento/metas?anio=` y `PUT /metas` (body `{anio, metas:[{indicador, metaAnual|null, fuente}]}`;
  null borra la meta; exige sesión). `/indicadores?anio=` y `/resumen` toman la meta anual de `seg_metas`.
- Catálogo del router: se quitaron las metas anuales sin fuente (40, 1.46, 49.08…). Se corrigió `$\ge$` → `≥`.
- Página `poi-pp117/seguimiento/metas`: todo desde la API (sin datos sembrados), selector de año, mes actual
  calculado, error visible con Reintentar, modal para registrar metas con fuente (solo con permiso de escritura).
- Dashboard y Carga leen `?indicador=&mes=&anio=` desde la bandeja.
- Regla de semáforo (documento REGLA + reunión con Chris 21-oct): cumplimiento = logro ÷ meta esperada del mes;
  ≥100% favorable, 90–<100% seguimiento, <90% riesgo. Meta esperada = meta MEF del mes (col. I de la hoja de Chris,
  tabla seg_metas tipoMeta MEF; mes 0 = todo el año, 1-12 = ese mes). Sin meta MEF: meta anual × mes/12 (tabla REGLA).
- Logro 4390 = NNA_ACT_FOR=1 ÷ total (6,208 / 11,089 = 55.98%). En la hoja de Chris la col. H (30.61) está mal.
- Metas 2026 de la hoja (MEF / anual): 4390 46.1/40 · 4391 3.5/1.46 · 4392 6.8/49.08 · 4393 58/64 · 4395 39.4/77.64 ·
  4397 58.5/80.13 · 4398 25/62.3 · 4399 12.5/12.5 · 5138 89.3/89.3 · 5139 4.5/4.5 (registrar en la bandeja).

PENDIENTE:
- Registrar en la bandeja la meta anual 2026 del 4390 (y las demás cuando se validen con la ficha técnica).
- Periodicidad por indicador (estado "No corresponde"), y metas mensuales tipo MES si el esperado no es lineal.

## Validación 22-oct-2026 (carga mensual + dashboard)
- Excel setiembre validado con conteo independiente y contra la hoja resumen "PIAS 2026" del mismo archivo:
  11,089 NNA, 6,208 con NNA_ACT_FOR=1 (55.98%), 29,064 sesiones; totales por mes y por cuenca coinciden.
  Todas las métricas del dashboard coinciden con el conteo independiente.
- Corregido: curva mensual desde enero hasta el mes de corte (antes omitía enero: 69 sesiones), departamentos
  tomados de los datos, eliminado `sinDni: 50` (el Excel no tiene DNI), fechas de carga en hora local.
- Dashboard sin valores de respaldo ni textos fijos de setiembre; semáforo con la regla compartida
  `frontend/src/lib/semaforo-metas.ts` (la usan bandeja, dashboard y carga).
- Carga mensual: ≥ en lugar de $\ge$, "Setiembre", años y mes por defecto dinámicos, indicadores no habilitados
  deshabilitados, semáforo del historial con la meta registrada.
