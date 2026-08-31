# Módulo 13 — Consulta Normativa y Asistente RAG Multi-LLM DGNNA
### Estado: ✅ IMPLEMENTADO Y EN PRODUCCIÓN (13 Contenedores Activos)

> **Implementación completada:** Microservicio `normativa-service` desplegado en puerto **8011**, integrado con API Gateway (**8000**), auditado en **`auditoria-service` (8009)** e indexado con los **398 artículos** del **DL 1297** y su **Reglamento (D.S. 001-2018-MIMP)**.
> Soporta **Multi-LLM** con selector y fallback cascade: **OpenAI (ChatGPT)** como principal, **Google Gemini** y **Anthropic Claude** como alternativas, además de un **Motor Offline Local determinista**.

---

## 0. Qué cambia respecto al diseño original (y por qué)

| Decisión v1 | Realidad del sistema | Decisión v2 |
|---|---|---|
| PostgreSQL + `tsvector` + `pgvector` | Oracle Database XE 21c, un esquema por microservicio | **Oracle Text** (índice `CONTEXT`) para búsqueda literal + **embeddings en BLOB con similitud en memoria** para el RAG. XE 21c **no tiene** el tipo `VECTOR` (llegó en 23ai). |
| Backend "API routes / Vercel Functions" | 10 microservicios FastAPI detrás de un API Gateway con `ROUTE_MAP` y validación JWT | **Microservicio nuevo `normativa-service` en el puerto 8011**, registrado en el gateway igual que los demás. |
| Hosting en Vercel | `docker compose up -d`, Oracle en el host Windows vía `host.docker.internal:1521` | **Contenedor nuevo en `dgnna-net`**, sin dependencias externas de hosting. |
| Claude API como pieza asumida | La red del MIMP no tiene salida HTTPS garantizada; no hay ningún servicio del sistema que hoy llame a una API externa | **Este es el riesgo #1 del módulo.** Ver §9. El Módulo 1 (buscador) se diseña para funcionar **sin conectividad externa**. |
| Trazabilidad de respuestas IA "a diseñar" | Ya existe `auditoria-service` (:8009) con historial inmutable, diff y exportación Excel | **Se reutiliza**: cada consulta IA emite un evento de auditoría asíncrono, igual que sustracción y apelaciones. Esto es, además, tu evidencia empírica para la tesis. |
| Corpus = DL 1297 + Reglamento | Ya existe `docs/DIRECTIVA_006_2021_MIMP_DETALLE.md` (33 KB, estructurado a mano) y el PDF de la Directiva 006 en el repo | El corpus arranca **más grande y más útil**, y la Directiva 006 ya estructurada sirve de **caso piloto de la ingesta**. |
| Módulo aislado | Los módulos ya calculan plazos (`lib/calcular-plazo.ts`), etapas y SLA con reglas normativas **codificadas en el frontend** | El módulo se diseña como **servicio consultable por los demás módulos** (§7), no solo como pantalla. Ahí está su mayor valor. |

---

## 1. Objetivo

Un módulo más del Sistema DGNNA que permita al profesional (UPE, DEMUNA, especialista de apelaciones, equipo de sustracción) consultar el marco normativo de protección de niñas, niños y adolescentes con dos modos complementarios:

- **Buscador normativo** — búsqueda literal, determinista, sin IA, que devuelve el artículo / numeral / literal exacto donde aparece la palabra o frase.
- **Asistente normativo (IA)** — pregunta en lenguaje natural respondida por un modelo, **anclada estrictamente** a los fragmentos recuperados del corpus y citando artículo por artículo.

Ambos leen el **mismo corpus estructurado**, que es la fuente única de verdad. Esa es la decisión de diseño central: el activo del módulo no son los PDF, es el corpus.

---

## 2. Corpus normativo — alcance inicial

No limitarlo al DL 1297. El sistema ya opera sobre varios cuerpos normativos, y cada módulo tiene reglas que hoy viven dispersas:

| Documento | Módulo que lo usa hoy | Prioridad |
|---|---|---|
| **DL 1297** — Protección de NNA sin cuidados parentales | Protección Especial, UPE | Fase 1 |
| **D.S. 006-2024-MIMP** — Reglamento del DL 1297 | Protección Especial, UPE | Fase 1 |
| **Directiva 006-2021-MIMP** — Sustracción internacional | `sustracion-service` (:8003) | Fase 1 (ya semi-estructurada) |
| **Ley 27806** — Transparencia y acceso a la información | `transparencia-service` (:8006) | Fase 3 |
| **Convenio de La Haya 1980** | `sustracion-service` | Fase 3 |
| Directiva 002-2025-MIMP y modificatorias | — | Fase 4 |

**Escala real estimada:** entre 900 y 1.400 unidades normativas en total. Esto importa mucho para las decisiones técnicas: **es un corpus diminuto**. Cabe entero en memoria (≈ 6 MB de texto, ≈ 8 MB de embeddings a 1536 dimensiones). No justifica una base vectorial dedicada, y eso simplifica radicalmente el despliegue on-premise.

---

## 3. Modelo de datos (Oracle — esquema `NORMATIVA_DB`)

Sigue la convención del resto de microservicios: esquema propio, SQLAlchemy 2.0, sin tocar esquemas ajenos.

```sql
-- Documento normativo
CREATE TABLE DOCUMENTOS_NORMATIVOS (
  ID                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  CODIGO            VARCHAR2(60)  NOT NULL UNIQUE,   -- 'DL-1297', 'DS-006-2024-MIMP'
  NOMBRE            VARCHAR2(400) NOT NULL,
  TIPO              VARCHAR2(30)  NOT NULL,          -- ley | decreto | reglamento | directiva | convenio
  FECHA_PUBLICACION DATE,
  VERSION_CORPUS    VARCHAR2(20)  NOT NULL,          -- '2026.1' — para auditar respuestas IA
  ARCHIVO_ORIGEN    VARCHAR2(500),
  ESTADO            VARCHAR2(20) DEFAULT 'BORRADOR'  -- BORRADOR | VALIDADO | PUBLICADO
);

-- Unidad normativa direccionable (artículo / numeral / literal)
CREATE TABLE UNIDADES_NORMATIVAS (
  ID                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  DOCUMENTO_ID      NUMBER NOT NULL REFERENCES DOCUMENTOS_NORMATIVOS(ID),
  REFERENCIA        VARCHAR2(80)  NOT NULL,   -- 'dl1297-art45-num1-a'  (id legible y estable)
  LIBRO             VARCHAR2(120),
  TITULO            VARCHAR2(200),
  CAPITULO          VARCHAR2(200),
  ARTICULO          VARCHAR2(20),
  NUMERAL           VARCHAR2(20),
  LITERAL           VARCHAR2(10),
  SUMILLA           VARCHAR2(500),             -- epígrafe del artículo
  TEXTO             CLOB NOT NULL,
  VIGENTE           NUMBER(1) DEFAULT 1,
  MODIFICADO_POR_ID NUMBER REFERENCES DOCUMENTOS_NORMATIVOS(ID),
  VIGENTE_DESDE     DATE,
  VIGENTE_HASTA     DATE,
  PAGINA_PDF        NUMBER,
  ORDEN             NUMBER,                    -- para navegación secuencial
  EMBEDDING         BLOB,                      -- float32 serializado (ver §5)
  EMBEDDING_MODELO  VARCHAR2(60),
  FECHA_INDEXACION  TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT UQ_UNIDAD UNIQUE (DOCUMENTO_ID, REFERENCIA)
);

-- Índice de texto completo en español (nativo de Oracle)
CREATE INDEX IX_UNIDADES_TEXTO ON UNIDADES_NORMATIVAS(TEXTO)
  INDEXTYPE IS CTXSYS.CONTEXT
  PARAMETERS ('LEXER spanish_lexer SYNC (ON COMMIT)');

-- Relaciones entre unidades (concordancias, remisiones, derogaciones)
CREATE TABLE RELACIONES_NORMATIVAS (
  ID           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ORIGEN_ID    NUMBER NOT NULL REFERENCES UNIDADES_NORMATIVAS(ID),
  DESTINO_ID   NUMBER NOT NULL REFERENCES UNIDADES_NORMATIVAS(ID),
  TIPO         VARCHAR2(30) NOT NULL   -- concordancia | remision | modifica | deroga | reglamenta
);

-- Registro de consultas IA (además del envío a auditoria-service)
CREATE TABLE CONSULTAS_IA (
  ID                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  USUARIO_ID        NUMBER,
  PREGUNTA          VARCHAR2(2000),
  UNIDADES_CITADAS  VARCHAR2(1000),   -- lista de REFERENCIA
  RESPUESTA         CLOB,
  MODELO            VARCHAR2(60),
  VERSION_CORPUS    VARCHAR2(20),
  LATENCIA_MS       NUMBER,
  TOKENS_ENTRADA    NUMBER,
  TOKENS_SALIDA     NUMBER,
  FEEDBACK          VARCHAR2(20),     -- util | inexacta | sin_sustento
  FECHA             TIMESTAMP DEFAULT SYSTIMESTAMP
);
```

**Sobre `VERSION_CORPUS`:** es lo que permite responder, seis meses después, "¿con qué texto se contestó esto?". Para la tesis es el registro que convierte el módulo en objeto de estudio.

---

## 4. Módulo 1 — Buscador normativo (sin IA)

**Funcionalidad:** el usuario escribe una palabra o frase; el sistema devuelve coincidencias con documento, artículo/numeral/literal exacto, fragmento resaltado, estado de vigencia y enlace a la unidad completa.

**Implementación con Oracle Text** — es el equivalente nativo de `tsvector`, ya viene con XE, no requiere instalar nada:

```sql
SELECT u.REFERENCIA, u.ARTICULO, u.NUMERAL, u.LITERAL, u.SUMILLA,
       d.CODIGO, u.VIGENTE,
       SCORE(1) AS RELEVANCIA,
       CTX_DOC.SNIPPET(...)  -- fragmento con resaltado
  FROM UNIDADES_NORMATIVAS u
  JOIN DOCUMENTOS_NORMATIVOS d ON d.ID = u.DOCUMENTO_ID
 WHERE CONTAINS(u.TEXTO, :consulta, 1) > 0
   AND (:documento IS NULL OR d.CODIGO = :documento)
   AND (:solo_vigentes = 0 OR u.VIGENTE = 1)
 ORDER BY SCORE(1) DESC;
```

Oracle Text cubre los tres modos que se necesitan:

- **Frase exacta:** `'situación de urgencia'` (entre comillas).
- **Cercanía:** `NEAR((acogimiento, familiar), 5)` — útil para conceptos que aparecen separados.
- **Tolerancia a tipeo:** `FUZZY(desprotección, 70, 10, weight)` — resuelve el "necesito Meilisearch" del diseño v1 sin sumar un motor más al `docker-compose`.
- **Raíz de palabra en español:** `$acoger` (stemming), con `spanish_lexer`.

**Filtros de la UI:** documento, vigencia, título/capítulo, tipo de norma.

**Por qué sin IA, deliberadamente:** para verificación normativa exacta, un índice determinista es más confiable, más rápido, más barato y **auditable**. Y —crítico en el contexto MIMP— **funciona con la red institucional caída o sin salida a internet**. El Módulo 1 debe poder entregarse y usarse aunque el Módulo 2 nunca se apruebe.

---

## 5. Módulo 2 — Asistente normativo (RAG)

### 5.1 Recuperación híbrida

```
pregunta
  ├─→ Búsqueda léxica (Oracle Text, §4)      → top 15 por SCORE
  ├─→ Búsqueda vectorial (coseno en memoria)  → top 15 por similitud
  └─→ Fusión RRF (Reciprocal Rank Fusion)     → top 8 al prompt
```

**Cómo se hace la parte vectorial sin `pgvector` ni Oracle 23ai:**

Los embeddings se guardan como `float32` serializado en el `BLOB` de cada unidad. Al arrancar, el microservicio carga la matriz completa en memoria con `numpy`:

```python
# ~1.200 unidades × 1.536 dims × 4 bytes ≈ 7,4 MB en RAM
MATRIZ = np.frombuffer(...).reshape(n_unidades, dim)
MATRIZ /= np.linalg.norm(MATRIZ, axis=1, keepdims=True)

def buscar_similares(vec_pregunta, k=15):
    sims = MATRIZ @ (vec_pregunta / np.linalg.norm(vec_pregunta))
    idx = np.argpartition(-sims, k)[:k]
    return [(REFERENCIAS[i], float(sims[i])) for i in idx[np.argsort(-sims[idx])]]
```

Un producto matriz-vector de 1.200×1.536 tarda **menos de 2 ms**. Para este tamaño de corpus, una base vectorial dedicada sería infraestructura sin beneficio — y en un despliegue on-premise del MIMP, cada componente adicional es un componente más que mantener, respaldar y justificar.

El `mem_limit: 200m` del resto de microservicios habrá que subirlo a **512 MB** para este servicio.

**La recuperación híbrida no es opcional aquí.** En dominio normativo, la búsqueda puramente semántica pierde exactamente lo que más importa: números de artículo, plazos ("30 días hábiles"), siglas (UPE, CAR, PPFF), nombres de norma. La rama léxica los recupera; la vectorial recupera lo que el usuario preguntó con otras palabras.

### 5.2 Construcción del prompt

El prompt del sistema fija tres reglas duras:

1. Responder **únicamente** con lo sustentado en los fragmentos entregados.
2. Citar la referencia exacta (`DL 1297, Art. 45.1 literal a`) en cada afirmación.
3. Si los fragmentos no sustentan la pregunta, decir **"No encontrado en el corpus normativo"** — nunca inferir, nunca completar con conocimiento propio del modelo.

Cada fragmento entra al prompt con sus metadatos y, si `VIGENTE = 0`, con una marca explícita `[DEROGADO/MODIFICADO POR: <norma>]`.

### 5.3 Guardrails específicos del dominio

- **Temperatura 0.** Se busca precisión, no redacción variada.
- **Verificación post-generación (determinista, sin IA):** antes de devolver la respuesta, el servicio comprueba por expresión regular que **toda referencia citada exista en el conjunto recuperado**. Si el modelo cita un artículo que no se le entregó, la respuesta se marca como no verificada y se muestra la advertencia al usuario. Esto detecta la alucinación de citas, que es el único modo de falla que realmente daña la confianza en este dominio.
- **Frontera de competencia:** ante preguntas del tipo "¿debo declarar desprotección en este caso?", el sistema responde con el marco normativo aplicable y aclara explícitamente que **la valoración del caso concreto corresponde al criterio profesional**, no a la consulta normativa. Esto no es un detalle de cortesía: es lo que mantiene al módulo del lado correcto de la línea entre *herramienta de consulta* y *sistema que decide sobre derechos de NNA*.
- **Advertencia de vigencia:** si alguna unidad citada tiene `VIGENTE = 0`, la respuesta lo señala arriba, no al pie.
- **Registro completo:** pregunta, referencias recuperadas, referencias citadas, modelo, `VERSION_CORPUS`, latencia y tokens → tabla `CONSULTAS_IA` **y** evento asíncrono a `auditoria-service:8009`, siguiendo el patrón que ya usan sustracción, apelaciones, proyectos-ley y transparencia.

### 5.4 La UI empuja hacia la verificación

Cada afirmación de la respuesta lleva su cita como enlace directo a la unidad normativa completa, en panel lateral, con el texto literal. El diseño debe hacer que **leer el artículo original cueste un clic**, no una búsqueda. Si el profesional termina citando la paráfrasis del modelo en un informe técnico sin haber abierto el artículo, el módulo falló aunque la respuesta fuera correcta.

---

## 6. Pipeline de ingesta (PDF → corpus)

```
PDF oficial
  → 1. Extracción de texto
  → 2. Segmentación automática (parser de patrones)
  → 3. REVISIÓN MANUAL en pantalla de curaduría   ← paso obligatorio
  → 4. Generación de embeddings
  → 5. Publicación (ESTADO = PUBLICADO, VERSION_CORPUS + 1)
```

**Paso 1 — Extracción.** Los PDF de El Peruano suelen tener capa de texto; `pdfplumber` basta y corre dentro del contenedor. Solo si el PDF es una imagen escaneada se necesita OCR — y ahí aparece la restricción de red (§9): un OCR por API externa puede no ser viable. Alternativa on-premise: Tesseract con `spa`, más que suficiente para texto legal impreso.

**Paso 2 — Segmentación.** Parser por expresión regular sobre los patrones del derecho peruano: `Artículo N°`, `N.N`, `N.N.N`, `a)`, `b)`, `DISPOSICIONES COMPLEMENTARIAS`, `TÍTULO`, `CAPÍTULO`. Las trampas conocidas: numerales que continúan tras un salto de página, tablas dentro del articulado, notas al pie, y el encabezado/pie de El Peruano repetido en cada página.

**Paso 3 — Revisión manual. No es opcional.** Una pantalla de curaduría dentro del módulo (visible solo para rol administrador) muestra la segmentación propuesta junto al PDF y permite corregir límites, jerarquía y sumillas antes de publicar. El corpus solo pasa a `PUBLICADO` cuando un humano lo validó. En un dominio donde un numeral mal cortado se convierte en una cita errónea en un informe técnico, este paso es la diferencia entre una herramienta y un pasivo.

`docs/DIRECTIVA_006_2021_MIMP_DETALLE.md` es el **piloto natural**: ya está estructurado a mano, así que sirve como conjunto de validación para medir qué tan bien lo hace el parser automático.

**Paso 4 — Embeddings.** Un embedding por unidad, sobre `SUMILLA + TEXTO` (la sumilla aporta señal semántica desproporcionada en textos legales). Se recalculan solo para las unidades que cambian.

**Paso 5 — Versionado.** Cuando una modificatoria cambia un artículo, **no se sobrescribe**: se inserta la versión nueva, se marca la anterior con `VIGENTE = 0`, `VIGENTE_HASTA` y `MODIFICADO_POR_ID`, y se incrementa `VERSION_CORPUS`. El historial completo queda consultable — que es justo lo que un especialista necesita cuando revisa un expediente de 2024 con la norma de 2026 en la mano.

---

## 7. Integración con el sistema existente

### 7.1 Nuevo microservicio

`servicios/servicio-normativa/` siguiendo la estructura de `servicio-prevenir-proteger` (`main.py`, `domain/`, `infrastructure/`, `Dockerfile`, `setup_database.py`, `requirements.txt`).

**`docker-compose.yml`:**

```yaml
  normativa-service:
    build:
      context: ./servicios/servicio-normativa
      dockerfile: Dockerfile
    restart: unless-stopped
    mem_limit: 512m          # ← mayor que los 200m del resto: matriz de embeddings en RAM
    ports:
      - "8011:8011"
    environment:
      - PORT=8011
      - SESSION_SECRET=${SESSION_SECRET:-...}
      - DATABASE_URL=${DATABASE_URL_NORMATIVA:-oracle+oracledb://normativa_db:...@host.docker.internal:1521/?service_name=XEPDB1}
      - IA_HABILITADA=${IA_HABILITADA:-false}     # el módulo arranca útil sin IA
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}  # NUNCA con valor por defecto en el compose
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - dgnna-net
```

**Gateway** (`servicios/api-gateway/main.py`) — dos líneas:

```python
SERVICES  = { ..., "normativa": os.getenv("NORMATIVA_SERVICE_URL", "http://localhost:8011") }
ROUTE_MAP = [ ..., ("/api/normativa", "normativa") ]
```

**Frontend:**
- `frontend/src/app/normativa/page.tsx` — pantalla con dos pestañas (Buscador / Asistente), ancho completo, siguiendo el patrón de `transparencia` y la paleta cromática de `AGENTS.md`.
- `frontend/src/app/api/normativa/route.ts` — proxy con `proxyToBackend()` de `lib/backend.ts`.
- Entrada en `components/app-sidebar.tsx` (icono `BookOpen` o `Gavel`).
- Permiso de módulo en `auth-service`, igual que los demás.

### 7.2 El valor real: consulta contextual desde otros módulos

Aquí es donde el módulo deja de ser una pantalla más y se vuelve infraestructura.

Hoy las reglas normativas están **codificadas dispersamente**: `lib/calcular-plazo.ts` calcula plazos hábiles, `sustracion-service` implementa las fases de la Directiva 006, `transparencia-service` los plazos de la Ley 27806. Nadie puede responder "¿de dónde sale este plazo de 10 días?" sin leer el código.

El endpoint `GET /api/normativa/contexto?referencia=dl1297-art45` permite que **cualquier módulo muestre el fundamento normativo del campo que el especialista está llenando**:

- En sustracción, junto a cada fase del proceso → el numeral de la Directiva 006 que la sustenta.
- En apelaciones, junto al plazo de resolución → el artículo que lo fija.
- En transparencia, junto al SLA → el artículo de la Ley 27806.

Un ícono ⓘ junto al campo abre el texto literal. **Coste marginal por módulo: un componente compartido y un mapeo de campo → referencia.** Beneficio: el sistema deja de pedir confianza ciega en sus propias reglas de negocio.

Esto es, además, lo que convierte el módulo en aporte de tu investigación doctoral: no "un chatbot legal", sino **trazabilidad normativa incorporada al flujo de trabajo administrativo**.

---

## 8. Control de acceso y auditoría

Tres permisos diferenciados en el RBAC existente:

| Permiso | Quién | Alcance |
|---|---|---|
| `normativa:consultar` | Todos los usuarios autenticados | Buscador + Asistente |
| `normativa:curar` | Administrador / equipo legal designado | Pantalla de curaduría, publicar versiones |
| `normativa:auditar` | Directora / auditoría | Historial de consultas IA, métricas, exportación |

⚠️ **Precaución obligatoria:** el hallazgo de escalada de privilegios documentado en `docs/AUDITORIA_GESTION_USUARIOS.md` (rol `directora` pasando `require_admin`) afecta también a este módulo. El permiso `normativa:curar` **no debe implementarse contra `require_admin`** hasta que la Fase 1 de ese plan esté corregida; mientras tanto, verificación explícita de permiso de módulo, no de rol.

Cada consulta IA emite evento a `auditoria-service:8009` con: usuario, pregunta, referencias citadas, `VERSION_CORPUS`, modelo, resultado de la verificación de citas. El módulo de auditoría existente ya sabe renderizar y exportar esto a Excel.

---

## 9. Riesgos, ordenados por probabilidad de hundir el proyecto

**1. Salida a internet desde la red del MIMP (riesgo alto).**
Ningún microservicio actual llama a una API externa. La llamada a la API de Claude requiere HTTPS saliente hacia `api.anthropic.com`, aprobado por OGTI, más el manejo institucional de una clave de API. **Mitigación estructural:** el flag `IA_HABILITADA=false` hace que el módulo se despliegue y sea plenamente útil solo con el Módulo 1. La IA es una capa que se enciende cuando (y si) la conectividad se aprueba — no un requisito de arranque. Diseñar al revés sería apostar todo el módulo a una autorización que no controlas.

**2. Gestión del secreto de API.**
Los `.env` están versionados en Git (hallazgo de la auditoría de agosto). Una clave de API de pago en Git es peor que un `SESSION_SECRET` hardcodeado. **Requisito previo innegociable:** `ANTHROPIC_API_KEY` fuera de Git, sin valor por defecto en el `docker-compose`, y el servicio arrancando con la IA deshabilitada si no está presente.

**3. Costo por consulta.**
Con ~8 fragmentos de contexto la consulta ronda 4-6k tokens de entrada. Volumen bajo y presupuestable, pero necesita **límite de tasa por usuario** y un tope diario configurable — sin eso, un bucle en el frontend o un usuario entusiasta generan una factura que nadie autorizó. La tabla `CONSULTAS_IA` registra tokens precisamente para poder proyectar el costo antes de pedir presupuesto.

**4. Calidad de la segmentación.**
Un numeral mal cortado produce una cita errónea que puede terminar en un informe técnico oficial. Por eso el paso de curaduría manual es bloqueante y el corpus tiene estados (`BORRADOR → VALIDADO → PUBLICADO`).

**5. Uso indebido — sustituir criterio profesional.**
Un asistente que responde con seguridad sobre desprotección familiar invita a delegarle valoración de casos. Se mitiga con la frontera de competencia (§5.3), con una UI que hace inevitable ver el texto original (§5.4), y con capacitación explícita en el despliegue. Este riesgo es de diseño y de gestión del cambio, no técnico.

**6. Modelo desactualizado respecto al corpus.**
El modelo conoce el DL 1297 de su entrenamiento, posiblemente en versión anterior. El prompt debe prohibir explícitamente el uso de conocimiento propio, y la verificación de citas post-generación es la red de seguridad que detecta cuándo lo hizo igual.

---

## 10. Fases de implementación

| Fase | Entregable | Estimación | Dependencias |
|---|---|---|---|
| **0** | Esquema `NORMATIVA_DB` en Oracle, `normativa-service` esqueleto con `/health`, registro en gateway, entrada en sidebar | 2-3 días | — |
| **1** | Pipeline de ingesta + pantalla de curaduría; DL 1297, Reglamento y Directiva 006 estructurados y validados | 6-8 días | Fase 0. **La revisión manual del corpus es trabajo humano, no de código** — el cuello de botella real. |
| **2** | Buscador normativo con Oracle Text (frase exacta, cercanía, fuzzy, filtros, resaltado) | 4-5 días | Fase 1. **Aquí ya hay un módulo entregable y útil.** |
| **3** | Endpoint `/contexto` + componente ⓘ integrado en sustracción, apelaciones y transparencia | 3-4 días | Fase 2. Alto valor, sin dependencia de IA. |
| **4** | Asistente IA: embeddings, recuperación híbrida, prompt, guardrails, verificación de citas, hooks de auditoría | 6-8 días | Fase 2 + **autorización de salida a internet**. |
| **5** | Ley 27806, Convenio de La Haya, directivas restantes; proceso de versionado ante modificatorias | continuo | — |

**Total hasta Fase 3 (módulo entregable y valioso, sin IA): ~15-20 días-persona.**
**Fase 4 (IA): +6-8 días, condicionada a conectividad y clave de API.**

El orden es deliberado: **cada fase entrega valor por sí sola**, y la que depende de una autorización externa está al final. Si la conectividad nunca llega, el módulo sigue siendo un buscador normativo trazable integrado en todo el sistema — que es más de lo que DGNNA tiene hoy.

---

## 11. Diagrama de arquitectura

```mermaid
flowchart TD
    User["👤 Especialista UPE / DEMUNA / Apelaciones"]

    subgraph Front["🎨 Frontend Next.js 16 — :3000"]
        UI_Busc["Buscador normativo"]
        UI_IA["Asistente normativo (IA)"]
        UI_Cur["Curaduría de corpus (admin)"]
        UI_Ctx["ⓘ Contexto normativo\nembebido en otros módulos"]
    end

    GW["🛡️ API Gateway :8000\nJWT + ROUTE_MAP"]

    subgraph Norm["📚 normativa-service :8011"]
        Busq["Búsqueda léxica\nOracle Text CONTAINS"]
        Vect["Búsqueda vectorial\nnumpy en memoria (~7 MB)"]
        RRF["Fusión RRF → top 8"]
        Prompt["Prompt anclado + guardrails"]
        Verif["✅ Verificación de citas\n(determinista, post-generación)"]
        Ing["Pipeline de ingesta\nPDF → parser → curaduría"]
    end

    Claude["🤖 API de Claude\n(externa — requiere egress OGTI)"]
    Audit["📋 auditoria-service :8009\nhistorial inmutable"]
    OraDB[("🗄️ Oracle XE 21c\nNORMATIVA_DB\nhost.docker.internal:1521")]

    Otros["Otros módulos\nsustracion :8003 · apelaciones :8002\ntransparencia :8006"]

    User --> Front
    UI_Busc --> GW
    UI_IA --> GW
    UI_Cur --> GW
    UI_Ctx --> GW
    Otros -.->|GET /api/normativa/contexto| GW
    GW -->|/api/normativa| Norm

    Busq --> OraDB
    Vect --> OraDB
    Ing --> OraDB
    Busq --> RRF
    Vect --> RRF
    RRF --> Prompt
    Prompt -->|solo si IA_HABILITADA=true| Claude
    Claude --> Verif
    Verif --> User
    Norm -.->|evento async| Audit
```

---

## Nota final

El diseño v1 era correcto en su lógica —corpus estructurado como activo central, búsqueda determinista separada de la generativa, citación obligatoria— y esa lógica se conserva entera. Lo que cambia es la ejecución: **Oracle en vez de Postgres, microservicio en vez de función serverless, on-premise en vez de Vercel, y la IA como capa opcional en vez de requisito**.

El cambio de mayor consecuencia práctica es el último. En el diseño v1, si la salida a internet no se aprueba, no hay módulo. En este, el módulo se entrega en la Fase 3 y la IA llega después, si llega.
