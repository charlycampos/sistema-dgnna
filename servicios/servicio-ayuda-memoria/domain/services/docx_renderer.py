import io
import json
from datetime import datetime
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color: str):
    """Aplica color de fondo hexadecimal a una celda de tabla en python-docx."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Establece márgenes/padding interno para celdas."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in (('top', top), ('bottom', bottom), ('left', left), ('right', right)):
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def renderizar(documento) -> io.BytesIO:
    """
    Renderiza un documento de Ayuda Memoria en formato DOCX oficial de alta fidelidad estética.
    Alineado con directrices formales del MIMP y DGNNA.
    """
    doc = Document()
    section = doc.sections[0]
    
    # Configuración de márgenes A4 oficiales (2.5 cm superior/inferior, 2.8 cm laterales)
    section.top_margin = Inches(0.98)
    section.bottom_margin = Inches(0.98)
    section.left_margin = Inches(1.1)
    section.right_margin = Inches(1.1)
    
    # ─── ENCABEZADO INSTITUCIONAL ──────────────────────────────────
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hrun1 = hp.add_run('"Decenio de la Igualdad de Oportunidades para Mujeres y Hombres"\n')
    hrun1.font.size = Pt(8.5)
    hrun1.font.italic = True
    hrun1.font.color.rgb = RGBColor(100, 116, 139)
    
    hrun2 = hp.add_run('"Año del Bicentenario, de la consolidación de nuestra Independencia, y de la conmemoración de las heroicas batallas de Junín y Ayacucho"')
    hrun2.font.size = Pt(8)
    hrun2.font.italic = True
    hrun2.font.color.rgb = RGBColor(148, 163, 184)
    
    # ─── LOGO Y TÍTULO PRINCIPAL ───────────────────────────────────
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    tr_inst = title_p.add_run("MINISTERIO DE LA MUJER Y POBLACIONES VULNERABLES\n")
    tr_inst.font.name = "Calibri"
    tr_inst.font.size = Pt(10)
    tr_inst.font.bold = True
    tr_inst.font.color.rgb = RGBColor(71, 85, 105)
    
    tr_dgnna = title_p.add_run("DIRECCIÓN GENERAL DE NIÑAS, NIÑOS Y ADOLESCENTES\n\n")
    tr_dgnna.font.name = "Calibri"
    tr_dgnna.font.size = Pt(10.5)
    tr_dgnna.font.bold = True
    tr_dgnna.font.color.rgb = RGBColor(30, 41, 59)
    
    tr_am = title_p.add_run("AYUDA MEMORIA INSTITUCIONAL\n")
    tr_am.font.name = "Calibri"
    tr_am.font.size = Pt(16)
    tr_am.font.bold = True
    tr_am.font.color.rgb = RGBColor(30, 58, 138)  # Azul Institucional DGNNA
    
    tr_tit = title_p.add_run(documento.titulo.upper())
    tr_tit.font.name = "Calibri"
    tr_tit.font.size = Pt(12)
    tr_tit.font.bold = True
    tr_tit.font.color.rgb = RGBColor(15, 23, 42)

    # ─── TABLA DE METADATOS EJECUTIVOS ────────────────────────────
    meta_table = doc.add_table(rows=4, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_datos = [
        ("CÓDIGO INTERNO", documento.codigoInterno, "VERSIÓN DOCUMENTO", f"v{documento.versionDoc or '1.0'} ({documento.estado})"),
        ("DIRECCIÓN / ÁREA", documento.direccion or "DGNNA", "ÁMBITO / REGIÓN", documento.region or "Nacional"),
        ("FECHA DE CORTE", documento.fechaCorte or datetime.now().strftime("%d/%m/%Y"), "NIVEL DE RIESGO", documento.nivelRiesgo or "MODERADO"),
        ("PLANTILLA BASE", documento.plantilla.nombre if documento.plantilla else "Formato Estándar", "ELABORADO POR", documento.creadoPor or "Especialista DGNNA")
    ]
    
    for row_idx, row_data in enumerate(meta_datos):
        row = meta_table.rows[row_idx]
        for col_idx, text_val in enumerate(row_data):
            cell = row.cells[col_idx]
            cell.text = str(text_val)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.runs[0] if p.runs else p.add_run()
            run.font.name = "Calibri"
            
            if col_idx in (0, 2):
                set_cell_background(cell, "F1F5F9")  # Slate 100
                run.font.size = Pt(8.5)
                run.font.bold = True
                run.font.color.rgb = RGBColor(51, 65, 85)
            else:
                set_cell_background(cell, "FFFFFF")
                run.font.size = Pt(9)
                run.font.bold = (col_idx == 1 and row_idx == 0)
                run.font.color.rgb = RGBColor(15, 23, 42)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(8)
    p_spacer.paragraph_format.space_after = Pt(4)

    # ─── RENDERIZADO DE SECCIONES Y BLOQUES DINÁMICOS ─────────────
    valores_map = {v.seccionId: v for v in documento.valores}
    
    if documento.plantilla and documento.plantilla.secciones:
        for sec in sorted(documento.plantilla.secciones, key=lambda s: s.orden):
            valor = valores_map.get(sec.id)
            
            # Encabezado de la Sección
            head_p = doc.add_paragraph()
            head_p.paragraph_format.space_before = Pt(14)
            head_p.paragraph_format.space_after = Pt(4)
            head_p.paragraph_format.keep_with_next = True
            
            hrun = head_p.add_run(f"{sec.orden}. {sec.titulo.upper()}")
            hrun.font.name = "Calibri"
            hrun.font.size = Pt(11)
            hrun.font.bold = True
            hrun.font.color.rgb = RGBColor(30, 58, 138)
            
            if not valor or (not valor.textoContenido and not valor.datosTablaJson and not valor.cifraCorte):
                empty_p = doc.add_paragraph()
                empty_p.paragraph_format.space_before = Pt(2)
                empty_p.paragraph_format.space_after = Pt(4)
                er = empty_p.add_run("[Sin información registrada en este acápite]")
                er.font.italic = True
                er.font.size = Pt(9.5)
                er.font.color.rgb = RGBColor(148, 163, 184)
                continue

            # Bloque de Texto Enriquecido / Párrafos
            if valor.textoContenido:
                for line in valor.textoContenido.splitlines():
                    trimmed = line.strip()
                    if not trimmed:
                        continue
                    p = doc.add_paragraph()
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(4)
                    p.paragraph_format.line_spacing = 1.15
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                    
                    if trimmed.startswith(("- ", "• ", "* ")):
                        p.paragraph_format.left_indent = Inches(0.25)
                        r = p.add_run("• " + trimmed[2:])
                    else:
                        r = p.add_run(trimmed)
                    r.font.name = "Calibri"
                    r.font.size = Pt(10)
                    r.font.color.rgb = RGBColor(30, 41, 59)

            # Bloque de KPI / Cifra Destacada
            if valor.cifraCorte:
                kpi_table = doc.add_table(rows=1, cols=1)
                kpi_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                kpi_cell = kpi_table.rows[0].cells[0]
                set_cell_background(kpi_cell, "EFF6FF")  # Blue 50
                set_cell_margins(kpi_cell, top=100, bottom=100, left=150, right=150)
                
                kp = kpi_cell.paragraphs[0]
                kp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                krun1 = kp.add_run(f"CIFRA / INDICADOR CLAVE: {valor.cifraCorte}\n")
                krun1.font.bold = True
                krun1.font.size = Pt(11)
                krun1.font.color.rgb = RGBColor(30, 58, 138)
                
                p_spacer_kpi = doc.add_paragraph()
                p_spacer_kpi.paragraph_format.space_before = Pt(4)
                p_spacer_kpi.paragraph_format.space_after = Pt(4)

            # Bloque de Tabla Dinámica de Datos
            if valor.datosTablaJson:
                try:
                    datos = json.loads(valor.datosTablaJson)
                    if isinstance(datos, list) and len(datos) > 0 and isinstance(datos[0], dict):
                        headers = list(datos[0].keys())
                        grid_table = doc.add_table(rows=1, cols=len(headers))
                        grid_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                        grid_table.autofit = True
                        
                        # Fila de Encabezados
                        hdr_row = grid_table.rows[0]
                        for c_idx, h_key in enumerate(headers):
                            c = hdr_row.cells[c_idx]
                            set_cell_background(c, "1E3A8A")  # Azul Institucional
                            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
                            cp = c.paragraphs[0]
                            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            crun = cp.add_run(str(h_key).replace("_", " ").upper())
                            crun.font.name = "Calibri"
                            crun.font.bold = True
                            crun.font.size = Pt(8.5)
                            crun.font.color.rgb = RGBColor(255, 255, 255)
                        
                        # Filas de Datos
                        for r_idx, item in enumerate(datos):
                            d_row = grid_table.add_row()
                            bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
                            for c_idx, h_key in enumerate(headers):
                                c = d_row.cells[c_idx]
                                set_cell_background(c, bg_color)
                                set_cell_margins(c, top=60, bottom=60, left=100, right=100)
                                cp = c.paragraphs[0]
                                cell_val = str(item.get(h_key, ""))
                                crun = cp.add_run(cell_val)
                                crun.font.name = "Calibri"
                                crun.font.size = Pt(9)
                                crun.font.color.rgb = RGBColor(30, 41, 59)
                except Exception:
                    pass

    # ─── BITÁCORA DE ACCIONES DESPLEGADAS ─────────────────────────
    if documento.acciones and len(documento.acciones) > 0:
        act_head = doc.add_paragraph()
        act_head.paragraph_format.space_before = Pt(16)
        act_head.paragraph_format.space_after = Pt(4)
        act_head.paragraph_format.keep_with_next = True
        
        arun = act_head.add_run("CRONOLOGÍA DE ACCIONES Y ACTUACIONES DESPLEGADAS")
        arun.font.name = "Calibri"
        arun.font.size = Pt(11)
        arun.font.bold = True
        arun.font.color.rgb = RGBColor(30, 58, 138)
        
        act_table = doc.add_table(rows=1, cols=3)
        act_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        act_hdr = act_table.rows[0]
        
        for c_idx, h_text in enumerate(("FECHA", "INSTITUCIÓN / ACTOR", "ACTUACIÓN REGISTRADA")):
            c = act_hdr.cells[c_idx]
            set_cell_background(c, "334155")  # Slate 700
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            cp = c.paragraphs[0]
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            crun = cp.add_run(h_text)
            crun.font.name = "Calibri"
            crun.font.bold = True
            crun.font.size = Pt(8.5)
            crun.font.color.rgb = RGBColor(255, 255, 255)
            
        for a_idx, accion in enumerate(documento.acciones):
            a_row = act_table.add_row()
            bg_color = "F8FAFC" if a_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate((accion.fecha, accion.institucion or "DGNNA", accion.descripcion)):
                c = a_row.cells[c_idx]
                set_cell_background(c, bg_color)
                set_cell_margins(c, top=60, bottom=60, left=100, right=100)
                cp = c.paragraphs[0]
                crun = cp.add_run(str(val))
                crun.font.name = "Calibri"
                crun.font.size = Pt(9)
                crun.font.color.rgb = RGBColor(30, 41, 59)

    # ─── SELLO DE INTEGRIDAD CRIPTOGRÁFICA SHA-256 (SOLO SI EXISTE HASH REAL) ───
    # Nunca se imprime un hash de relleno: si el documento no tiene hashIntegridad
    # calculado (p. ej. estado inconsistente), no se muestra sello alguno en vez de
    # simular una firma que no existe.
    if documento.hashIntegridad:
        doc.add_paragraph().paragraph_format.space_before = Pt(16)
        seal_table = doc.add_table(rows=1, cols=1)
        seal_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        seal_cell = seal_table.rows[0].cells[0]
        set_cell_background(seal_cell, "F0FDF4")  # Emerald 50
        set_cell_margins(seal_cell, top=100, bottom=100, left=150, right=150)
        
        sp = seal_cell.paragraphs[0]
        sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        srun_title = sp.add_run("🔒 DOCUMENTO OFICIAL PUBLICADO E INMUTABLE — SISTEMA DGNNA\n")
        srun_title.font.name = "Calibri"
        srun_title.font.bold = True
        srun_title.font.size = Pt(9.5)
        srun_title.font.color.rgb = RGBColor(22, 101, 52)
        
        pub_info = f"Publicado por: {documento.publicadoPor or 'Dirección DGNNA'} | Fecha: {documento.publicadoAt.strftime('%d/%m/%Y %H:%M') if documento.publicadoAt else datetime.now().strftime('%d/%m/%Y %H:%M')}\n"
        srun_info = sp.add_run(pub_info)
        srun_info.font.name = "Calibri"
        srun_info.font.size = Pt(8.5)
        srun_info.font.color.rgb = RGBColor(21, 128, 61)
        
        srun_hash = sp.add_run(f"Firma Criptográfica SHA-256: {documento.hashIntegridad}")
        srun_hash.font.name = "Consolas"
        srun_hash.font.size = Pt(8)
        srun_hash.font.color.rgb = RGBColor(22, 101, 52)
    elif documento.estado == "PUBLICADO":
        # Estado inconsistente: publicado pero sin hash registrado. Se advierte
        # en vez de simular integridad que no puede verificarse.
        doc.add_paragraph().paragraph_format.space_before = Pt(16)
        warn_p = doc.add_paragraph()
        warn_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        warn_run = warn_p.add_run("⚠ Documento marcado como PUBLICADO sin firma de integridad verificable. Consulte con OGTI.")
        warn_run.font.name = "Calibri"
        warn_run.font.size = Pt(8.5)
        warn_run.font.italic = True
        warn_run.font.color.rgb = RGBColor(180, 83, 9)

    # ─── PIE DE PÁGINA INSTITUCIONAL ──────────────────────────────
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    frun = fp.add_run(f"Sistema DGNNA · Documento Oficial · Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    frun.font.name = "Calibri"
    frun.font.size = Pt(8)
    frun.font.color.rgb = RGBColor(148, 163, 184)
    
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)
    return stream
