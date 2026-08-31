"""
Extractor y Seeder de Corpus Normativo para el Sistema DGNNA.
Parsea los PDFs oficiales de DL 1297 y Reglamento e inserta las unidades en la base de datos.
"""
import os
import sys
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime
from pypdf import PdfReader
from sqlalchemy.orm import Session
from infrastructure.db.database import SessionLocal, engine, Base
from infrastructure.db.models import DocumentoNormativoModel, UnidadNormativaModel
from domain.services.rag_engine import rag_engine


def _clean_pdf_text(raw_text: str) -> str:
    """Limpia saltos de línea irregulares, encabezados repetitivos y espacios extra."""
    # Eliminar encabezados repetidos de SPIJ / El Peruano
    text = re.sub(r'Página \d+ de \d+', '', raw_text)
    text = re.sub(r'DIARIO OFICIAL EL PERUANO.*?\n', '', text, flags=re.IGNORECASE)
    text = re.sub(r'SISTEMA PERUANO DE INFORMACIÓN JURÍDICA.*?\n', '', text, flags=re.IGNORECASE)
    # Normalizar espacios
    text = re.sub(r'[ \t]+', ' ', text)
    # Unir palabras cortadas por guión al final de línea
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
    return text


def parsear_pdf_articulos(pdf_path: str, doc_prefix: str) -> list:
    """Extrae y segmenta los artículos, títulos y disposiciones de un PDF legal peruano."""
    if not os.path.exists(pdf_path):
        print(f"[SeedNormativa] Archivo no encontrado: {pdf_path}")
        return []

    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    print(f"[SeedNormativa] Leyendo {pdf_path} ({total_pages} páginas)...")

    full_text = ""
    page_map = []  # Para rastrear la página aproximada de cada posición

    for page_num, page in enumerate(reader.pages, 1):
        txt = page.extract_text() or ""
        txt_clean = _clean_pdf_text(txt)
        start_idx = len(full_text)
        full_text += txt_clean + "\n\n"
        end_idx = len(full_text)
        page_map.append((start_idx, end_idx, page_num))

    def _get_page(pos):
        for s, e, p in page_map:
            if s <= pos < e:
                return p
        return 1

    # Patrón robusto para detectar Artículos y Disposiciones en PDFs oficiales de SPIJ / El Peruano
    patron_art = re.compile(
        r'^\s*(?:Art[\w\ufffd]+|ART[\w\ufffd]+|Art\.)\s+(\d+[\w-]*)\.?\s*[-–—:]*\s*(.*)$|'
        r'^\s*((?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|VIGÉSIMA|TRIGÉSIMA)[\s\w\ufffd]*DISPOSICI[ÓO\ufffd]N COMPLEMENTARIA.*)$',
        re.IGNORECASE | re.MULTILINE
    )

    matches = list(patron_art.finditer(full_text))
    unidades = []
    current_titulo = "DISPOSICIONES PRELIMINARES"
    current_capitulo = ""

    patron_tit = re.compile(r'^\s*(?:T[IÍ\ufffd]TULO|TITULO)\s+([IVXLCDM\d]+[^\n\r]*)', re.IGNORECASE | re.MULTILINE)
    patron_cap = re.compile(r'^\s*(?:CAP[IÍ\ufffd]TULO|CAPITULO)\s+([IVXLCDM\d]+[^\n\r]*)', re.IGNORECASE | re.MULTILINE)

    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        block = full_text[start:end].strip()

        # Extraer títulos y capítulos cercanos
        prev_slice = full_text[max(0, start - 600):start]
        tit_m = patron_tit.findall(prev_slice)
        if tit_m:
            current_titulo = "TÍTULO " + tit_m[-1].strip()
        cap_m = patron_cap.findall(prev_slice)
        if cap_m:
            current_capitulo = "CAPÍTULO " + cap_m[-1].strip()

        # Extraer número y sumilla
        art_num_val = m.group(1)
        sumilla_val = m.group(2)
        disp_val = m.group(3)

        if art_num_val:
            art_num = f"Artículo {art_num_val.strip()}"
            sumilla = sumilla_val.strip().rstrip('.-') if sumilla_val else "Sin sumilla específica"
            ref = f"{doc_prefix}-art{art_num_val.strip().lower()}-{i+1}"
        elif disp_val:
            art_num = disp_val.strip()[:60]
            sumilla = "Disposición Complementaria"
            ref = f"{doc_prefix}-disp-{i+1}"
        else:
            art_num = f"Artículo {i+1}"
            sumilla = "Disposición Normativa"
            ref = f"{doc_prefix}-art-{i+1}"

        pagina = _get_page(start)
        
        unidades.append({
            "referencia": ref,
            "titulo": current_titulo[:200],
            "capitulo": current_capitulo[:200],
            "articulo": art_num[:30],
            "sumilla": sumilla[:500],
            "texto": block,
            "vigente": 1,
            "paginaPdf": pagina,
            "orden": i + 1
        })

    print(f"[SeedNormativa] Se segmentaron con éxito {len(unidades)} artículos de {pdf_path}.")
    return unidades


def seed_corpus_inicial():
    """Siembra los dos documentos requeridos: DL 1297 y su Reglamento."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Verificar si ya existen
        conteo = db.query(DocumentoNormativoModel).count()
        if conteo >= 2:
            print(f"[SeedNormativa] El corpus ya cuenta con {conteo} documentos cargados.")
            rag_engine.recargar_cache(db)
            return

        # Rutas a los PDFs en el proyecto (busca tanto relativo al archivo como en cwd)
        rutas_posibles = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "normativa")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "normativa")),
            os.path.abspath(os.path.join(os.getcwd(), "normativa")),
            "/app/normativa"
        ]
        
        pdf_dl = None
        pdf_reg = None
        for r in rutas_posibles:
            cand_dl = os.path.join(r, "DECRETO LEGISLATIVO 1297.pdf")
            cand_reg = os.path.join(r, "REGLAMENTO DEL DECRETO LEGISLATIVO.pdf")
            if os.path.exists(cand_dl):
                pdf_dl = cand_dl
            if os.path.exists(cand_reg):
                pdf_reg = cand_reg
            if pdf_dl and pdf_reg:
                break

        print(f"[SeedNormativa] Ruta encontrada para DL 1297: {pdf_dl}")
        print(f"[SeedNormativa] Ruta encontrada para Reglamento: {pdf_reg}")

        # 1. Documento DL 1297
        doc_dl = db.query(DocumentoNormativoModel).filter(DocumentoNormativoModel.codigo == "DL-1297").first()
        if not doc_dl:
            doc_dl = DocumentoNormativoModel(
                codigo="DL-1297",
                nombre="Decreto Legislativo para la protección de niñas, niños y adolescentes sin cuidados parentales o en riesgo de perderlos",
                tipo="DECRETO_LEGISLATIVO",
                fechaPublicacion="30/12/2016",
                versionCorpus="2026.1",
                archivoOrigen="DECRETO LEGISLATIVO 1297.pdf",
                estado="PUBLICADO"
            )
            db.add(doc_dl)
            db.flush()

            unidades_dl = parsear_pdf_articulos(pdf_dl, "dl1297")
            doc_dl.totalArticulos = len(unidades_dl)
            for u in unidades_dl:
                u_mod = UnidadNormativaModel(
                    documentoId=doc_dl.id,
                    referencia=u["referencia"],
                    titulo=u["titulo"],
                    capitulo=u["capitulo"],
                    articulo=u["articulo"],
                    sumilla=u["sumilla"],
                    texto=u["texto"],
                    vigente=u["vigente"],
                    paginaPdf=u["paginaPdf"],
                    orden=u["orden"]
                )
                db.add(u_mod)

        # 2. Documento Reglamento DL 1297 (D.S. 001-2018-MIMP / D.S. 006-2024-MIMP)
        doc_reg = db.query(DocumentoNormativoModel).filter(DocumentoNormativoModel.codigo == "DS-001-2018-MIMP").first()
        if not doc_reg:
            doc_reg = DocumentoNormativoModel(
                codigo="DS-001-2018-MIMP",
                nombre="Reglamento del Decreto Legislativo N° 1297 para la protección de niñas, niños y adolescentes",
                tipo="REGLAMENTO",
                fechaPublicacion="25/01/2018",
                versionCorpus="2026.1",
                archivoOrigen="REGLAMENTO DEL DECRETO LEGISLATIVO.pdf",
                estado="PUBLICADO"
            )
            db.add(doc_reg)
            db.flush()

            unidades_reg = parsear_pdf_articulos(pdf_reg, "reg1297")
            doc_reg.totalArticulos = len(unidades_reg)
            for u in unidades_reg:
                # Evitar colisión de referencia
                u_mod = UnidadNormativaModel(
                    documentoId=doc_reg.id,
                    referencia=u["referencia"],
                    titulo=u["titulo"],
                    capitulo=u["capitulo"],
                    articulo=u["articulo"],
                    sumilla=u["sumilla"],
                    texto=u["texto"],
                    vigente=u["vigente"],
                    paginaPdf=u["paginaPdf"],
                    orden=u["orden"]
                )
                db.add(u_mod)

        db.commit()
        print(f"[SeedNormativa] ¡Corpus inicial cargado exitosamente en la base de datos!")
        rag_engine.recargar_cache(db)

    except Exception as e:
        db.rollback()
        print(f"[SeedNormativa] Error en la carga del corpus: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_corpus_inicial()
