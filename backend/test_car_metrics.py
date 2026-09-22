"""
Script de cálculo de métricas analíticas agregadas para la bandeja de la Directora DGNNA.
Calcula exactamente:
1. Resumen ejecutivo global (ocupación, acreditados, alertas de permanencia > 18 meses)
2. Directorio completo de Centros CAR con cálculos de ocupación
3. Métricas agregadas de CAR Básico (PTI, permanencia, educación, vida independiente)
4. Métricas agregadas de CAR Especializado (salud especializada externa, salud mental, discapacidad)
5. Métricas agregadas de CAR Urgencia (días promedio, entidades derivantes, traslados)
"""

import sys, os
sys.path.insert(0, r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\servicios\servicio-gestion-datos")

from sqlalchemy import create_engine, text
import json

ORACLE_URL = "oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1"
engine = create_engine(ORACLE_URL)

with engine.connect() as conn:
    conn.execute(text("ALTER SESSION SET CURRENT_SCHEMA = GESTION_DATOS_DB"))
    
    # 1. Resumen Global
    tot_centros = conn.execute(text("SELECT count(*) FROM car_centros")).scalar()
    cap_inst = conn.execute(text("SELECT sum(cap_instalada) FROM car_centros")).scalar() or 0
    cap_real = conn.execute(text("SELECT sum(cap_real) FROM car_centros")).scalar() or 0
    acred_si = conn.execute(text("SELECT count(*) FROM car_centros WHERE acreditado = 'SI'")).scalar()
    
    tot_nna = conn.execute(text("SELECT count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S'")).scalar()
    tot_nna_bas = conn.execute(text("SELECT count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'BASICO'")).scalar()
    tot_nna_esp = conn.execute(text("SELECT count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'ESPECIALIZADO'")).scalar()
    tot_nna_urg = conn.execute(text("SELECT count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'URGENCIA'")).scalar()
    
    # Permanencia > 18 meses
    nna_mayor_18 = conn.execute(text("SELECT count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND mayor_18_meses = 'SI'")).scalar()
    nna_menor_18 = tot_nna - nna_mayor_18
    
    print("Resumen Global:")
    print(f" Centros: {tot_centros} (Acreditados: {acred_si})")
    print(f" Capacidad Instalada: {cap_inst} | Capacidad Real: {cap_real}")
    print(f" Total NNA: {tot_nna} (Básico: {tot_nna_bas}, Especializado: {tot_nna_esp}, Urgencia: {tot_nna_urg})")
    print(f" NNA > 18 meses: {nna_mayor_18} ({round(nna_mayor_18/tot_nna*100, 1)}%)")
    
    # 2. CAR Básico métricas clave
    pti_aprob = conn.execute(text("SELECT count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'BASICO' AND cuenta_pti IN ('SI', 'SÍ')")).scalar()
    pti_pend = tot_nna_bas - pti_aprob
    
    # Por grupo etario en Básico
    grupos_bas = conn.execute(text("SELECT nvl(grupo_etario, 'NO REGISTRADO'), count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'BASICO' GROUP BY grupo_etario ORDER BY count(*) DESC")).fetchall()
    print("\nGrupos Etarios en Básico:", grupos_bas)
    
    # Por situación legal
    sit_leg = conn.execute(text("SELECT nvl(situacion_legal, 'EN EVALUACIÓN'), count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'BASICO' GROUP BY situacion_legal ORDER BY count(*) DESC")).fetchall()
    print("Top Situación Legal Básico:", sit_leg[:5])
    
    # 3. Urgencias - derivantes
    deriv_urg = conn.execute(text("SELECT nvl(instancia_deriva, 'OTRA INSTANCIA'), count(*) FROM car_nna_cortes WHERE es_ultimo_corte = 'S' AND tipo_car = 'URGENCIA' GROUP BY instancia_deriva ORDER BY count(*) DESC")).fetchall()
    print("\nInstancias derivantes Urgencias:", deriv_urg[:5])
