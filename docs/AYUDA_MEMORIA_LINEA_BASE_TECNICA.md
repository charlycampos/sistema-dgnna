# Línea base técnica — Ayuda Memoria

**Corte:** 11 de septiembre de 2026  
**Alcance:** Entrega 0 de `PLAN_MEJORAS_AYUDA_MEMORIA.md`  
**Naturaleza:** documentación del comportamiento existente; no implica que las brechas estén aprobadas.

## Componentes actuales

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Página | `frontend/src/app/ayuda-memoria/page.tsx` | Carga de sesión y entrada al módulo |
| Cliente | `frontend/src/app/ayuda-memoria/AyudaMemoriaClient.tsx` | Catálogo, filtros, editor, diseñador, Excel y descarga |
| Proxy | `frontend/src/app/api/ayuda-memoria/[...path]/route.ts` | Comunicación con el backend |
| API | `backend/routers/ayuda_memoria.py` | CRUD, bitácora, semillas, auditoría y DOCX |
| Persistencia | `backend/models.py` | Entidades SQLAlchemy `Am*` |
| Inicialización | `backend/main.py` | Creación de tablas Oracle y semillas oficiales |

## Modelo de datos

| Tabla | Propósito |
|---|---|
| `am_plantillas` | Catálogo de plantillas |
| `am_secciones` | Bloques ordenados de una plantilla |
| `am_documentos` | Instancias elaboradas desde una plantilla |
| `am_documento_valores` | Contenido de cada sección de un documento |
| `am_caso_acciones` | Actuaciones cronológicas |
| `am_auditoria_accesos` | Consultas y exportaciones auditadas |

Estados documentados actualmente: `BORRADOR`, `ACTUALIZADO`, `PUBLICADO` e `HISTORICO`.

Tipos documentados actualmente: `TEXTO`, `TABLA_DATOS`, `GRAFICO`, `BITACORA` y `CONCLUSIONES`.

## Endpoints existentes

| Método y ruta | Comportamiento actual |
|---|---|
| `GET /api/ayuda-memoria/plantillas` | Lista plantillas activas |
| `POST /api/ayuda-memoria/plantillas` | Crea plantilla y secciones |
| `GET /api/ayuda-memoria/documentos` | Lista documentos con filtros |
| `POST /api/ayuda-memoria/documentos` | Crea borrador y valores iniciales |
| `GET /api/ayuda-memoria/documentos/{id}` | Recupera detalle y registra consulta en casos |
| `PUT /api/ayuda-memoria/documentos/{id}` | Actualiza metadatos, estado y valores |
| `POST /api/ayuda-memoria/documentos/{id}/acciones` | Anexa una actuación |
| `GET /api/ayuda-memoria/documentos/{id}/exportar-docx` | Genera DOCX y registra exportación |
| `POST /api/ayuda-memoria/seed` | Verifica/crea plantillas oficiales |

## Línea base de plantillas oficiales

### `SERV_NNA`

- Ámbito nacional.
- Siete bloques en orden.
- Cuatro bloques de texto y tres tablas.
- El DOCX debe conservar las siete cabeceras y las tres tablas.

### `REGIONAL`

- Requiere departamento.
- Seis bloques: dos textos y cuatro tablas.
- Región visible en listado, filtros, editor y metadatos del DOCX.

### `CASO_SENSIBLE`

- Tres bloques de texto.
- Consulta y exportación registran auditoría.
- Brecha conocida: la semilla no incluye un bloque `BITACORA`, por lo que la acción no está disponible desde esa plantilla.

### `HITO_TEMATICO`

- Tres bloques: texto, tabla de acuerdos y conclusiones.
- Brecha conocida: `CONCLUSIONES` no tiene editor específico en el frontend actual.

## Prueba de humo automatizada

Archivo: `backend/tests/test_ayuda_memoria_smoke.py`.

La prueba unitaria utiliza SQLite en memoria y datos sintéticos únicamente con `TESTING=true`. No constituye una conexión operativa, ni lee o modifica la base configurada. La prueba de integración `backend/tests/test_ayuda_memoria_oracle.py` valida el flujo real solo cuando se proporciona explícitamente `TEST_ORACLE_DATABASE_URL` de un ambiente QA. Comprueba:

1. Listado de plantillas.
2. Creación de un documento y sus valores.
3. Listado y consulta del detalle.
4. Edición de contenido y estado.
5. Generación y apertura del DOCX.
6. Registro de auditoría `EXPORTAR_WORD`.

Ejecución desde `backend`:

```powershell
.\venv\Scripts\python.exe -m unittest tests.test_ayuda_memoria_smoke -v
```

## Respaldo previo a migraciones

El script `backend/respaldo_ayuda_memoria.py` exporta exclusivamente las tablas Oracle `am_*` a archivos JSONL y genera un manifiesto con conteos y SHA-256. Rechaza cualquier conexión que no utilice Oracle y exige un directorio de destino inexistente.

Ejemplo, desde `backend`:

```powershell
.\venv\Scripts\python.exe respaldo_ayuda_memoria.py --output D:\tmp\respaldo-am-20260911
```

El respaldo puede contener información reservada. Debe guardarse en almacenamiento institucional cifrado, con acceso restringido y periodo de conservación definido. No debe incorporarse a Git ni enviarse por correo.

## Brechas que no se corrigen en la Entrega 0

- Autenticación y autorización incompletas.
- Publicación mutable y sin versionado.
- JSON y estados sin validación estricta.
- Correlativo susceptible a concurrencia.
- Renderizado incompleto de gráficos y conclusiones.
- Importación Excel sin validación de servidor.
- Datos demostrativos dentro de semillas.

Estas brechas se atenderán en las entregas posteriores del plan.
