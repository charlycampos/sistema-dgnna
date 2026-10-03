from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE


OUTPUT = "Propuesta_Asistente_IA_Riesgo_Desproteccion_Familiar.docx"
BLUE = "1F4E78"
LIGHT_BLUE = "D9EAF7"
PALE_BLUE = "EEF5FA"
GRAY = "F2F2F2"
WHITE = "FFFFFF"
BLACK = "000000"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_borders(cell, color="D9D9D9", size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        node = borders.find(qn(tag))
        if node is None:
            node = OxmlElement(tag)
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:color"), color)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + m))
        if node is None:
            node = OxmlElement("w:" + m)
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_font(run, name="Aptos", size=None, bold=None, color=BLACK):
    run.font.name = name
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), name)
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def add_hyperlink(paragraph, text, url):
    part = paragraph.part
    rel_id = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), rel_id)
    new_run = OxmlElement("w:r")
    r_pr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), BLUE)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    r_pr.append(color)
    r_pr.append(underline)
    new_run.append(r_pr)
    text_node = OxmlElement("w:t")
    text_node.text = text
    new_run.append(text_node)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.add_run(text)
    return p


def add_number(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.7)
    p.paragraph_format.first_line_indent = Cm(-0.5)
    p.add_run(text)
    return p


def add_numbered_list(doc, items):
    for idx, item in enumerate(items, start=1):
        add_number(doc, f"{idx}.  {item}")


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    prevent_row_split(hdr)
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        set_font(r, size=9, bold=True, color=WHITE)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(cell, BLUE)
        set_cell_borders(cell)
        set_cell_margins(cell)
        if widths:
            cell.width = Cm(widths[i])
    for r_idx, row in enumerate(rows):
        new_row = table.add_row()
        prevent_row_split(new_row)
        cells = new_row.cells
        for i, value in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            run = p.add_run(str(value))
            set_font(run, size=8.5)
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_shading(cells[i], PALE_BLUE if r_idx % 2 else WHITE)
            set_cell_borders(cells[i])
            set_cell_margins(cells[i])
            if widths:
                cells[i].width = Cm(widths[i])
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


doc = Document()
section = doc.sections[0]
section.top_margin = Cm(2.2)
section.bottom_margin = Cm(2.0)
section.left_margin = Cm(2.4)
section.right_margin = Cm(2.4)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor(0, 0, 0)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12

for style_name, size, before, after in (("Title", 22, 0, 12), ("Heading 1", 15, 14, 6), ("Heading 2", 12, 10, 4)):
    st = styles[style_name]
    st.font.name = "Aptos Display" if style_name != "Normal" else "Aptos"
    st._element.rPr.rFonts.set(qn("w:ascii"), st.font.name)
    st._element.rPr.rFonts.set(qn("w:hAnsi"), st.font.name)
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = RGBColor(0, 0, 0)
    st.paragraph_format.space_before = Pt(before)
    st.paragraph_format.space_after = Pt(after)
    st.paragraph_format.keep_with_next = True

# Remove any inherited border from Word's built-in Title style.
title_ppr = styles["Title"]._element.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.add_run("Propuesta de asistente inteligente para orientar rutas de intervención ante riesgo o desprotección familiar")

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("Documento base para un trabajo universitario aplicado al Sistema DGNNA")
set_font(r, size=12, bold=True, color="404040")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Propuesta académica y funcional")
set_font(r, size=10, color="666666")

doc.add_paragraph()

doc.add_heading("Introducción", level=1)
doc.add_paragraph(
    "La atención de posibles situaciones de riesgo o desprotección familiar exige que los profesionales recopilen información de distintas fuentes, apliquen instrumentos técnicos, consulten normas vigentes y motiven una ruta de intervención. Aunque el Sistema DGNNA dispone de un módulo de consulta normativa con recuperación aumentada por generación, la búsqueda de artículos no resuelve por sí sola la necesidad de ordenar el contexto del caso ni de identificar los pasos que deben completarse antes de tomar una decisión."
)
doc.add_paragraph(
    "Este trabajo propone un asistente de inteligencia artificial que apoye el razonamiento profesional mediante preguntas guiadas, reglas normativas explícitas y recuperación de fuentes oficiales. El asistente no determina automáticamente la existencia de riesgo o desprotección ni impone una medida. Su aporte consiste en advertir urgencias, detectar información faltante, presentar posibles rutas de actuación y explicar cada orientación con base normativa verificable. La decisión final permanece bajo responsabilidad del profesional o equipo competente."
)
doc.add_paragraph(
    "El diagnóstico presentado en esta sección es preliminar y debe validarse mediante entrevistas con especialistas, observación del proceso y revisión de expedientes anonimizados. Esta precisión evita presentar como hecho institucional aquello que, en esta etapa, constituye una hipótesis de trabajo basada en el flujo normativo y funcional identificado."
)

doc.add_heading("Sección I Diagnóstico del problema y mapeo del flujo de información", level=1)
doc.add_heading("1 1 Descripción de la problemática", level=2)
doc.add_heading("Contexto de la organización y del proceso seleccionado", level=2)
doc.add_paragraph(
    "La Dirección General de Niñas, Niños y Adolescentes y los servicios vinculados a la protección especial requieren analizar comunicaciones o casos en los que podría existir amenaza o afectación de derechos. El proceso seleccionado para este estudio es la valoración preliminar y la orientación de la ruta de intervención ante una posible situación de riesgo o desprotección familiar."
)
doc.add_paragraph(
    "Para desarrollar esta tarea, el profesional debe reunir antecedentes, entrevistar a las personas involucradas, recoger la opinión de la niña, niño o adolescente, verificar el entorno familiar, revisar intervenciones previas y aplicar criterios de la Tabla de Valoración de Riesgo. Luego debe determinar si cuenta con información suficiente, si existe una alerta inmediata y qué actuaciones o medidas corresponde evaluar. El análisis combina conocimiento jurídico, social y psicológico, por lo que no puede reducirse a una búsqueda de palabras ni a una respuesta libre de un modelo de lenguaje."
)

doc.add_page_break()
doc.add_heading("Ineficiencias fricciones y cuellos de botella", level=2)
add_table(doc, ["Problema preliminar", "Efecto operativo", "Oportunidad de mejora"], [
    ("Información distribuida entre entrevistas, informes, documentos y sistemas.", "El profesional invierte tiempo en reunir y reconstruir el contexto del caso.", "Formulario guiado que consolide hechos, fuentes y pendientes."),
    ("Consulta manual de normas extensas y modificadas.", "Puede retrasarse la ubicación del artículo o instrumento aplicable.", "RAG sobre un corpus oficial, versionado y con citas exactas."),
    ("Criterios aplicados de forma poco uniforme.", "Casos semejantes pueden recibir análisis iniciales con distinto nivel de detalle.", "Reglas explícitas y listas de verificación derivadas de instrumentos oficiales."),
    ("Datos faltantes detectados tardíamente.", "Se repiten diligencias o se posterga la orientación del caso.", "Detección automática de vacíos y contradicciones antes de concluir."),
    ("Dificultad para reconstruir el razonamiento.", "La auditoría no siempre identifica con rapidez qué hechos y normas sustentaron la orientación.", "Registro de datos, reglas activadas, citas recuperadas y decisión profesional."),
    ("Riesgo de confianza excesiva en una respuesta generativa.", "Una explicación fluida puede parecer correcta aunque carezca de sustento suficiente.", "Abstención obligatoria, citas verificables y aprobación humana."),
], widths=[5.0, 5.3, 5.7])

doc.add_heading("1 2 Mapeo del flujo de información actual AS IS", level=2)
doc.add_paragraph(
    "El siguiente flujo representa una hipótesis del proceso actual que debe contrastarse con los operadores. Describe cómo la información pasa desde la comunicación inicial hasta la decisión profesional sin incorporar todavía el asistente propuesto."
)
add_table(doc, ["1 Ingreso", "2 Recopilación", "3 Valoración", "4 Consulta", "5 Decisión"], [[
    "Comunicación, denuncia, derivación o presencia física",
    "Entrevistas, documentos, visita y coordinaciones",
    "Aplicación de criterios e identificación de alertas",
    "Revisión de normas, directivas y antecedentes",
    "Informe, ruta de intervención y seguimiento",
]], widths=[3.2, 3.2, 3.2, 3.2, 3.2])

doc.add_heading("Datos y actores del flujo", level=2)
add_table(doc, ["Etapa", "Información principal", "Actores o fuentes", "Salida"], [
    ("Ingreso", "Hechos comunicados, identificación básica y posible urgencia.", "Ciudadanía, NNA, institución derivante o servicio de atención.", "Registro inicial del caso."),
    ("Recopilación", "Entrevistas, antecedentes, condiciones familiares, salud, educación y redes.", "NNA, familia, escuela, salud, policía, fiscalía u otras entidades.", "Conjunto de evidencias y actuaciones."),
    ("Valoración", "Indicadores de afectación, actitud familiar, capacidades de protección y alertas.", "Equipo profesional e instrumentos técnicos.", "Valoración preliminar y vacíos identificados."),
    ("Consulta normativa", "Artículos, anexos, competencias, plazos y alternativas aplicables.", "Corpus normativo y documentos institucionales.", "Fundamento jurídico del análisis."),
    ("Decisión y seguimiento", "Síntesis técnica, ruta seleccionada, responsables y plazos.", "Profesional o equipo competente.", "Decisión motivada y plan de actuación."),
], widths=[2.6, 5.0, 4.6, 3.8])

doc.add_heading("Puntos críticos donde la IA genera valor directo", level=2)
for item in [
    "Ingreso: detectar expresiones asociadas a signos de alerta y priorizar la revisión humana inmediata.",
    "Recopilación: formular preguntas adaptativas y señalar campos esenciales todavía no verificados.",
    "Valoración: contrastar hechos con reglas explícitas sin reemplazar el juicio interdisciplinario.",
    "Consulta normativa: recuperar artículos y anexos vigentes vinculados con los indicadores del caso.",
    "Orientación: generar varias rutas condicionadas, con sus requisitos, límites e información pendiente.",
    "Auditoría: conservar la versión de las normas, las reglas activadas y la motivación del profesional."
]:
    add_bullet(doc, item)

doc.add_heading("1 3 Objetivos de la solución basada en inteligencia artificial", level=2)
doc.add_heading("Objetivo general", level=2)
doc.add_paragraph(
    "Diseñar un asistente basado en inteligencia artificial, reglas normativas y recuperación documental que oriente al profesional en la identificación de actuaciones y rutas de intervención ante posibles situaciones de riesgo o desprotección familiar, preservando la decisión humana, la trazabilidad y el sustento normativo."
)
doc.add_heading("Objetivos específicos", level=2)
for item in [
    "Reducir el tiempo empleado en localizar normas y organizar los antecedentes relevantes del caso.",
    "Mejorar la completitud de la valoración mediante la detección temprana de información faltante o contradictoria.",
    "Uniformizar el análisis preliminar a través de reglas y listas de verificación derivadas de instrumentos oficiales.",
    "Incrementar la calidad de respuesta mediante explicaciones con citas normativas exactas y advertencias de insuficiencia.",
    "Proponer rutas de actuación condicionadas al contexto, sin convertirlas en decisiones automáticas.",
    "Facilitar la auditoría del razonamiento y la actualización escalable del corpus normativo."
]:
    add_bullet(doc, item)

doc.add_heading("Indicadores iniciales de éxito", level=2)
add_table(doc, ["Objetivo", "Indicador", "Meta académica inicial"], [
    ("Optimización", "Tiempo promedio de análisis preliminar.", "Reducción respecto del proceso de consulta convencional."),
    ("Calidad", "Afirmaciones con cita normativa correcta.", "Al menos 95 por ciento en casos de prueba controlados."),
    ("Completitud", "Omisiones relevantes detectadas.", "Mejora frente al análisis sin asistente."),
    ("Seguridad", "Respuestas concluyentes sin sustento.", "Cero decisiones automáticas y mínima tasa de orientación no respaldada."),
    ("Escalabilidad", "Tiempo requerido para incorporar o actualizar una norma.", "Proceso documentado, versionado y repetible."),
], widths=[3.0, 6.0, 7.0])

doc.add_heading("Viabilidad de un prototipo con un agente conversacional", level=2)
doc.add_paragraph(
    "Para una demostración universitaria no es indispensable construir desde el inicio un sistema institucional completo. Puede configurarse un agente conversacional con instrucciones estrictas y documentos oficiales como fuentes. El prototipo permitiría validar preguntas, formato de respuesta, rutas y casos de prueba antes de desarrollar una integración mediante API."
)
add_table(doc, ["Plataforma", "Uso posible", "Consideración"], [
    ("ChatGPT", "Configurar instrucciones y conocimiento documental en un GPT o solución equivalente del espacio de trabajo.", "La disponibilidad para crear asistentes depende del tipo de cuenta y de los cambios del producto; para integrar con el Sistema DGNNA se requeriría una API o aplicación propia."),
    ("Claude", "Crear un Proyecto con instrucciones y una base de conocimiento; cuando el volumen aumenta, Projects puede aplicar RAG.", "Es apropiado para prototipos documentales, pero la decisión y el registro institucional deben permanecer fuera del chat."),
    ("Gemini", "Crear una personalización reutilizable y adjuntar archivos de conocimiento, según las funciones disponibles en la cuenta.", "Las funciones Gems están en transición hacia Skills en algunas cuentas; se debe verificar la modalidad disponible antes de construir."),
], widths=[2.5, 7.0, 6.5])
doc.add_paragraph(
    "Subir las normas es necesario, pero no suficiente. Las instrucciones del agente deben ordenar que use únicamente las fuentes cargadas, cite documento y artículo, distinga hechos de inferencias, identifique información faltante, se abstenga cuando no exista sustento y recuerde que la decisión corresponde al profesional. Para evitar exposición de datos personales, las pruebas universitarias deben utilizar casos ficticios o anonimizados."
)

doc.add_heading("Resumen ejecutivo", level=1)
doc.add_paragraph(
    "La propuesta consiste en evolucionar el actual asistente de consulta normativa hacia un sistema de apoyo a decisiones que oriente al profesional sobre el camino de intervención más adecuado frente a una posible situación de riesgo o desprotección familiar. El sistema no reemplaza el criterio profesional ni emite una decisión administrativa. Su función es ordenar los hechos, advertir urgencias, identificar información faltante, aplicar criterios normativos trazables, recuperar las normas pertinentes y presentar rutas de actuación justificadas para que el equipo competente adopte y motive su decisión."
)
doc.add_paragraph(
    "La solución recomendada es híbrida: un formulario estructurado recoge el contexto; un motor de reglas representa criterios verificables de la Tabla de Valoración de Riesgo; y un componente RAG recupera artículos y explica la orientación con citas exactas. Este diseño reduce la posibilidad de respuestas inventadas, mejora la trazabilidad y permite evaluar académicamente la utilidad del sistema mediante concordancia con expertos, tiempo de análisis, calidad de citas e identificación de omisiones."
)

doc.add_heading("1 Planteamiento del problema", level=1)
doc.add_paragraph(
    "La valoración de casos que involucran a niñas, niños y adolescentes exige examinar información familiar, social, psicológica, educativa y jurídica. El profesional debe diferenciar si existe una situación de riesgo, una posible desprotección familiar, una alerta que requiere actuación inmediata o información insuficiente para concluir. También debe decidir qué diligencias faltan y qué alternativas de intervención son proporcionales al contexto."
)
doc.add_paragraph(
    "El asistente RAG existente facilita la consulta del Decreto Legislativo N.° 1297 y de su Reglamento, pero una búsqueda normativa por sí sola no organiza el razonamiento del caso. La oportunidad de mejora es convertir la consulta documental en una orientación guiada y auditable que ayude a evitar omisiones, sin automatizar una decisión que corresponde al especialista y al equipo interdisciplinario."
)

doc.add_heading("2 Propuesta de solución", level=1)
doc.add_paragraph(
    "Se propone un Asistente inteligente para la orientación de rutas de intervención ante situaciones de riesgo o desprotección familiar. Ante los datos de un caso, el sistema indicaría qué debe verificarse, qué señales requieren prioridad, qué información falta, qué clasificación preliminar podría explorarse y qué alternativas normativas deberían ser evaluadas."
)
doc.add_paragraph("La salida principal no sería una orden ni un dictamen, sino una ruta profesional explicada:")
for item in [
    "nivel de urgencia y signos de alerta identificados;",
    "hechos e indicadores relevantes del caso;",
    "información ausente, contradictoria o pendiente de corroboración;",
    "orientación preliminar entre información insuficiente, riesgo, posible desprotección o alerta inmediata;",
    "diligencias y coordinaciones sugeridas;",
    "alternativas de intervención que deben evaluarse según el contexto;",
    "fundamento normativo, con documento, artículo y fragmento recuperado;",
    "registro de la decisión final del profesional y de su motivación."
]:
    add_bullet(doc, item)

doc.add_heading("3 Alcance y límites", level=1)
add_table(doc, ["El sistema sí debe", "El sistema no debe"], [
    ("Estructurar la recolección de información y advertir datos faltantes.", "Declarar por sí solo que existe riesgo o desprotección familiar."),
    ("Aplicar reglas explícitas y mostrar por qué se activaron.", "Usar una puntuación opaca como único fundamento de la recomendación."),
    ("Recuperar normas vigentes y citar el sustento exacto.", "Completar vacíos con conocimiento general del modelo de lenguaje."),
    ("Proponer rutas y alternativas que el profesional debe evaluar.", "Seleccionar automáticamente una medida de protección definitiva."),
    ("Permitir aceptar, modificar o rechazar la orientación con motivación.", "Sustituir la entrevista, la evaluación interdisciplinaria o la autoridad competente."),
], widths=[8.0, 8.0])

doc.add_heading("4 Información que debe considerar", level=1)
doc.add_paragraph("El formulario debe priorizar hechos verificables y evitar conclusiones prematuras. Como mínimo, debería recoger:")
for item in [
    "datos esenciales de la niña, niño o adolescente, considerando edad, discapacidad, pertenencia cultural y necesidades particulares;",
    "derechos presuntamente afectados y descripción concreta de los hechos;",
    "naturaleza, frecuencia, duración y gravedad de la afectación;",
    "impacto físico, emocional, educativo, social o conductual observado;",
    "actitud de la familia: reconocimiento, rechazo, minimización, cooperación o acciones protectoras;",
    "capacidades de cuidado y posibilidad real de modificar la situación con apoyo;",
    "existencia y disponibilidad de familia extensa y redes comunitarias;",
    "opinión de la niña, niño o adolescente, obtenida de acuerdo con su edad y madurez;",
    "intervenciones previas, resultados y posibles reincidencias;",
    "signos de alerta que demanden atención inmediata;",
    "fuentes que sustentan cada dato: entrevista, visita, documento, informe o coordinación institucional."
]:
    add_bullet(doc, item)

doc.add_page_break()
doc.add_heading("5 Arquitectura funcional", level=1)
add_table(doc, ["Componente", "Función", "Resultado"], [
    ("Formulario estructurado", "Recoge hechos, indicadores, fuentes y contexto mediante preguntas adaptativas.", "Expediente de valoración preliminar completo y verificable."),
    ("Motor de reglas", "Contrasta respuestas con criterios normativos explícitos, alertas y condiciones mínimas.", "Reglas activadas, inconsistencias e información pendiente."),
    ("RAG normativo", "Recupera fragmentos pertinentes del corpus oficial y vigente.", "Artículos, anexos y citas que respaldan la orientación."),
    ("Modelo de lenguaje", "Redacta una explicación limitada a los datos y fragmentos recuperados.", "Resumen comprensible, sin crear hechos ni normas."),
    ("Revisión profesional", "Permite aceptar, modificar o rechazar cada sugerencia y registrar la motivación.", "Decisión humana trazable y auditable."),
], widths=[3.2, 7.0, 5.8])

doc.add_heading("6 Flujo de orientación", level=1)
add_numbered_list(doc, [
    "Registrar el contexto y las fuentes disponibles del caso.",
    "Identificar primero signos de alerta o necesidad de actuación inmediata.",
    "Verificar que exista información mínima para realizar una valoración preliminar.",
    "Mostrar vacíos, contradicciones y diligencias necesarias para completarla.",
    "Contrastar los hechos con criterios de la Tabla de Valoración de Riesgo.",
    "Recuperar las normas relacionadas mediante RAG.",
    "Generar una orientación preliminar y varias rutas condicionadas.",
    "Solicitar la revisión del equipo profesional y registrar su decisión motivada."
])

doc.add_heading("7 Categorías de salida", level=1)
add_table(doc, ["Resultado orientativo", "Significado funcional", "Acción sugerida"], [
    ("Información insuficiente", "Faltan datos indispensables o existen contradicciones relevantes.", "Realizar entrevistas, verificaciones o coordinaciones antes de clasificar."),
    ("Posible situación de riesgo", "Existe afectación, pero hay capacidades o disposición familiar que podrían fortalecerse.", "Evaluar apoyos, servicios, compromisos y seguimiento en el entorno familiar."),
    ("Posible desprotección familiar", "Los indicadores sugieren afectación grave y ausencia o insuficiencia de respuesta protectora.", "Activar la evaluación competente y examinar medidas familiares de protección conforme a la norma."),
    ("Alerta inmediata", "Los signos identificados requieren prioridad y no permiten esperar a completar toda la evaluación.", "Mostrar el protocolo y la entidad competente para actuación urgente."),
], widths=[3.7, 7.0, 5.3])

doc.add_heading("8 Rutas condicionadas según el contexto", level=1)
add_table(doc, ["Contexto observado", "Orientación que podría mostrar el asistente"], [
    ("La familia reconoce el problema, coopera y puede mejorar con apoyo.", "Evaluar una ruta de fortalecimiento familiar, acceso a servicios y seguimiento con compromisos verificables."),
    ("Existe peligro o un signo de alerta inmediata.", "Priorizar seguridad, activar la ruta urgente aplicable y documentar la actuación sin esperar el cierre de toda la valoración."),
    ("No se identifica un cuidador protector disponible.", "Verificar familia extensa y otras alternativas familiares previstas antes de considerar opciones más restrictivas."),
    ("Los hechos aún no están corroborados.", "Solicitar diligencias concretas y abstenerse de presentar una clasificación concluyente."),
    ("Las versiones son contradictorias.", "Exponer la contradicción, identificar sus fuentes y recomendar actuaciones para aclararla."),
    ("El RAG no encuentra respaldo normativo suficiente.", "Indicar expresamente la falta de sustento y no generar una recomendación jurídica."),
], widths=[6.7, 9.3])

doc.add_heading("9 Ejemplo de respuesta del asistente", level=1)
doc.add_paragraph(
    "Orientación de ruta. Antes de determinar la situación, se recomienda entrevistar a la niña, niño o adolescente por separado, realizar una visita domiciliaria y verificar la disponibilidad de la familia extensa."
)
doc.add_paragraph(
    "Motivo. Se han registrado indicadores de negligencia y afectación educativa, pero todavía no se ha establecido si la familia reconoce el problema y posee capacidad efectiva para revertirlo."
)
doc.add_paragraph(
    "Clasificación preliminar. Información insuficiente con indicios compatibles con una posible situación de riesgo."
)
doc.add_paragraph("Próximos pasos sugeridos:")
for item in [
    "verificar la seguridad inmediata;",
    "recoger la opinión del NNA;",
    "evaluar las capacidades y la disposición de sus cuidadores;",
    "identificar redes familiares y comunitarias;",
    "aplicar la Tabla de Valoración vigente;",
    "reevaluar la orientación con la nueva evidencia."
]:
    add_bullet(doc, item)
doc.add_paragraph(
    "Decisión final. La clasificación y las medidas corresponden al equipo profesional competente. La orientación del sistema es explicable, revisable y no vinculante."
)

doc.add_heading("10 Base normativa mínima del corpus", level=1)
doc.add_paragraph(
    "Para que la propuesta sea confiable, el corpus debe contener versiones oficiales, vigentes y trazables. El alcance inicial recomendado comprende:"
)
refs = [
    ("Decreto Legislativo N.° 1297", "Marco de protección de niñas, niños y adolescentes sin cuidados parentales o en riesgo de perderlos."),
    ("D.S. N.° 001-2018-MIMP y sus modificaciones", "Reglamento del Decreto Legislativo N.° 1297."),
    ("D.S. N.° 006-2024-MIMP", "Modificación del Reglamento del Decreto Legislativo N.° 1297."),
    ("R.M. N.° 189-2021-MIMP", "Actualización de la Tabla de Valoración de Riesgo."),
    ("R.M. N.° 002-2024-MIMP", "Modificación de los anexos sobre signos de alerta e informe de valoración."),
    ("Ley N.° 30466 y su Reglamento", "Parámetros y garantías procesales para la consideración primordial del interés superior del niño."),
    ("Directivas sobre medidas de protección", "Reglas específicas aplicables a fortalecimiento, acogimiento y otras intervenciones."),
]
add_table(doc, ["Norma o instrumento", "Uso dentro del asistente"], refs, widths=[6.2, 9.8])
doc.add_paragraph(
    "El corpus debe conservar fecha de publicación, vigencia, modificatorias, versión utilizada en cada consulta y vínculo al documento oficial. Una norma derogada o modificada no debe presentarse como vigente sin advertencia."
)

doc.add_heading("11 Salvaguardas éticas y técnicas", level=1)
for item in [
    "Decisión humana obligatoria: ninguna orientación se convierte automáticamente en resolución o medida.",
    "Explicabilidad: cada recomendación debe mostrar los hechos, reglas y normas que la sustentan.",
    "Abstención segura: si faltan datos o sustento normativo, el sistema debe reconocerlo.",
    "Minimización de datos: solo se procesa la información personal estrictamente necesaria.",
    "Control de acceso y auditoría: toda consulta, modificación y decisión queda vinculada al usuario autorizado.",
    "Gestión de sesgos: se revisan resultados por edad, sexo, discapacidad, procedencia y otros factores pertinentes.",
    "Prohibición de puntaje único: la salida no debe reducirse a un porcentaje que oculte el razonamiento.",
    "Validación previa: reglas, formularios y casos de prueba deben revisarse con especialistas jurídicos y equipos interdisciplinarios."
]:
    add_bullet(doc, item)

doc.add_heading("12 Propuesta de investigación universitaria", level=1)
doc.add_heading("12 1 Título sugerido", level=2)
doc.add_paragraph(
    "Diseño de un asistente inteligente basado en RAG y reglas normativas para orientar rutas de intervención en casos de riesgo o desprotección familiar de niñas, niños y adolescentes"
)
doc.add_heading("12 2 Pregunta de investigación", level=2)
doc.add_paragraph(
    "¿Cómo influye un asistente inteligente basado en RAG y reglas normativas en la calidad, trazabilidad y oportunidad de las decisiones profesionales sobre rutas de intervención ante situaciones de riesgo o desprotección familiar?"
)
doc.add_heading("12 3 Objetivo general", level=2)
doc.add_paragraph(
    "Diseñar y evaluar un asistente inteligente que organice la información del caso, recupere la normativa aplicable y oriente rutas de intervención trazables para apoyar la decisión de profesionales que atienden situaciones de riesgo o desprotección familiar."
)
doc.add_heading("12 4 Objetivos específicos", level=2)
for item in [
    "Modelar los criterios normativos y las señales de alerta de la Tabla de Valoración de Riesgo.",
    "Diseñar un formulario adaptativo para recoger hechos, contexto y fuentes del caso.",
    "Implementar un mecanismo RAG que recupere y cite fragmentos normativos pertinentes.",
    "Generar rutas de intervención explicables, revisables y no vinculantes.",
    "Evaluar la concordancia, utilidad, trazabilidad y reducción del tiempo de análisis frente a la consulta documental convencional."
]:
    add_bullet(doc, item)

doc.add_heading("12 5 Hipótesis de trabajo", level=2)
doc.add_paragraph(
    "El uso de un asistente híbrido basado en reglas normativas y RAG mejora la consistencia, trazabilidad y oportunidad de la orientación profesional, sin disminuir el control humano sobre la decisión final."
)

doc.add_heading("13 Variables e indicadores de evaluación", level=1)
add_table(doc, ["Dimensión", "Indicador propuesto", "Forma de medición"], [
    ("Concordancia", "Coincidencia entre orientación y evaluación de expertos.", "Porcentaje de acuerdo y, si corresponde, coeficiente de concordancia."),
    ("Oportunidad", "Tiempo necesario para completar el análisis preliminar.", "Comparación de minutos por caso con y sin asistente."),
    ("Trazabilidad", "Recomendaciones con fundamento verificable.", "Porcentaje de afirmaciones respaldadas por una cita correcta."),
    ("Completitud", "Detección de datos o diligencias faltantes.", "Número de omisiones relevantes identificadas en casos de prueba."),
    ("Seguridad", "Recomendaciones sin sustento o indebidamente concluyentes.", "Tasa de respuestas inseguras y tasa de abstención correcta."),
    ("Usabilidad", "Utilidad y claridad percibidas por profesionales.", "Cuestionario de usabilidad y entrevista semiestructurada."),
], widths=[3.0, 6.5, 6.5])

doc.add_heading("14 Metodología sugerida", level=1)
doc.add_paragraph(
    "Puede desarrollarse una investigación aplicada con diseño cuasiexperimental o una evaluación de prototipo. Se recomienda trabajar únicamente con casos ficticios, anonimizados o previamente autorizados, debido a la sensibilidad de la información."
)
add_numbered_list(doc, [
    "Construir entre 20 y 40 casos de prueba que cubran riesgo, posible desprotección, urgencia, información insuficiente y situaciones ambiguas.",
    "Solicitar a un panel de especialistas que establezca una respuesta de referencia y explique su razonamiento.",
    "Comparar el análisis documental convencional con el análisis apoyado por el asistente.",
    "Medir tiempo, concordancia, citas correctas, información faltante detectada y errores de orientación.",
    "Realizar entrevistas de usabilidad para identificar confianza indebida, ambigüedades y mejoras del flujo.",
    "Documentar discrepancias: el objetivo no es ocultarlas, sino entender cuándo y por qué el sistema falla."
])

doc.add_heading("15 Alcance recomendado para un prototipo", level=1)
doc.add_paragraph(
    "Para mantener un alcance viable, la primera versión debería limitarse a cuatro resultados orientativos: información insuficiente, posible riesgo, posible desprotección y alerta inmediata. Además, debería proponer diligencias pendientes y recuperar el fundamento normativo. La recomendación detallada de medidas de protección puede dejarse para una segunda fase, después de validar la calidad de la clasificación orientativa y la seguridad del sistema."
)
add_table(doc, ["Prioridad", "Capacidad"], [
    ("Versión inicial", "Formulario guiado, reglas de alerta, cuatro resultados orientativos, RAG con citas, información faltante y revisión profesional."),
    ("Segunda fase", "Rutas condicionadas por contexto, comparación de alternativas y seguimiento del caso."),
    ("Fase futura", "Aprendizaje a partir de decisiones validadas, siempre con gobernanza, control de sesgo y aprobación institucional."),
], widths=[3.2, 12.8])

doc.add_heading("16 Criterios de aceptación del prototipo", level=1)
for item in [
    "Dado un caso incompleto, cuando el usuario solicite orientación, el sistema identifica los datos indispensables pendientes y evita una conclusión definitiva.",
    "Dado un signo de alerta, cuando se registra el hecho, el sistema lo prioriza y muestra la ruta urgente aplicable.",
    "Dada una recomendación, cuando el usuario revisa su fundamento, puede visualizar los hechos considerados, las reglas activadas y las citas normativas.",
    "Dada una consulta sin sustento suficiente, cuando el RAG no recupera evidencia pertinente, el sistema se abstiene de formular una recomendación jurídica.",
    "Dada una orientación generada, cuando el profesional la revisa, puede aceptarla, modificarla o rechazarla y registrar su motivación.",
    "Dada una auditoría posterior, se puede reconstruir qué versión del corpus, qué reglas y qué datos fueron utilizados."
]:
    add_bullet(doc, item)

doc.add_heading("17 Conclusión", level=1)
doc.add_paragraph(
    "La evolución más útil del módulo no consiste en permitir que una IA decida si existe riesgo o desprotección familiar. Consiste en construir un asistente que conduzca un razonamiento profesional ordenado: primero protege ante la urgencia, luego verifica la suficiencia de la información, aplica criterios explícitos, recupera la normativa vigente, presenta rutas condicionadas y deja la decisión final en manos del especialista."
)
doc.add_paragraph(
    "Como trabajo universitario, la propuesta es pertinente porque combina inteligencia artificial, ingeniería de software, protección de derechos y evaluación empírica. Su aporte puede demostrarse con resultados medibles, especialmente en consistencia, trazabilidad, tiempo de análisis y reducción de omisiones."
)

doc.add_heading("Fuentes normativas consultadas", level=1)
sources = [
    ("Resolución Ministerial N.° 189-2021-MIMP", "https://www.gob.pe/institucion/mimp/normas-legales/2024385-189-2021-mimp"),
    ("Tabla de Valoración de Riesgo o Desprotección Familiar", "https://cdn.www.gob.pe/uploads/document/file/2020573/ANEXO-Tabla-Valoracion-Riesgo.pdf"),
    ("Resolución Ministerial N.° 002-2024-MIMP", "https://www.gob.pe/institucion/mimp/normas-legales/4993415-002-2024-mimp"),
    ("Decreto Supremo N.° 006-2024-MIMP", "https://www.gob.pe/institucion/mimp/normas-legales/6056086-006-2024-mimp"),
    ("Reglamento del Decreto Legislativo N.° 1297", "https://www.mimp.gob.pe/files/direcciones/dga/Reglamento-DL1297.pdf"),
    ("OpenAI Ayuda sobre GPTs y conocimiento", "https://help.openai.com/en/articles/8554407-gpts-faq"),
    ("Anthropic Ayuda sobre Projects y bases de conocimiento", "https://support.anthropic.com/en/articles/9517075-what-are-projects"),
    ("Google Ayuda sobre Gems", "https://support.google.com/gemini/answer/15236405"),
    ("Google Ayuda sobre la transición de Gems a Skills", "https://support.google.com/gemini/answer/18560919"),
]
for label, url in sources:
    p = doc.add_paragraph(style="List Bullet")
    add_hyperlink(p, label, url)

# Footer with page number field
footer = section.footer
p = footer.paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Sistema DGNNA  |  Propuesta académica  |  ")
set_font(r, size=8, color="666666")
fld_char1 = OxmlElement("w:fldChar")
fld_char1.set(qn("w:fldCharType"), "begin")
instr = OxmlElement("w:instrText")
instr.set(qn("xml:space"), "preserve")
instr.text = " PAGE "
fld_char2 = OxmlElement("w:fldChar")
fld_char2.set(qn("w:fldCharType"), "end")
run = p.add_run()
run._r.append(fld_char1)
run._r.append(instr)
run._r.append(fld_char2)

# Avoid widows/orphans and standardize body font in tables/lists.
for paragraph in doc.paragraphs:
    p_pr = paragraph._p.get_or_add_pPr()
    widow = OxmlElement("w:widowControl")
    p_pr.append(widow)
    for run in paragraph.runs:
        if run.font.size is None:
            set_font(run, size=10.5)

doc.core_properties.title = "Propuesta de asistente inteligente para orientar rutas de intervención"
doc.core_properties.subject = "Trabajo universitario aplicado al Sistema DGNNA"
doc.core_properties.author = ""
doc.core_properties.keywords = "DGNNA, RAG, inteligencia artificial, riesgo, desprotección familiar"
doc.save(OUTPUT)
print(OUTPUT)
