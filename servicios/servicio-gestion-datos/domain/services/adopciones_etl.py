"""
Servicio ETL de importación para la Dirección de Adopciones (DA).
Procesa:
1. RENE ADOPCIONES (Hoja '2026') -> DA_NNA_ADOPCIONES + DA_CARGA_FILAS_RAW
2. RPADO ACTUAL (Hoja 'Nacional') -> DA_RPADO_SEGUIMIENTO + DA_CARGA_FILAS_RAW

Aplica:
- Encriptación AES-256-GCM y Blind Index HMAC-SHA256 en datos personales.
- Almacenamiento 100% íntegro de filas RAW en JSON/CLOB para auditoría.
- Control de cortes periódicos con ES_ULTIMO_CORTE = 'S'.
"""

import hashlib
import json
import logging
import os
import calendar
import re
import unicodedata
from datetime import datetime, date
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

from domain.services.car_crypto import (
    encrypt_text,
    compute_blind_index,
)
from infrastructure.db.models import (
    DaCargaModel,
    DaCargaFilaRawModel,
    DaNnaAdopcionModel,
    DaRpadoSeguimientoModel,
)

logger = logging.getLogger("adopciones_etl")


def _calc_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _parse_date(val):
    if pd.isna(val) or val is None or str(val).strip() in ("", "-", "nan", "NaT"):
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    try:
        dt = pd.to_datetime(val, errors="coerce")
        if pd.notna(dt):
            return dt.date()
    except Exception:
        pass
    return None


def _to_int(val):
    if pd.isna(val) or val is None:
        return None
    try:
        clean = str(val).replace(",", "").strip()
        # En caso venga con texto como '11603 días'
        match = re.search(r"[-+]?\d+", clean)
        if match:
            return int(match.group(0))
        return int(float(clean))
    except Exception:
        return None


def _to_str(val, max_len=None):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None"):
        return None
    if max_len:
        return s[:max_len]
    return s


def _normalizar_columna(nombre) -> str:
    texto = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]+", "_", texto.upper()).strip("_")


def _json_raw_cifrado(row) -> str:
    """Conserva la fila original completa sin persistir PII en texto claro."""
    clean_row = {}
    for col_name, col_val in row.items():
        if pd.isna(col_val):
            clean_row[str(col_name)] = None
        elif isinstance(col_val, (datetime, date)):
            clean_row[str(col_name)] = col_val.isoformat()
        else:
            clean_row[str(col_name)] = str(col_val)
    return "enc:v1:" + encrypt_text(json.dumps(clean_row, ensure_ascii=False))


def _validar_carga_no_duplicada(db: Session, tipo: str, periodo_corte: str, file_hash: str) -> None:
    duplicada = db.query(DaCargaModel.id).filter(
        DaCargaModel.tipoArchivo == tipo,
        DaCargaModel.periodoCorte == periodo_corte,
        DaCargaModel.archivoHash == file_hash,
        DaCargaModel.estado == "EXITOSA",
    ).first()
    if duplicada:
        raise ValueError(f"El mismo archivo ya fue cargado para el período {periodo_corte}.")


def importar_rene_adopciones(filepath: str, periodo_corte: str, db: Session, usuario: str = "SISTEMA") -> dict:
    """Importa el archivo RENE ADOPCIONES (Hoja 2026)."""
    filename = os.path.basename(filepath)
    file_hash = _calc_sha256(filepath)
    _validar_carga_no_duplicada(db, "ADOPCIONES", periodo_corte, file_hash)

    # Los encabezados formales están en la fila 5 (índice 4)
    df = pd.read_excel(filepath, sheet_name="2026", header=4).dropna(how="all")
    if "Sede responsable" in df.columns and "Estado" in df.columns:
        df = df[df["Sede responsable"].notna() | df["Estado"].notna()]
    total_filas = len(df)

    # 1. Registrar Carga
    carga = DaCargaModel(
        tipoArchivo="ADOPCIONES",
        nombreArchivo=filename,
        archivoHash=file_hash,
        periodoCorte=periodo_corte,
        usuario=usuario,
        totalRegistros=total_filas,
        estado="PROCESANDO",
        mensaje=f"Corte {periodo_corte} de RENE Adopciones ({total_filas} registros)"
    )
    db.add(carga)
    db.flush()

    # 2. Desmarcar corte previo
    db.query(DaNnaAdopcionModel).filter(
        DaNnaAdopcionModel.esUltimoCorte == "S"
    ).update({"esUltimoCorte": "N"}, synchronize_session=False)

    norm_cols = {_normalizar_columna(col): col for col in df.columns}

    def get_col(row, *candidates):
        for candidate in candidates:
            if candidate in row and pd.notna(row[candidate]):
                return row[candidate]
            actual_col = norm_cols.get(_normalizar_columna(candidate))
            if actual_col is not None and pd.notna(row[actual_col]):
                return row[actual_col]
        return None

    raw_filas = []
    adopciones = []

    for idx, row in df.iterrows():
        nombres = _to_str(get_col(row, "Nombres", "NOM_NNA", "NOMBRES"), 200)
        ape_pat = _to_str(get_col(row, "Apellido Paterno", "APE_PAT_NNA", "PRIMER APELLIDO"), 150)
        ape_mat = _to_str(get_col(row, "Apellido Materno", "APE_MAT_NNA", "SEGUNDO APELLIDO"), 150)
        nro_doc = _to_str(get_col(row, "Número de documento de identidad", "NRO_DOC_IDE", "DNI"), 50)
        tip_doc = _to_str(get_col(row, "Tipo de Doc. de Identidad", "TIP_DOC_IDE_NNA"), 50)

        # Nombre completo
        partes = [p for p in [nombres, ape_pat, ape_mat] if p]
        nom_completo = " ".join(partes) if partes else None

        # Cifrado
        nombres_enc = encrypt_text(nombres)
        primer_ape_enc = encrypt_text(ape_pat)
        segundo_ape_enc = encrypt_text(ape_mat)
        nro_doc_enc = encrypt_text(nro_doc)

        nro_doc_hash = compute_blind_index(nro_doc)
        nom_hash = compute_blind_index(nom_completo)

        # Sexo normalizado
        sexo_raw = _to_str(get_col(row, "Sexo", "SEX_NNA"), 20)
        sexo = "HOMBRE" if sexo_raw in ("H", "1", "Hombre") else "MUJER" if sexo_raw in ("M", "2", "Mujer") else sexo_raw

        registro = DaNnaAdopcionModel(
            cargaId=carga.id,
            periodoCorte=periodo_corte,
            esUltimoCorte="S",
            sede=_to_str(get_col(row, "Sede responsable", "UA_RES", "SEDE"), 100),
            estado=_to_str(get_col(row, "Estado", "ESTADO"), 100),
            codNna=_to_str(get_col(row, "Código NNA", "COD_NNA"), 50),
            numExpNna=_to_str(get_col(row, "Número de Exp. de NNA", "NUM_EXP_NNA"), 100),
            fechaRegExp=_parse_date(get_col(row, "Fecha de registro del número de Exp. (Fecha de ingreso del expediente)", "FEC_REG_EXP")),
            nombresEnc=nombres_enc,
            primerApellidoEnc=primer_ape_enc,
            segundoApellidoEnc=segundo_ape_enc,
            nroDocEnc=nro_doc_enc,
            tipDoc=tip_doc,
            nroDocHash=nro_doc_hash,
            nomCompletoHash=nom_hash,
            sexo=sexo,
            fechaNacimiento=_parse_date(get_col(row, "Fecha de nacimiento", "FEC_NAC_NNA")),
            edad=_to_int(get_col(row, "Edad Actual (años)", "EDA_NNA_ACT")),
            grupoEtario=_to_str(get_col(row, "Grupo Etario", "GRU_ET"), 50),
            depNacimiento=_to_str(get_col(row, "Departamento de nacimiento", "DEPA_NAC_NNA"), 100),
            provNacimiento=_to_str(get_col(row, "Provincia de nacimiento", "PROV_NAC_NNA"), 100),
            distNacimiento=_to_str(get_col(row, "Distrito de nacimiento", "DIST_NAC_NNA"), 100),
            medidaProteccion=_to_str(get_col(row, "Medida de protección 1", "MED_PROTEC"), 150),
            nomCar=_to_str(get_col(row, "Nombre del CAR", "NOM_CAR"), 250),
            codCar=_to_str(get_col(row, "Código del CAR", "COD_CAR"), 50),
            depCar=_to_str(get_col(row, "Departamento del CAR", "DEPA_CAR"), 100),
            provCar=_to_str(get_col(row, "Provincia del CAR", "PROV_CAR"), 100),
            distCar=_to_str(get_col(row, "Distrito del CAR", "DIST_CAR"), 100),
            procedenciaTutelar=_to_str(get_col(row, "Procedencia Tutelar", "PRO_TUT"), 150),
            nomUpe=_to_str(get_col(row, "Nombre de la UPE", "NOM_UPE"), 150),
            tipoResolucion=_to_str(get_col(row, "Tipo de Resolución", "TIP_RJ"), 50),
            fechaResolucion=_parse_date(get_col(row, "Fecha de la RJ", "FEC_RJDFA")),
            fechaConsentida=_parse_date(get_col(row, "Fecha de la Consentida", "FEC_CON_RJDFA")),
            condicionUltima=_to_str(get_col(row, "Condición del NNA", "COND_ULTIMA"), 150),
            condicionFinal=_to_str(get_col(row, "Condición final de NNA", "COND_FINAL"), 150),
            tipoAdopcion=_to_str(get_col(row, "Tipo de Adopción", "TIPO_NNA"), 100),
            grupoReferencia=_to_str(get_col(row, "Grupo de referencia", "GRU_REF_AE"), 150),
            fechaDesignacion=_parse_date(get_col(row, "Fecha de designación", "FEC_DES_NNA")),
        )
        adopciones.append(registro)

        raw_filas.append(DaCargaFilaRawModel(
            cargaId=carga.id,
            tipoArchivo="ADOPCIONES",
            filaNumero=int(idx) + 1,
            rawJson=_json_raw_cifrado(row)
        ))

    db.bulk_save_objects(adopciones)
    db.bulk_save_objects(raw_filas)
    carga.estado = "EXITOSA"
    db.commit()

    return {
        "carga_id": carga.id,
        "tipo": "ADOPCIONES",
        "archivo": filename,
        "registros_cargados": len(adopciones),
        "filas_raw_guardadas": len(raw_filas)
    }


def importar_rpado_seguimiento(filepath: str, periodo_corte: str, db: Session, usuario: str = "SISTEMA") -> dict:
    """Importa el archivo RPADO ACTUAL (Hoja Nacional)."""
    filename = os.path.basename(filepath)
    file_hash = _calc_sha256(filepath)
    _validar_carga_no_duplicada(db, "RPADO", periodo_corte, file_hash)

    # Los encabezados de columnas están en la fila 3 (índice 2)
    df = pd.read_excel(filepath, sheet_name="Nacional", header=2).dropna(how="all")
    if "ESTADO" in df.columns:
        df = df[df["ESTADO"].notna()]
    total_filas = len(df)

    carga = DaCargaModel(
        tipoArchivo="RPADO",
        nombreArchivo=filename,
        archivoHash=file_hash,
        periodoCorte=periodo_corte,
        usuario=usuario,
        totalRegistros=total_filas,
        estado="PROCESANDO",
        mensaje=f"Corte {periodo_corte} de RPADO Postadopción ({total_filas} familias)"
    )
    db.add(carga)
    db.flush()

    db.query(DaRpadoSeguimientoModel).filter(
        DaRpadoSeguimientoModel.esUltimoCorte == "S"
    ).update({"esUltimoCorte": "N"}, synchronize_session=False)

    norm_cols = {_normalizar_columna(col): col for col in df.columns}

    def get_col(row, *candidates):
        for candidate in candidates:
            if candidate in row and pd.notna(row[candidate]):
                return row[candidate]
            actual_col = norm_cols.get(_normalizar_columna(candidate))
            if actual_col is not None and pd.notna(row[actual_col]):
                return row[actual_col]
        return None

    raw_filas = []
    rpado_items = []

    for idx, row in df.iterrows():
        estado = _to_str(get_col(row, "ESTADO", "DETALLE DEL ESTADO"), 50)
        falta = _to_str(get_col(row, "Falta"), 150)
        sede = _to_str(get_col(row, "SEGUIMIENTO POR UNIDAD DE ADOPCION", "SEDE"), 100)
        pais = _to_str(get_col(row, "PAIS DE RESIDENCIA"), 100)
        depa = _to_str(get_col(row, "DEPARTAMENTO DE RESIDENCIA DE LA FAMILIA"), 100)
        num_exp = _to_str(get_col(row, "N° EXP.", "EXPEDIENTE"), 100)
        hijos = _to_int(get_col(row, "N° DE HIJOS ADOPTADOS")) or 1
        es_fallida = _to_str(get_col(row, "ES FALLIDA?"), 10) or "NO"

        registro = DaRpadoSeguimientoModel(
            cargaId=carga.id,
            periodoCorte=periodo_corte,
            esUltimoCorte="S",
            estado=estado,
            faltaInforme=falta,
            fechaResolAdopcion=_parse_date(get_col(row, "FECHA DE RESOL. DE ADOPCION")),
            fechaInicioPost=_parse_date(get_col(row, "FECHA DE INICIO DE SEGUIMIENTO POST")),
            numExp=num_exp,
            numHijosAdoptados=hijos,
            sede=sede,
            paisResidencia=pais,
            depResidencia=depa,
            tipoAdopcion=_to_str(get_col(row, "TIPO DE ADOPCION"), 100),
            fechaProyInf1=_parse_date(get_col(row, "FECHA PROYEC\n1ER VISITA.\nPOST")),
            retrasoDiasInf1=_to_int(get_col(row, "RETRASO 1ER INF")),
            fechaProyInf2=_parse_date(get_col(row, "FECHA PROYEC\n2DO VISITA\nPOST")),
            retrasoDiasInf2=_to_int(get_col(row, "RETRASO 2DO INF")),
            fechaProyInf3=_parse_date(get_col(row, "FECHA PROYEC\n3ER VISITA\nPOST")),
            retrasoDiasInf3=_to_int(get_col(row, "RETRASO 3ER INF")),
            fechaProyInf4=_parse_date(get_col(row, "FECHA PROYEC\n4TA VISITA\nPOST")),
            retrasoDiasInf4=_to_int(get_col(row, "RETRASO 4TO INF")),
            fechaProyInf5=_parse_date(get_col(row, "FECHA PROYEC\n5TA VISITA\nPOST")),
            retrasoDiasInf5=_to_int(get_col(row, "RETRASO 5TO INF")),
            fechaProyInf6=_parse_date(get_col(row, "FECHA PROYEC\n6TA VISITA\nPOST")),
            retrasoDiasInf6=_to_int(get_col(row, "RETRASO 6TO INF")),
            esFallida=es_fallida.strip().upper(),
            docFinalizacion=_to_str(get_col(row, "Documento que indica la FINALIZACIÓN o la ADOPCIÓN FALLIDA"), 250),
            observaciones=_to_str(get_col(row, "OBSERVACIONES"), 1000),
        )
        rpado_items.append(registro)

        raw_filas.append(DaCargaFilaRawModel(
            cargaId=carga.id,
            tipoArchivo="RPADO",
            filaNumero=int(idx) + 1,
            rawJson=_json_raw_cifrado(row)
        ))

    db.bulk_save_objects(rpado_items)
    db.bulk_save_objects(raw_filas)
    carga.estado = "EXITOSA"
    db.commit()

    return {
        "carga_id": carga.id,
        "tipo": "RPADO",
        "archivo": filename,
        "registros_cargados": len(rpado_items),
        "filas_raw_guardadas": len(raw_filas)
    }
