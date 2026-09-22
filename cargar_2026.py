"""
Script de Carga e Ingestión Directa de RENE PROTECCIÓN ESPECIAL 2026.xlsx en Oracle Database.
Consolida las 13,549 actuaciones en expedientes únicos e inserta en DPE_UPE_EXPEDIENTES.
"""

import os
import hashlib
import openpyxl
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DB_URL = os.environ.get("DATABASE_URL", "oracle+oracledb://gestion_datos_db:GestionDatos2026@host.docker.internal:1521/?service_name=XEPDB1")
EXCEL_PATH = "/tmp/rene2026.xlsx"

def parse_date(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val.date()
    try:
        s = str(val)[:10].strip()
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None

def calc_rango_pti(meses):
    if meses is None or meses < 0:
        return None
    if meses < 6:
        return "MENOR_6M"
    elif meses <= 12:
        return "DE_6A12M"
    else:
        return "MAYOR_12M"

def cargar_rene_2026():
    print("Iniciando conexión a Oracle...")
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Registrar lote en DPE_CARGAS
    filename = "RENE PROTECCIÓN ESPECIAL 2026.xlsx"
    db.execute(
        text("""
            INSERT INTO DPE_CARGAS (NOMBRE_ARCHIVO, PERIODO_CORTE, USUARIO, TOTAL_ACTUACIONES, TOTAL_EXPEDIENTES, ESTADO)
            VALUES (:nom, '2026', 'DIRECTORA_DGNNA', 0, 0, 'EN_PROCESO')
        """),
        {"nom": filename}
    )
    db.commit()
    carga_id = db.execute(text("SELECT MAX(ID) FROM DPE_CARGAS")).fetchone()[0]
    print(f"Lote registrado en DPE_CARGAS con ID: {carga_id}")

    # 2. Cargar Excel en modo read_only
    print("Abriendo archivo Excel 2026...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    sheet = wb["RENE MATRIZ"]

    expedientes_dict = {}
    actuaciones_count = 0

    print("Leyendo y consolidando filas de RENE MATRIZ 2026...")
    for row in sheet.iter_rows(min_row=7, values_only=True):
        if not any(row):
            continue
        actuaciones_count += 1
        exp_raw = str(row[4]).strip() if row[4] else None
        if not exp_raw or exp_raw in ("NO REGISTRA", "SIN EXPEDIENTE", "-"):
            exp_raw = f"SIN_EXP_{row[0]}"

        nom_cen = str(row[45]).strip().upper() if row[45] else "SIN SEDE"
        key = (exp_raw, nom_cen)

        fec_ing = parse_date(row[2])
        anio = fec_ing.year if fec_ing else 2026

        fec_ini = parse_date(row[66])
        proc_ini = str(row[68]).strip().upper() if row[68] else None

        fec_dec = parse_date(row[73])
        proc_dec = str(row[75]).strip().upper() if row[75] else None

        fec_pti = parse_date(row[80])

        sit_act = str(row[115]).strip().upper() if row[115] else "EN TRAMITE"
        motivo_conc = str(row[128]).strip().upper() if len(row) > 128 and row[128] else None

        if key not in expedientes_dict:
            expedientes_dict[key] = {
                "num_expediente": exp_raw,
                "sede_upe": nom_cen,
                "anio_ingreso": anio,
                "fecha_ingreso": fec_ing,
                "tipo_doc": str(row[16]).strip() if row[16] else "DNI",
                "nro_doc_hash": hashlib.sha256(str(row[17]).strip().encode("utf-8")).hexdigest() if row[17] else None,
                "edad_ingreso": int(row[19]) if (row[19] is not None and str(row[19]).isdigit()) else None,
                "grupo_etario": str(row[21]).strip() if row[21] else "G3",
                "sexo": str(row[22]).strip().upper() if row[22] else "NO ESPECIFICADO",
                "dep_res": str(row[24]).strip() if row[24] else None,
                "prov_res": str(row[25]).strip() if row[25] else None,
                "dis_res": str(row[26]).strip() if row[26] else None,
                "discapacidad": "SI" if (row[36] and str(row[36]).strip().upper() in ("SI", "S")) else "NO",
                "gestante": "SI" if (row[28] and str(row[28]).strip().upper() in ("SI", "S")) else "NO",
                "solicitante": str(row[46]).strip() if row[46] else None,
                # Tipologías
                "tip_viol_sex": 1 if row[52] else 0,
                "tip_viol_fis": 1 if row[54] else 0,
                "tip_viol_psi": 1 if row[55] else 0,
                "tip_trab_nna": 1 if row[56] else 0,
                "tip_calle": 1 if row[57] else 0,
                "tip_negligencia": 1 if row[59] else 0,
                "tip_trata": 1 if row[60] else 0,
                "tip_abandono": 1 if row[61] else 0,
                # Procedimiento
                "fec_inicio": fec_ini,
                "proc_inicio": proc_ini,
                "fec_dec": fec_dec,
                "proc_dec": proc_dec,
                "fec_pti": fec_pti,
                "medida": str(row[69]).strip().upper() if row[69] else "SIN MP",
                "estado_proc": sit_act,
                "motivo_conc": motivo_conc,
                "total_actuaciones": 1
            }
        else:
            e = expedientes_dict[key]
            e["total_actuaciones"] += 1
            if not e["fecha_ingreso"] or (fec_ing and fec_ing < e["fecha_ingreso"]):
                e["fecha_ingreso"] = fec_ing
                if fec_ing:
                    e["anio_ingreso"] = fec_ing.year
            if not e["fec_inicio"] and fec_ini:
                e["fec_inicio"] = fec_ini
            if not e["proc_inicio"] and proc_ini:
                e["proc_inicio"] = proc_ini
            if not e["fec_dec"] and fec_dec:
                e["fec_dec"] = fec_dec
                e["proc_dec"] = proc_dec
            if not e["fec_pti"] and fec_pti:
                e["fec_pti"] = fec_pti
            if sit_act == "CONCLUIDO":
                e["estado_proc"] = "CONCLUIDO"
            if not e["motivo_conc"] and motivo_conc:
                e["motivo_conc"] = motivo_conc

    total_exp = len(expedientes_dict)
    print(f"Total actuaciones leídas: {actuaciones_count}")
    print(f"Total expedientes únicos a insertar: {total_exp}")

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
        p_ini = data["proc_inicio"]
        p_dec = data["proc_dec"]
        escalo = "S" if (p_ini and "RIESGO" in p_ini and p_dec and "DESPROTECCION" in p_dec) else "N"

        t_dec = "S" if data["fec_dec"] else "N"
        est_dec = "DECLARADO" if t_dec == "S" else "SIN_DECLARAR_ATASCADO"

        t_pti = "S" if data["fec_pti"] else "N"
        meses_pti = 0
        if data["fec_pti"]:
            delta = datetime(2026, 9, 21).date() - data["fec_pti"]
            meses_pti = max(0, int(delta.days / 30.4))
        rango_pti = calc_rango_pti(meses_pti) if t_pti == "S" else None

        m_raw = data["medida"] or "SIN MP"
        if "FAMILIAR" in m_raw:
            med_tipo = "ACOGIMIENTO FAMILIAR"
        elif "RESIDENCIAL" in m_raw or "CAR" in m_raw:
            med_tipo = "ACOGIMIENTO RESIDENCIAL"
        else:
            med_tipo = "SIN MP"

        # Truncar campos para evitar desbordamiento de columnas Oracle
        grupo_etario = (data["grupo_etario"] or "")[:200]
        motivo = (data["motivo_conc"] or "")[:450] if data["motivo_conc"] else None

        batch.append({
            "carga_id": carga_id,
            "num_exp": exp_num[:50],
            "exp_hash": hashlib.sha256(exp_num.encode("utf-8")).hexdigest(),
            "sede": upe_nom[:100],
            "anio": data["anio_ingreso"],
            "fec_ing": data["fecha_ingreso"],
            "tip_doc": (data["tipo_doc"] or "")[:50],
            "doc_hash": data["nro_doc_hash"],
            "edad": min(data["edad_ingreso"], 99) if data["edad_ingreso"] is not None else None,
            "grupo_etario": grupo_etario,
            "sexo": (data["sexo"] or "")[:20],
            "dep": (data["dep_res"] or "")[:100],
            "prov": (data["prov_res"] or "")[:100],
            "dis": (data["dis_res"] or "")[:100],
            "discap": data["discapacidad"],
            "gest": data["gestante"],
            "solic": (data["solicitante"] or "")[:150],
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
            "p_ini": (p_ini or "")[:100] if p_ini else None,
            "t_dec": t_dec,
            "f_dec": data["fec_dec"],
            "p_dec": (p_dec or "")[:100] if p_dec else None,
            "escalo": escalo,
            "est_dec": est_dec,
            "t_pti": t_pti,
            "f_pti": data["fec_pti"],
            "meses_pti": min(meses_pti, 999),
            "rango_pti": rango_pti,
            "medida": med_tipo,
            "est_proc": (data["estado_proc"] or "")[:100],
            "motivo": motivo,
            "tot_act": min(data["total_actuaciones"], 9999)
        })

        if len(batch) >= 2000:
            db.execute(text(insert_sql), batch)
            db.commit()
            print(f"Insertados {len(batch)} registros...")
            batch = []

    if batch:
        db.execute(text(insert_sql), batch)
        db.commit()
        print(f"Insertados últimos {len(batch)} registros...")

    db.execute(
        text("""
            UPDATE DPE_CARGAS
            SET TOTAL_ACTUACIONES = :tot_act, TOTAL_EXPEDIENTES = :tot_exp, ESTADO = 'COMPLETADO'
            WHERE ID = :id
        """),
        {"tot_act": actuaciones_count, "tot_exp": total_exp, "id": carga_id}
    )
    db.commit()
    print("Carga finalizada con éxito en Oracle Database!")

if __name__ == "__main__":
    cargar_rene_2026()
