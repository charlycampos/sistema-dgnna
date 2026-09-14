# Plan incremental de mejoras — Módulo Ayuda Memoria

**Proyecto:** Sistema DGNNA — MIMP Perú  
**Fecha de elaboración:** 11 de septiembre de 2026  
**Estado:** Propuesta para aprobación  
**Modalidad:** Implementación gradual, una entrega verificable por vez

## 1. Objetivo

Evolucionar el módulo de Ayuda Memoria hacia un sistema institucional seguro, dinámico y trazable que permita diseñar plantillas, elaborar documentos, revisarlos, publicarlos y exportarlos sin perder compatibilidad con los registros existentes.

La implementación no se realizará en un único cambio. Cada fase tendrá un alcance cerrado, pruebas y un punto de aprobación antes de continuar.

## 2. Estrategia de modelos para controlar tokens

### Recomendación principal

Usar el modelo económico o `Mini` disponible en Codex para cambios pequeños y bien delimitados. Reservar el modelo de programación más potente disponible para migraciones de base de datos, seguridad, concurrencia, versionado documental y diagnóstico de errores difíciles.

En la documentación vigente de OpenAI, la familia `Luna` está orientada al ahorro, `Terra` al equilibrio entre capacidad y costo y `Astra` al trabajo de máxima complejidad. Los nombres visibles pueden variar según la versión y disponibilidad de Codex. Si esos nombres no aparecen en el selector, se debe aplicar la misma regla: **Mini/económico para tareas simples, equilibrado para la mayoría del desarrollo y avanzado solo para decisiones críticas**.

| Tipo de trabajo | Modelo recomendado | Razonamiento | Uso esperado |
|---|---|---|---|
| Cambios de textos, estilos, botones y campos | Modelo Mini/económico | Bajo | Una tarea puntual por conversación |
| Componentes React, formularios y endpoints CRUD acotados | Modelo equilibrado | Medio | Modelo habitual del proyecto |
| Seguridad, permisos, migraciones y concurrencia | Modelo avanzado de programación | Alto | Solo durante la tarea crítica |
| Arquitectura, versionado y renderizado DOCX/PDF | Modelo avanzado de programación | Alto | Diseño e implementación inicial |
| Pruebas, correcciones de tipos y documentación | Modelo Mini/equilibrado | Bajo o medio | Después de cada entrega |

### Regla práctica sugerida

1. Empezar cada tarea con el modelo Mini/económico.
2. Entregarle un solo objetivo y pocos archivos relacionados.
3. Escalar al modelo equilibrado si la tarea modifica frontend y backend juntos.
4. Usar el modelo avanzado únicamente cuando exista una decisión de arquitectura, seguridad, base de datos o un error que el modelo económico no resuelva.
5. Volver al modelo económico para documentación, pruebas repetitivas y ajustes visuales.

### Cómo reducir consumo de tokens

- Abrir una tarea nueva por entrega y no solicitar todo el plan en una sola conversación.
- Indicar los archivos exactos que se pueden modificar.
- Pedir primero inspección breve y después implementación; no repetir auditorías completas.
- Evitar adjuntar logs completos. Compartir únicamente el error y unas líneas de contexto.
- Solicitar respuestas compactas: archivos cambiados, pruebas y riesgos pendientes.
- No volver a enviar el contenido completo del repositorio ni este plan; basta con referenciar el archivo.
- Mantener `AGENTS.md` como fuente permanente de reglas del proyecto.
- Ejecutar pruebas focalizadas durante el desarrollo y `npx tsc --noEmit` al cerrar la entrega.
- No usar varios agentes salvo que existan subtareas realmente independientes.
- Hacer un commit por entrega aprobada para poder continuar desde un estado limpio.

### Prompt base económico

```text
Implementa únicamente la Entrega X de PLAN_MEJORAS_AYUDA_MEMORIA.md.
No avances a otras fases ni refactorices archivos ajenos al alcance.
Primero inspecciona los archivos involucrados; luego implementa el cambio mínimo compatible.
Conserva los datos existentes y sigue AGENTS.md.
Al finalizar ejecuta las pruebas focalizadas y npx tsc --noEmit.
Responde solo con: resultado, archivos modificados, pruebas y riesgos pendientes.
```

## 3. Principios de implementación

- Mantener compatibilidad con documentos y plantillas actuales.
- No realizar cambios estructurales de base de datos sin migración reversible.
- Separar definición de plantilla, datos capturados y presentación documental.
- No almacenar datos demostrativos como si fueran información oficial.
- Un documento publicado debe ser inmutable.
- Toda operación sensible debe requerir autorización y dejar auditoría.
- Cada entrega debe terminar funcionando por sí sola.
- No continuar con la siguiente entrega hasta aprobar la anterior.

## 4. Hoja de ruta

### Entrega 0 — Línea base y respaldo técnico (Completada)

- Documentar endpoints, modelos, estados y tipos de sección existentes.
- Identificar las tablas reales en SQLite y Oracle.
- Restringir SQLite a testing y asegurar esquema `AYUDA_MEMORIA_DB`.
- Criterio de cierre: Verificado y 100% microservicios.

---

### Entrega 1 — Seguridad y autorización (Completada)

**Objetivo:** impedir accesos y modificaciones no autorizadas.

**Trabajo:**

- Exigir autenticación en todos los endpoints de Ayuda Memoria.
- Proteger el endpoint de inicialización de plantillas para uso administrativo o interno.
- Definir permisos para consultar, crear, editar, revisar, publicar y exportar.
- Restringir documentos por dirección, rol y nivel de sensibilidad.
- Evitar que un usuario marque una plantilla como oficial sin autorización.
- Auditar accesos y mutaciones relevantes.

**Pruebas mínimas:**

- Respuestas `401` sin autenticación.
- Respuestas `403` para roles o direcciones no autorizadas.
- Acceso válido para el responsable correspondiente.
- Protección especial de casos sensibles.

**Criterio de cierre:** matriz de permisos aprobada y pruebas de autorización en verde.

**Modelo sugerido:** modelo avanzado de programación, razonamiento alto.

---

### Entrega 2 — Integridad y validación de datos

**Objetivo:** evitar estados inválidos, duplicados y relaciones incorrectas.

**Trabajo:**

- Convertir estado, ámbito, riesgo, dirección y tipo de sección en enumeraciones validadas.
- Validar títulos, fechas, tamaños máximos y JSON recibido.
- Comprobar que cada sección pertenezca a la plantilla del documento.
- Agregar unicidad para la combinación documento-sección.
- Reemplazar el correlativo basado en `count() + 1` por un mecanismo transaccional.
- Incorporar control de concurrencia mediante revisión o `ETag`.
- Estandarizar fechas y zona horaria de Lima.

**Pruebas mínimas:**

- Rechazo de estado o sección inválidos.
- Doble guardado concurrente sin pérdida silenciosa.
- Creación concurrente con códigos únicos.
- Límites de contenido y JSON malformado.

**Criterio de cierre:** migración aplicada, datos existentes compatibles y pruebas de integridad en verde.

**Modelo sugerido:** modelo avanzado de programación, razonamiento alto.

---

### Entrega 3 — Limpieza y compatibilidad de plantillas actuales

**Objetivo:** eliminar riesgos antes de crear el motor nuevo.

**Trabajo:**

- Separar el esquema de columnas de las filas de datos.
- Retirar cifras, personas y teléfonos demostrativos de las semillas productivas.
- Mantener ejemplos únicamente como ayudas visuales inequívocas.
- Corregir caracteres con codificación defectuosa.
- Implementar correctamente `CONCLUSIONES`.
- Implementar o desactivar temporalmente `GRAFICO` hasta completar su renderizador.
- Crear un adaptador de la definición actual hacia el futuro formato v2.

**Criterio de cierre:** las cuatro plantillas oficiales crean documentos vacíos, coherentes y editables.

**Modelo sugerido:** modelo equilibrado, razonamiento medio.

---

### Entrega 4 — Catálogo y versionado de plantillas

**Objetivo:** administrar profesionalmente el ciclo de vida de las plantillas.

**Trabajo:**

- Agregar versión, estado, vigencia, propietario y responsable funcional.
- Implementar los estados `BORRADOR`, `EN_REVISION`, `VIGENTE` y `RETIRADA`.
- Incorporar edición, duplicación, previsualización y retiro.
- Impedir modificar directamente una versión vigente utilizada por documentos.
- Permitir crear una nueva versión desde una plantilla vigente.
- Congelar la versión exacta al crear un documento.

**Interfaz:**

- Catálogo mediante tarjetas buscables y filtrables.
- Badges para versión, vigencia, ámbito y dirección.
- Acciones visibles según permisos.

**Criterio de cierre:** una plantilla puede diseñarse, aprobarse, versionarse y utilizarse sin alterar documentos anteriores.

**Modelo sugerido:** modelo avanzado para el diseño inicial y equilibrado para la interfaz.

---

### Entrega 5 — Diseñador visual v2

**Objetivo:** permitir que un administrador funcional construya formatos sin editar código.

**Trabajo:**

- Crear un asistente de tres pasos: datos generales, bloques y vista previa.
- Permitir reordenar bloques conservando identificadores estables.
- Configurar título, ayuda, obligatoriedad, responsable y fuente.
- Añadir bloques: texto enriquecido, KPI, tabla, gráfico, cronología, acuerdos, conclusiones y anexos.
- Añadir columnas tipadas y reglas de validación.
- Añadir condiciones de visibilidad.
- Validar la definición antes de guardarla.

**Criterio de cierre:** se puede construir y previsualizar una plantilla completa sin manipular JSON manualmente.

**Modelo sugerido:** modelo equilibrado, razonamiento medio; avanzado solo para el esquema del motor.

---

### Entrega 6 — Editor dinámico del documento

**Objetivo:** agilizar el trabajo de especialistas y reducir errores.

**Trabajo:**

- Editor a pantalla completa con índice navegable.
- Secciones plegables y botón para ir al siguiente pendiente.
- Barra porcentual de completitud.
- Estados visuales `COMPLETO`, `PENDIENTE`, `OBSERVADO` y `NO_APLICA`.
- Autoguardado con indicador de estado.
- Advertencia al salir con cambios pendientes.
- Comentarios por sección.
- Vista previa A4 lado a lado.
- Accesibilidad de diálogos, teclado, foco y botones.

**Criterio de cierre:** un usuario puede completar el documento, identificar pendientes y recuperar su trabajo sin pérdida de información.

**Modelo sugerido:** modelo equilibrado; Mini para ajustes visuales posteriores.

---

### Entrega 7 — Tablas e importación Excel

**Objetivo:** importar información con control y trazabilidad.

**Trabajo:**

- Mantener el esquema de columnas aunque la tabla esté vacía.
- Incorporar tipos, campos obligatorios, formatos y totales.
- Validar extensión, MIME, tamaño, hojas, filas y columnas.
- Mostrar previsualización y mapeo de encabezados.
- Reportar errores por fila antes de confirmar.
- Repetir la validación en backend.
- Añadir confirmación y opción de deshacer eliminaciones.

**Criterio de cierre:** archivos válidos se importan de manera predecible y archivos incompatibles no alteran el documento.

**Modelo sugerido:** modelo equilibrado, razonamiento medio.

---

### Entrega 8 — Revisión, aprobación y publicación inmutable

**Objetivo:** formalizar el ciclo documental institucional.

**Flujo:**

```text
BORRADOR -> EN_REVISION -> OBSERVADO -> EN_REVISION -> APROBADO -> PUBLICADO -> HISTORICO
```

**Trabajo:**

- Separar roles de elaborador, revisor y publicador.
- Validar campos obligatorios antes de enviar a revisión.
- Registrar observaciones y su levantamiento.
- Generar snapshot, versión, fecha, aprobador y publicador.
- Calcular hash SHA-256 del documento publicado.
- Bloquear toda edición de una publicación.
- Generar una nueva versión para realizar correcciones.
- Incorporar comparación de versiones.

**Criterio de cierre:** una versión publicada no puede alterarse y su origen puede demostrarse mediante auditoría y hash.

**Modelo sugerido:** modelo avanzado de programación, razonamiento alto.

---

### Entrega 9 — Motor institucional DOCX, PDF y vista previa

**Objetivo:** producir documentos listos para Alta Dirección.

**Trabajo:**

- Separar el renderizador del router HTTP.
- Crear un paquete de estilos institucional versionado.
- Incorporar portada, logo, encabezado, pie, numeración y clasificación.
- Renderizar todos los tipos de bloque, incluidos gráficos y anexos.
- Ajustar tablas anchas y orientación por sección.
- Añadir código, versión, fecha de corte y fuentes.
- Generar DOCX y PDF desde la misma definición.
- Bloquear la exportación oficial cuando existan errores críticos.
- Añadir pruebas estructurales y visuales de documentos generados.

**Criterio de cierre:** la vista previa, el DOCX y el PDF representan el mismo contenido validado.

**Modelo sugerido:** modelo avanzado para el motor; equilibrado para estilos y pruebas.

---

### Entrega 10 — Automatización y fuentes de datos

**Objetivo:** reducir transcripción manual y cifras vencidas.

**Trabajo:**

- Definir conectores internos por bloque.
- Registrar fuente, fecha de corte, responsable y última actualización.
- Actualizar cifras desde otros módulos DGNNA.
- Alertar información desactualizada.
- Comparar con periodos anteriores.
- Reutilizar bloques y documentos previos.
- Conservar el valor congelado utilizado en cada publicación.

**Criterio de cierre:** las cifras automáticas conservan procedencia y no cambian publicaciones históricas.

**Modelo sugerido:** equilibrado; avanzado para integraciones complejas.

## 5. Validación obligatoria por entrega

Antes de considerar terminada cualquier entrega se deberá comprobar:

- `npx tsc --noEmit` con cero errores.
- Pruebas focalizadas del backend.
- Respuesta HTTP esperada de los endpoints modificados.
- Flujo funcional principal y caso de error.
- Ausencia de errores en consola y advertencias de React.
- Revisión de permisos y datos sensibles.
- Verificación visual cuando cambie la interfaz.
- Migración y compatibilidad cuando cambie la base de datos.

## 6. Orden recomendado de ejecución

| Prioridad | Entregas | Razón |
|---|---|---|
| Inmediata | 0, 1 y 2 | Seguridad, respaldo e integridad |
| Alta | 3, 4 y 5 | Base profesional de plantillas |
| Media | 6 y 7 | Productividad y calidad de captura |
| Alta institucional | 8 y 9 | Aprobación, inmutabilidad y documentos oficiales |
| Evolutiva | 10 | Automatización y conexión con otros módulos |

## 7. Primera tarea propuesta

La primera intervención debe limitarse a la **Entrega 0 — Línea base y respaldo técnico**. No modificará todavía la estructura funcional ni la base de datos. Su resultado permitirá ejecutar la seguridad y las migraciones posteriores con menor riesgo.

Después de revisar y aprobar la Entrega 0, se continuará únicamente con la Entrega 1.

