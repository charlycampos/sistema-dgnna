"""
Servicio ETL de importación de archivos CAR (Centros y NNA Básico, Especializado, Urgencia).
- Encripta reversiblemente datos personales (AES-256-GCM).
- Calcula Blind Index determinista (HMAC-SHA256) para comparaciones rápidas.
- Guarda el 100% de la fila original en formato JSON/CLOB para auditoría total.
- Administra cortes periódicos (desmarcando cortes anteriores y activando el nuevo con ES_ULTIMO_CORTE = 'S').
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
    mask_name,
)
from infrastructure.db.models import (
    CarCentroModel,
    CarCargaModel,
    CarCargaFilaRawModel,
    CarNnaCorteModel,
)

logger = logging.getLogger("car_etl")


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


def _fecha_corte(periodo_corte: str) -> date:
    match = re.match(r"^(\d{4})-(\d{2})", periodo_corte or "")
    if not match:
        return date.today()
    year, month = int(match.group(1)), int(match.group(2))
    return date(year, month, calendar.monthrange(year, month)[1])


def importar_car_centros(filepath: str, db: Session, usuario: str = "SISTEMA") -> dict:
    """Importa o actualiza el catálogo de 54 Centros CAR desde el Excel."""
    file_hash = _calc_sha256(filepath)
    filename = os.path.basename(filepath)
    
    df = pd.read_excel(filepath, sheet_name="New Report 2026")
    total_filas = len(df)
    
    # Registrar carga
    carga = CarCargaModel(
        tipoCar="CENTROS",
        nombreArchivo=filename,
        archivoHash=file_hash,
        periodoCorte=datetime.now().strftime("%Y-%m"),
        usuario=usuario,
        totalRegistros=total_filas,
        estado="EXITOSA",
        mensaje=f"Carga de catálogo de centros CAR ({total_filas} registros)"
    )
    db.add(carga)
    db.flush()

    insertados = 0
    actualizados = 0

    for _, row in df.iterrows():
        cod_cen = _to_str(row.get("COD_CEN"))
        if not cod_cen:
            continue

        centro = db.query(CarCentroModel).filter(CarCentroModel.codCen == cod_cen).first()
        if not centro:
            centro = CarCentroModel(codCen=cod_cen)
            db.add(centro)
            insertados += 1
        else:
            actualizados += 1

        centro.codDgnna = _to_str(row.get("COD_DGNNA"), 50)
        centro.nomCen = _to_str(row.get("NOM_CEN"), 250) or f"CAR {cod_cen}"
        centro.tipCen = _to_str(row.get("TIP_CEN"), 50)
        centro.tipCenEsp = _to_str(row.get("TIP_CEN_ESP"), 150)
        centro.ubigeo = _to_str(row.get("UBIGEO"), 10)
        centro.depCen = _to_str(row.get("DEP_CEN"), 100)
        centro.provCen = _to_str(row.get("PROV_CEN"), 100)
        centro.disCen = _to_str(row.get("DIS_CEN"), 100)
        centro.uniLin = _to_str(row.get("UNI_LIN"), 50)
        centro.nomServ = _to_str(row.get("NOM_SERV"), 300)
        centro.defServ = _to_str(row.get("DEF_SERV"), 1000)
        centro.defServAgru = _to_str(row.get("DEF_SERV_AGRU"), 1000)
        centro.tipCenAgru = _to_str(row.get("TIP_CEN_AGRU"), 100)
        centro.textoEgreso = _to_str(row.get("TEXTO_EGRESO"), 1000)
        centro.capInstalada = _to_int(row.get("CAP_INSTALADA"))
        centro.capReal = _to_int(row.get("CAP_REAL"))
        centro.perfilCentro = _to_str(row.get("PERFIL_CENTRO"), 200)
        centro.acreditado = _to_str(row.get("ACREDITADO"), 10)
        centro.nroConstancia = _to_str(row.get("N° CONSTANCIA"), 100)
        centro.rd = _to_str(row.get("R.D."), 100)
        centro.vigencia = _to_str(row.get("VIGENCIA"), 50)
        centro.latitud = _to_str(row.get("LATITUD"), 50)
        centro.longitud = _to_str(row.get("LONGITUD"), 50)

    db.commit()
    return {"total": total_filas, "insertados": insertados, "actualizados": actualizados, "carga_id": carga.id}


def importar_nna_car(filepath: str, tipo_car: str, periodo_corte: str, db: Session, usuario: str = "SISTEMA") -> dict:
    """Importa o actualiza corte periódico de NNA de un tipo de CAR (BASICO, ESPECIALIZADO, URGENCIA)."""
    sheet_map = {
        "BASICO": "EDNE CAR BÁSICO",
        "ESPECIALIZADO": "EDNE CAR ESP",
        "URGENCIA": "EDNE CAR URGENCIAS"
    }
    sname = sheet_map.get(tipo_car.upper(), "EDNE CAR BÁSICO")
    filename = os.path.basename(filepath)
    file_hash = _calc_sha256(filepath)

    # Las hojas EDNE tienen los encabezados reales en la fila 4 (índice 3).
    df = pd.read_excel(filepath, sheet_name=sname, header=3).dropna(how="all")
    if "COD_USU" in df.columns and "COD_CEN" in df.columns:
        df = df[df["COD_USU"].notna() | df["COD_CEN"].notna()]
    total_filas = len(df)

    # 1. Registrar Carga
    carga = CarCargaModel(
        tipoCar=tipo_car.upper(),
        nombreArchivo=filename,
        archivoHash=file_hash,
        periodoCorte=periodo_corte,
        usuario=usuario,
        totalRegistros=total_filas,
        estado="EXITOSA",
        mensaje=f"Corte {periodo_corte} de NNA {tipo_car} ({total_filas} filas)"
    )
    db.add(carga)
    db.flush()

    # 2. Desmarcar corte anterior para este tipo de CAR
    db.query(CarNnaCorteModel).filter(
        CarNnaCorteModel.tipoCar == tipo_car.upper(),
        CarNnaCorteModel.esUltimoCorte == "S"
    ).update({"esUltimoCorte": "N"}, synchronize_session=False)

    # Helper para extraer columnas con nombres flexibles
    normalized_columns = {_normalizar_columna(col): col for col in df.columns}

    def get_col(row, *candidates):
        for candidate in candidates:
            if candidate in row and pd.notna(row[candidate]):
                return row[candidate]
            actual_col = normalized_columns.get(_normalizar_columna(candidate))
            if actual_col is not None and pd.notna(row[actual_col]):
                return row[actual_col]
        return None

    raw_filas = []
    cortes = []
    fecha_referencia = _fecha_corte(periodo_corte)

    for idx, row in df.iterrows():
        # Extracción de campos
        cod_usu = _to_str(get_col(row, "Codigo de usuario/a", "COD_USU", "CODIGO DEL USUARIO/A"), 100)
        tip_doc = _to_str(get_col(row, "Tipo de documento de Identidad", "TIP_DOC_USU", "TIP_DOC", "TIPO DE DOCUMENTO"), 50)
        nro_doc = _to_str(get_col(row, "Número de Documento de Identidad", "NRO_DOC_USU", "NRO_DOC", "NUMERO DE DOCUMENTO"), 100)
        
        primer_ape = _to_str(get_col(row, "Primer Apellido del Usuario/a", "APE_PAT_USU", "APE_PAT", "PRIMER APELLIDO"), 150)
        segundo_ape = _to_str(get_col(row, "Segundo Apellido del Usuario/a", "APE_MAT_USU", "APE_MAT", "SEGUNDO APELLIDO"), 150)
        nombres = _to_str(get_col(row, "Nombre del Usuario/a", "NOM_USU", "NOMBRES", "NOMBRE"), 200)

        # Nombre completo para Blind Index y comparación
        partes_nombre = [p for p in [primer_ape, segundo_ape, nombres] if p]
        nombre_completo = " ".join(partes_nombre) if partes_nombre else None

        # CIFRADO AES-256 REVERSIBLE
        nombres_enc = encrypt_text(nombres)
        primer_ape_enc = encrypt_text(primer_ape)
        segundo_ape_enc = encrypt_text(segundo_ape)
        nro_doc_enc = encrypt_text(nro_doc)

        # BLIND INDEX DETERMINISTA (HMAC-SHA256)
        nro_doc_hash = compute_blind_index(nro_doc)
        nom_hash = compute_blind_index(nombre_completo)

        # Ubicación y Demografía
        sexo_raw = _to_str(get_col(row, "Sexo del Usuario/a", "SEX_USU", "SEXO"), 20)
        sexo = {"1": "HOMBRE", "2": "MUJER"}.get(sexo_raw or "", sexo_raw)
        fec_nac = _parse_date(get_col(row, "Fecha de nacimiento del usuario/a", "FEC_NAC_USU", "FEC_NAC"))
        edad = _to_int(get_col(row, "Edad del Usuario/a", "EDAD_USU", "EDAD"))
        grupo_etario = _to_str(get_col(row, "Grupo Etario", "GRU_ET", "GRUPO_ETARIO"), 50)
        pais_nac = _to_str(get_col(row, "País de nacimiento del Usuario/a", "PAI_USU", "PAIS_NAC"), 100)
        dep_nac = _to_str(get_col(row, "Departamento de nacimiento", "DEP_NAC"), 100)
        prov_nac = _to_str(get_col(row, "Provincia de nacimiento", "PROV_NAC"), 100)
        dis_nac = _to_str(get_col(row, "Distrito de nacimiento", "DIS_NAC"), 100)
        ubigeo_nac = _to_str(get_col(row, "UBIGEO de nacimiento según RENIEC a nivel distrital", "UBI_NAC", "UBIGEO_NAC"), 10)
        discapacidad = _to_str(get_col(row, "Tiene discapacidad?", "DISCAPACIDAD"), 20)
        lengua = _to_str(get_col(row, "¿Cuál es el idioma o lengua materna con el que aprendió a hablar en su niñez?"), 100)
        seguro = _to_str(get_col(row, "Tipo de Seguro de Salud", "TIP_SEG_SAL", "SEGURO_SALUD"), 100)
        educacion = _to_str(get_col(row, "Nivel educativo", "NIV_EDU", "NIVEL_EDUCATIVO"), 100)

        # Servicio y Centro
        cod_serv = _to_str(get_col(row, "Código del Servicio", "COD_SER", "COD_SERV"), 50)
        nom_serv = _to_str(get_col(row, "Nombre del Servicio", "NOM_SER", "NOM_SERV"), 250)
        cod_cen = _to_str(get_col(row, "Código del Centro", "COD_CEN"), 50)
        nom_cen = _to_str(get_col(row, "Nombre del Centro", "NOM_CEN"), 250)

        # Ingreso
        fec_ing = _parse_date(get_col(row, "Fecha de ingreso al servicio", "FEC_ING"))
        fec_reing = _parse_date(get_col(row, "Fecha de reingreso al servicio", "FEC_REING"))
        medio_ing = _to_str(get_col(row, "Medio de ingreso", "MED_ING"), 150)
        tipo_ing = _to_str(get_col(row, "Tipo de ingreso", "TIPO_ING"), 150)
        perfil_ing = _to_str(get_col(row, "Perfil de ingreso", "PER_ING"), 150)
        sit_leg = _to_str(get_col(row, "Situación legal de ingreso de la residente", "Situación legal de la residente", "SIT_LEG", "SIT_LEGAL"), 150)
        exp_ing = _to_str(get_col(row, "Expediente de ingreso", "EXPEDIENTE"), 150)
        inst_deriva = _to_str(get_col(row, "Instancia que deriva al usuario/a", "INSTANCIA_DERIVA"), 250)

        # PTI y Permanencia
        cuenta_pti = _to_str(get_col(row, "Cuenta con plan de trabajo individual", "PLAN_TRA_IND2", "PTI"), 20)
        fec_pti = _parse_date(get_col(row, "Fecha de aprobación (emisión) del PTI", "FECH_PTI", "APROBACION_PTI"))
        
        # Días permanencia calculados desde fec_ing si no viene en fila
        dias_perm = _to_int(get_col(row, "Tiempo depermanencia- días", "TIEMPO_DEPERMANENCIA_DIAS"))
        if dias_perm is None and fec_ing:
            dias_perm = max((fecha_referencia - fec_ing).days, 0)
        rango_permanencia = _to_str(get_col(row, "Rango", "RANGO"), 50)
        if rango_permanencia and rango_permanencia.upper().startswith("R2"):
            mayor_18 = "SI"
        elif rango_permanencia and rango_permanencia.upper().startswith("R1"):
            mayor_18 = "NO"
        else:
            mayor_18 = "SI" if (dias_perm is not None and dias_perm > 548) else "NO"

        # Situación actual y egreso
        est_actual = _to_str(get_col(row, "Estado actual del usuario/a", "EST_ACT", "ESTADO_ACTUAL"), 100)
        mov_pob = _to_str(get_col(row, "Movimiento poblacional actual", "MOV_POB"), 100)
        fec_egreso = _parse_date(get_col(row, "Fecha de egreso", "FEC_EGR", "FEC_EGRESO"))
        motivo_egreso = _to_str(get_col(row, "Motivo de egreso", "MOT_EGR", "MOTIVO_EGRESO"), 250)
        traslado = _to_str(get_col(row, "Especificar centro de traslado", "Nombre del Centro de Atención de traslado"), 250)

        corte_nna = CarNnaCorteModel(
            cargaId=carga.id,
            periodoCorte=periodo_corte,
            esUltimoCorte="S",
            tipoCar=tipo_car.upper(),
            codUsu=cod_usu,
            tipDoc=tip_doc,
            nroDocEnc=nro_doc_enc,
            nombresEnc=nombres_enc,
            primerApellidoEnc=primer_ape_enc,
            segundoApellidoEnc=segundo_ape_enc,
            nroDocHash=nro_doc_hash,
            nomCompletoHash=nom_hash,
            sexo=sexo,
            fechaNacimiento=fec_nac,
            edad=edad,
            grupoEtario=grupo_etario,
            paisNacimiento=pais_nac,
            depNacimiento=dep_nac,
            provNacimiento=prov_nac,
            disNacimiento=dis_nac,
            ubigeoNacimiento=ubigeo_nac,
            tieneDiscapacidad=discapacidad,
            lenguaMaterna=lengua,
            seguroSalud=seguro,
            nivelEducativo=educacion,
            codServicio=cod_serv,
            nomServicio=nom_serv,
            codCen=cod_cen,
            nomCen=nom_cen,
            fechaIngreso=fec_ing,
            fechaReingreso=fec_reing,
            medioIngreso=medio_ing,
            tipoIngreso=tipo_ing,
            perfilIngreso=perfil_ing,
            situacionLegal=sit_leg,
            expedienteIngreso=exp_ing,
            instanciaDeriva=inst_deriva,
            cuentaPti=cuenta_pti,
            fechaAprobacionPti=fec_pti,
            diasPermanencia=dias_perm,
            mayor18Meses=mayor_18,
            estadoActual=est_actual,
            movimientoPoblacional=mov_pob,
            fechaEgreso=fec_egreso,
            motivoEgreso=motivo_egreso,
            especificarTraslado=traslado
        )
        cortes.append(corte_nna)

        # 3. Guardar Fila RAW como JSON (100% de la fila del Excel)
        # Convertimos tipos no serializables a string
        row_dict = {}
        for col_name, val in row.items():
            if pd.isna(val):
                row_dict[str(col_name)] = None
            elif isinstance(val, (datetime, date)):
                row_dict[str(col_name)] = val.strftime("%Y-%m-%d")
            else:
                row_dict[str(col_name)] = str(val)

        raw_item = CarCargaFilaRawModel(
            cargaId=carga.id,
            filaIndex=int(idx) + 2,
            codUsu=cod_usu,
            codCen=cod_cen,
            rawJson=json.dumps(row_dict, ensure_ascii=False)
        )
        raw_filas.append(raw_item)

        # Lotes de inserción para eficiencia en Oracle
        if len(cortes) >= 200:
            db.bulk_save_objects(cortes)
            db.bulk_save_objects(raw_filas)
            db.flush()
            cortes.clear()
            raw_filas.clear()

    if cortes:
        db.bulk_save_objects(cortes)
        db.bulk_save_objects(raw_filas)
        db.flush()

    db.commit()
    return {
        "tipo_car": tipo_car,
        "periodo_corte": periodo_corte,
        "total_procesados": total_filas,
        "carga_id": carga.id,
        "estado": "EXITOSA"
    }
