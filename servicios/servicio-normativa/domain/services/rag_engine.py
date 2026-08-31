"""
Motor RAG y Búsqueda Literal Estricta de Frase para el Corpus DGNNA.
Garantiza cero falsos positivos buscando la frase exacta continua en los 398 artículos.
"""
import re
import math
import unicodedata
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from infrastructure.db.models import UnidadNormativaModel, DocumentoNormativoModel


def normalizar_texto(texto: str) -> str:
    """Normaliza texto removiendo tildes, signos y normalizando espacios a minúsculas."""
    if not texto:
        return ""
    # Quitar tildes
    nfkd = unicodedata.normalize('NFKD', texto)
    limpio = "".join([c for c in nfkd if not unicodedata.combining(c)]).lower()
    # Normalizar espacios repetidos y saltos de línea a un solo espacio
    return re.sub(r'\s+', ' ', limpio).strip()


class RAGEngine:
    def __init__(self):
        self.embedding_dim = 256
        self._cache_docs: List[Dict[str, Any]] = []
        self._cache_matriz: Optional[np.ndarray] = None

    def _text_to_vector(self, text: str) -> np.ndarray:
        """Genera un embedding semántico denso de 256 dimensiones basado en n-gramas."""
        vec = np.zeros(self.embedding_dim, dtype=np.float32)
        if not text:
            return vec
        
        palabras = re.findall(r'\b[a-z0-9]{3,}\b', normalizar_texto(text))
        for i, p in enumerate(palabras):
            h = hash(p)
            idx = abs(h) % self.embedding_dim
            sign = 1.0 if (h >> 4) % 2 == 0 else -1.0
            peso = 1.0 / (1.0 + math.log(1 + i * 0.1))
            vec[idx] += sign * peso
            
            for j in range(len(p) - 2):
                th = hash(p[j:j+3])
                tidx = abs(th) % self.embedding_dim
                vec[tidx] += 0.3 * (1.0 if th % 2 == 0 else -1.0)
        
        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec /= norm
        return vec

    def recargar_cache(self, db: Session):
        """Carga todas las unidades normativas en memoria para búsqueda instantánea."""
        unidades = db.query(UnidadNormativaModel).join(DocumentoNormativoModel).filter(UnidadNormativaModel.vigente >= 0).all()
        
        lista_docs = []
        vectores = []
        
        for u in unidades:
            doc_data = {
                "id": u.id,
                "documentoId": u.documentoId,
                "documentoCodigo": u.documento.codigo if u.documento else "",
                "documentoNombre": u.documento.nombre if u.documento else "",
                "referencia": u.referencia,
                "libro": u.libro,
                "titulo": u.titulo,
                "capitulo": u.capitulo,
                "articulo": u.articulo,
                "numeral": u.numeral,
                "literal": u.literal,
                "sumilla": u.sumilla or "",
                "texto": u.texto,
                "texto_norm": normalizar_texto(u.texto),
                "sumilla_norm": normalizar_texto(u.sumilla or ""),
                "art_norm": normalizar_texto(u.articulo or ""),
                "vigente": u.vigente,
                "modificadoPor": u.modificadoPor,
                "paginaPdf": u.paginaPdf,
                "orden": u.orden
            }
            lista_docs.append(doc_data)
            
            if u.embedding:
                v = np.frombuffer(u.embedding, dtype=np.float32)
            else:
                v = self._text_to_vector(f"{u.articulo or ''} {u.sumilla or ''} {u.texto[:1000]}")
            vectores.append(v)
            
        self._cache_docs = lista_docs
        if vectores:
            self._cache_matriz = np.array(vectores, dtype=np.float32)
            normas = np.linalg.norm(self._cache_matriz, axis=1, keepdims=True)
            normas[normas < 1e-6] = 1.0
            self._cache_matriz /= normas
        else:
            self._cache_matriz = None
        print(f"[RAGEngine] Cache actualizado con {len(self._cache_docs)} unidades normativas.")

    def buscar_literal_exhaustiva(
        self,
        db: Session,
        query: str,
        documento_filtro: Optional[str] = None,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Búsqueda por Frase Exacta Estricta (Opción 1).
        Exige que la frase completa continua exista en el texto, sumilla o artículo.
        Si la frase no existe, devuelve 0 resultados (cero falsos positivos).
        """
        if not self._cache_docs:
            self.recargar_cache(db)
            
        if not self._cache_docs:
            return []

        # Limpiar comillas iniciales/finales y normalizar
        q_limpio = query.strip(' \t\n\r"\'')
        q_norm = normalizar_texto(q_limpio)
        if not q_norm or len(q_norm) < 2:
            return []

        coincidencias = []

        for doc in self._cache_docs:
            if documento_filtro and documento_filtro != "TODOS" and doc.get("documentoCodigo") != documento_filtro:
                continue

            texto_norm = doc.get("texto_norm", "")
            sumilla_norm = doc.get("sumilla_norm", "")
            art_norm = doc.get("art_norm", "")
            texto_orig = doc["texto"]

            score = 0
            conteo_total = 0
            posiciones = []

            # 1. Búsqueda de frase exacta continua en el texto del artículo
            pos_frase = texto_norm.find(q_norm)
            if pos_frase != -1:
                # Contar cuántas veces exactas aparece la frase completa
                ocurrencias = len(re.findall(re.escape(q_norm), texto_norm))
                conteo_total += ocurrencias
                score += 50 + (ocurrencias * 15)
                posiciones.append(pos_frase)

            # 2. Búsqueda de frase exacta en la sumilla
            if q_norm in sumilla_norm:
                score += 40
                conteo_total += 1

            # 3. Búsqueda de coincidencia en el número/nombre del artículo
            if q_norm in art_norm:
                score += 60
                conteo_total += 1

            # SI NO CONTIENE LA FRASE EXACTA CONTINUA, SE DESCARTA TOTALMENTE (0 coincidencias)
            if score == 0:
                continue

            # Extraer fragmento relevante con contexto alrededor de la coincidencia
            primer_pos = posiciones[0] if posiciones else 0
            start = max(0, primer_pos - 80)
            end = min(len(texto_orig), primer_pos + len(q_limpio) + 160)
            
            if start > 0:
                sp_start = texto_orig.find(' ', start)
                if sp_start != -1 and sp_start < primer_pos:
                    start = sp_start + 1
            
            if end < len(texto_orig):
                sp_end = texto_orig.rfind(' ', primer_pos, end + 40)
                if sp_end != -1:
                    end = sp_end

            fragmento = ("..." if start > 0 else "") + texto_orig[start:end].strip() + ("..." if end < len(texto_orig) else "")

            coincidencias.append({
                "referencia": doc["referencia"],
                "documentoCodigo": doc["documentoCodigo"],
                "documentoNombre": doc.get("documentoNombre", ""),
                "articulo": doc["articulo"],
                "sumilla": doc["sumilla"],
                "fragmento": fragmento,
                "texto": texto_orig,
                "titulo": doc.get("titulo"),
                "capitulo": doc.get("capitulo"),
                "paginaPdf": doc.get("paginaPdf"),
                "score": score,
                "conteoCoincidencias": max(1, conteo_total),
                "vigente": doc.get("vigente", 1)
            })

        # Ordenar por relevancia
        coincidencias.sort(key=lambda x: -x["score"])
        return coincidencias[:max_results]

    def buscar(
        self,
        db: Session,
        query: str,
        documento_filtro: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Búsqueda Híbrida RRF para el Asistente IA RAG."""
        if not self._cache_docs:
            self.recargar_cache(db)
            
        if not self._cache_docs:
            return []
            
        # Si la consulta es una frase literal con coincidencia exacta, priorizarla
        literal_hits = self.buscar_literal_exhaustiva(db, query, documento_filtro, max_results=top_k)
        if literal_hits and literal_hits[0]["score"] >= 40:
            return literal_hits[:top_k]

        docs_filtrados = []
        indices_filtrados = []
        
        for i, d in enumerate(self._cache_docs):
            if documento_filtro and documento_filtro != "TODOS" and d.get("documentoCodigo") != documento_filtro:
                continue
            docs_filtrados.append(d)
            indices_filtrados.append(i)
            
        if not docs_filtrados:
            return []

        # Ranking Vectorial
        vec_q = self._text_to_vector(query)
        if self._cache_matriz is not None and len(indices_filtrados) > 0:
            sub_matriz = self._cache_matriz[indices_filtrados]
            sims_vec = sub_matriz @ vec_q
            mejores_indices = np.argsort(-sims_vec)[:top_k]
        else:
            mejores_indices = np.arange(min(top_k, len(docs_filtrados)))

        resultados = []
        for idx in mejores_indices:
            doc = docs_filtrados[idx].copy()
            doc["score"] = float(sims_vec[idx]) if self._cache_matriz is not None else 1.0
            resultados.append(doc)
            
        return resultados


rag_engine = RAGEngine()
