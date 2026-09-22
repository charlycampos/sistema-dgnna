"""
Servicio ETL de Consolidación de Historias UPE (DPE).
Procesa el archivo 'docs/6. CONSOLIDADO_RENE_2018-2025_A JUNIO2026.xlsx' (227,695 actuaciones)
y genera la capa analítica de expedientes únicos consolidados en Oracle Database.
"""

import os
import hashlib
import openpyxl
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text


def _parse_date(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val.date()
    try:
        s = str(val)[:10].strip()
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def _calc_rango_pti(meses):
    if meses is None or meses < 0:
        return None
    if meses < 6:
        return "MENOR_6M"
    elif meses <= 12:
        return "DE_6A12M"
    else:
        return "MAYOR_12M"


def consolidar_historias_upe(filepath: str, db: Session, usuario: str = "DIRECTORA_DGNNA") -> dict:
    """
    Lee en modo streaming las 227k filas del Excel y consolida por expediente único.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Archivo no encontrado: {filepath}")

    # 1. Registrar lote en DPE_CARGAS
    filename = os.path.basename(filepath)
    db.execute(
        text("""
            INSERT INTO DPE_CARGAS (NOMBRE_ARCHIVO, PERIODO_CORTE, USUARIO, TOTAL_ACTUACIONES, TOTAL_EXPEDIENTES, ESTADO)
            VALUES (:nom, '2018-2026', :usr, 0, 0, 'EN_PROCESO')
        """),
        {"nom": filename, "usr": usuario}
    )
    db.commit()
    carga_id = db.execute(text("SELECT MAX(ID) FROM DPE_CARGAS")).fetchone()[0]

    wb = openpyxl.load_workbook(filepath, read_only=True)
    sheet = wb["Hoja1"]

    expedientes_dict = {}
    actuaciones_count = 0

    # Iterar desde la fila 7 (datos)
    for row in sheet.iter_rows(min_row=7, values_only=True):
        # Descartar filas vacías al final del archivo Excel
        if not any(row) or row[0] is None:
            continue

        actuaciones_count += 1
        exp_raw = str(row[4]).strip() if row[4] else None
        if not exp_raw or exp_raw in ("NO REGISTRA", "SIN EXPEDIENTE", "-"):
            # Generar identificador temporal para actuaciones sin expediente formal
            exp_raw = f"SIN_EXP_{row[0]}"

        nom_cen = str(row[39]).strip().upper() if row[39] else "SIN SEDE"
        key = (exp_raw, nom_cen)

        fec_ing = _parse_date(row[2])
        anio = fec_ing.year if fec_ing else (int(exp_raw[:4]) if exp_raw[:4].isdigit() else 2025)

        if key not in expedientes_dict:
            # Inicializar expediente
            expedientes_dict[key] = {
                "num_expediente": exp_raw,
                "sede_upe": nom_cen,
                "anio_ingreso": anio,
                "fecha_ingreso": fec_ing,
                "tipo_doc": str(row[10]).strip() if row[10] else "DNI",
                "nro_doc_hash": hashlib.sha256(str(row[11]).strip().encode("utf-8")).hexdigest() if row[11] else None,
                "edad_ingreso": int(row[13]) if (row[13] is not None and str(row[13]).isdigit()) else None,
                "grupo_etario": str(row[15]).strip() if row[15] else "G3",
                "sexo": str(row[16]).strip().upper() if row[16] else "NO ESPECIFICADO",
                "dep_res": str(row[18]).strip() if row[18] else None,
                "prov_res": str(row[19]).strip() if row[19] else None,
                "dis_res": str(row[20]).strip() if row[20] else None,
                "discapacidad": "SI" if (row[30] and str(row[30]).strip().upper() in ("SI", "S")) else "NO",
                "gestante": "SI" if (row[22] and str(row[22]).strip().upper() in ("SI", "S")) else "NO",
                "solicitante": str(row[40]).strip() if row[40] else None,
                # Tipologías
                "tip_viol_sex": 1 if row[46] else 0,
                "tip_viol_fis": 1 if row[48] else 0,
                "tip_viol_psi": 1 if row[49] else 0,
                "tip_trab_nna": 1 if row[50] else 0,
                "tip_calle": 1 if row[51] else 0,
                "tip_negligencia": 1 if row[53] else 0,
                "tip_trata": 1 if row[54] else 0,
                "tip_abandono": 1 if row[55] else 0,
                # Momentos
                "fec_inicio": _parse_date(row[60]),
                "proc_inicio": str(row[62]).strip().upper() if row[62] else None,
                "fec_dec": _parse_date(row[67]),
                "proc_dec": str(row[69]).strip().upper() if row[69] else None,
                "fec_pti": _parse_date(row[74]),
                "medida": str(row[63]).strip().upper() if row[63] else "SIN MP",
                "estado_proc": str(row[97]).strip().upper() if row[97] else "EN_TRAMITE",
                # La columna 111 es la condición final del procedimiento. La 102
                # describe la situación del NNA y no es un motivo de conclusión.
                "motivo_conc": str(row[111] or "").strip().upper() or None,
                "total_actuaciones": 1
            }
        else:
            # Consolidar información complementaria
            e = expedientes_dict[key]
            e["total_actuaciones"] += 1
            if not e["fecha_ingreso"] or (fec_ing and fec_ing < e["fecha_ingreso"]):
                e["fecha_ingreso"] = fec_ing
                if fec_ing:
                    e["anio_ingreso"] = fec_ing.year
            if not e["fec_inicio"] and row[60]:
                e["fec_inicio"] = _parse_date(row[60])
            if not e["proc_inicio"] and row[62]:
                e["proc_inicio"] = str(row[62]).strip().upper()
            if not e["fec_dec"] and row[67]:
                e["fec_dec"] = _parse_date(row[67])
                e["proc_dec"] = str(row[69]).strip().upper() if row[69] else None
            if not e["fec_pti"] and row[74]:
                e["fec_pti"] = _parse_date(row[74])
            if row[97] and str(row[97]).strip().upper() == "CONCLUIDO":
                e["estado_proc"] = "CONCLUIDO"
            if not e["motivo_conc"] and row[111]:
                e["motivo_conc"] = str(row[111]).strip().upper()

    # Inserción por lotes en Oracle
    total_exp = len(expedientes_dict)
    insert_sql = """
        INSERT INTO DPE_UPE_EXPEDIENTES (
            CARGA_ID, NUM_EXPEDIENTE, NUM_EXPEDIENTE_HASH, SEDE_UPE, ANIO_INGRESO, FECHA_INGRESO,
            TIPO_DOC, NRO_DOC_HASH, EDAD_INGRESO, GRUPO_ETARIO, SEXO,
            DEPARTAMENTO_RES, PROVINCIA_RES, DISTRITO_RES, TIENE_DISCAPACIDAD, ES_GESTANTE,
            INSTITUCION_SOLICITANTE, TIP_VIOLENCIA_SEXUAL, TIP_VIOLENCIA_FISICA, TIP_VIOLENCIA_PSICOLOGICA,
            TIP_NEGLIGENCIA, TIP_ABANDONO, TIP_TRABAJO_NNA, TIP_VIDA_CALLE, TIP_TRATA,
            TIENE_INICIO, FECHA_RES_INICIO, TIPO_PROC_INICIO,
            TIENE_DECLARACION, FECHA_RES_DECLARACION, TIPO_PROC_DECLARADO,
            ESCALO_A_DESPROTECCION, ESTADO_DECLARACION,
            TIENE_PTI, FECHA_RES_PTI, PERMANENCIA_PTI_MESES, RANGO_PTI,
            MEDIDA_PROTECCION_TIPO, ESTADO_PROCEDIMIENTO, MOTIVO_CONCLUSION, TOTAL_ACTUACIONES_REG
        ) VALUES (
            :carga_id, :num_exp, :exp_hash, :sede, :anio, :fec_ing,
            :tip_doc, :doc_hash, :edad, :grupo_etario, :sexo,
            :dep, :prov, :dis, :discap, :gest,
            :solic, :v_sex, :v_fis, :v_psi,
            :neg, :aban, :trab, :calle, :trata,
            :t_ini, :f_ini, :p_ini,
            :t_dec, :f_dec, :p_dec,
            :escalo, :est_dec,
            :t_pti, :f_pti, :meses_pti, :rango_pti,
            :medida, :est_proc, :motivo, :tot_act
        )
    """

    batch = []
    for (exp_num, upe_nom), data in expedientes_dict.items():
        # Detección de agravamiento (Riesgo -> Desprotección)
        p_ini = data["proc_inicio"]
        p_dec = data["proc_dec"]
        escalo = "S" if (p_ini and "RIESGO" in p_ini and p_dec and "DESPROTECCION" in p_dec) else "N"

        # Detección de atascados
        t_dec = "S" if data["fec_dec"] else "N"
        est_dec = "DECLARADO" if t_dec == "S" else "SIN_DECLARAR_ATASCADO"

        # Cálculo meses PTI
        t_pti = "S" if data["fec_pti"] else "N"
        meses_pti = 0
        if data["fec_pti"]:
            # diferencia hasta hoy o hasta 2026-06
            delta = datetime(2026, 6, 30).date() - data["fec_pti"]
            meses_pti = max(0, int(delta.days / 30.4))
        rango_pti = _calc_rango_pti(meses_pti) if t_pti == "S" else None

        # Medida agrupada
        m_raw = data["medida"] or "SIN MP"
        if "FAMILIAR" in m_raw:
            med_tipo = "ACOGIMIENTO FAMILIAR"
        elif "RESIDENCIAL" in m_raw or "CAR" in m_raw:
            med_tipo = "ACOGIMIENTO RESIDENCIAL"
        else:
            med_tipo = "SIN MP"

        batch.append({
            "carga_id": carga_id,
            "num_exp": exp_num,
            "exp_hash": hashlib.sha256(exp_num.encode("utf-8")).hexdigest(),
            "sede": upe_nom,
            "anio": data["anio_ingreso"],
            "fec_ing": data["fecha_ingreso"],
            "tip_doc": data["tipo_doc"],
            "doc_hash": data["nro_doc_hash"],
            "edad": data["edad_ingreso"],
            "grupo_etario": data["grupo_etario"],
            "sexo": data["sexo"],
            "dep": data["dep_res"],
            "prov": data["prov_res"],
            "dis": data["dis_res"],
            "discap": data["discapacidad"],
            "gest": data["gestante"],
            "solic": data["solicitante"],
            "v_sex": data["tip_viol_sex"],
            "v_fis": data["tip_viol_fis"],
            "v_psi": data["tip_viol_psi"],
            "neg": data["tip_negligencia"],
            "aban": data["tip_abandono"],
            "trab": data["tip_trab_nna"],
            "calle": data["tip_calle"],
            "trata": data["tip_trata"],
            "t_ini": "S" if (data["fec_inicio"] or p_ini) else "N",
            "f_ini": data["fec_inicio"],
            "p_ini": p_ini,
            "t_dec": t_dec,
            "f_dec": data["fec_dec"],
            "p_dec": p_dec,
            "escalo": escalo,
            "est_dec": est_dec,
            "t_pti": t_pti,
            "f_pti": data["fec_pti"],
            "meses_pti": meses_pti,
            "rango_pti": rango_pti,
            "medida": med_tipo,
            "est_proc": data["estado_proc"],
            "motivo": data["motivo_conc"],
            "tot_act": data["total_actuaciones"]
        })

        if len(batch) >= 2000:
            db.execute(text(insert_sql), batch)
            db.commit()
            batch = []

    if batch:
        db.execute(text(insert_sql), batch)
        db.commit()

    # Actualizar cabecera
    db.execute(
        text("""
            UPDATE DPE_CARGAS
            SET TOTAL_ACTUACIONES = :tot_act, TOTAL_EXPEDIENTES = :tot_exp, ESTADO = 'COMPLETADO'
            WHERE ID = :id
        """),
        {"tot_act": actuaciones_count, "tot_exp": total_exp, "id": carga_id}
    )
    db.commit()

    return {
        "carga_id": carga_id,
        "total_actuaciones": actuaciones_count,
        "total_expedientes": total_exp
    }
