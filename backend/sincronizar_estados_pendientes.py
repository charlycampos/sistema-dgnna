"""
Script de Auditoría y Sincronización Normativa de Estados del Expediente
Directiva N.° 006-2021-MIMP / Convenio de La Haya de 1980

Este script audita todos los expedientes en la base de datos y sincroniza
su estado conforme a la regla normativa:
  - Casos cerrados (fechaSalida, motivoCierre, etapa Cierre o estado Archivado) -> 'Archivado'
  - Casos en evaluación inicial sin calificar (Paso 1) -> 'Pendiente'
  - Casos calificados o derivados a subsanación, retorno o proceso judicial (Pasos 2, 3, 4) -> 'Tramite'
"""
import sys
import os

# Asegurar que el path incluya el directorio backend
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import SessionLocal
from models import CasoSustracion

def sincronizar_estados():
    db = SessionLocal()
    try:
        casos = db.query(CasoSustracion).all()
        print("=" * 80)
        print(f"AUDITORÍA Y SINCRONIZACIÓN DE ESTADOS — TOTAL CASOS: {len(casos)}")
        print("=" * 80)
        
        actualizados = 0
        reporte = []

        for c in casos:
            estado_anterior = c.estado or "Tramite"
            
            # Evaluación de condiciones normativas
            es_cerrado = (
                estado_anterior == "Archivado" or
                bool(c.fechaSalida) or
                bool(c.motivoCierre) or
                (bool(c.etapa) and "cierre" in c.etapa.lower())
            )
            
            tiene_judicial = (
                (bool(c.etapa) and "judicial" in c.etapa.lower()) or
                (bool(c.estadoJudicial) and c.estadoJudicial.strip() not in ("Sin demanda", "None", "", "Sin proceso")) or
                bool(c.fechaDemanda) or
                bool(c.numExpedienteJudicial)
            )
            
            tiene_retorno_o_entrevista = (
                (bool(c.resultadoEntrevista) and c.resultadoEntrevista.strip() not in ("Pendiente", "None", "", "No aplica")) or
                bool(c.fechaEntrevista) or
                (bool(c.retorno) and c.retorno.strip() not in ("Pendiente", "None", "", "No aplica"))
            )

            # Determinación de nuevo estado normativo
            if es_cerrado:
                nuevo_estado = "Archivado"
                paso_estimado = "Paso 5: Cierre / Archivo"
            elif tiene_judicial:
                nuevo_estado = "Tramite"
                paso_estimado = "Paso 4: Proceso Judicial"
            elif tiene_retorno_o_entrevista:
                nuevo_estado = "Tramite"
                paso_estimado = "Paso 3: Retorno Voluntario / Gestión Internacional"
            else:
                # Caso en evaluación inicial de admisibilidad (Paso 1)
                nuevo_estado = "Pendiente"
                paso_estimado = "Paso 1: Evaluación Inicial de Admisibilidad"

            cambio = estado_anterior != nuevo_estado
            if cambio:
                c.estado = nuevo_estado
                actualizados += 1

            reporte.append({
                "codigo": c.codigo,
                "nna": c.nnaNombre or "Sin nombre",
                "paso": paso_estimado,
                "estado_anterior": estado_anterior,
                "estado_nuevo": nuevo_estado,
                "cambio": cambio,
            })

        db.commit()

        print(f"\n{'CÓDIGO':<15} | {'NNA':<25} | {'FASE/PASO':<35} | {'ANTES':<10} -> {'DESPUÉS':<10} | {'STATUS'}")
        print("-" * 115)
        for r in reporte:
            status_str = "MODIFICADO" if r["cambio"] else "CONFORME"
            print(f"{r['codigo']:<15} | {r['nna'][:23]:<25} | {r['paso'][:33]:<35} | {r['estado_anterior']:<10} -> {r['estado_nuevo']:<10} | {status_str}")

        print("-" * 115)
        print(f"\nResumen: {len(casos)} expedientes auditados, {actualizados} actualizados con éxito.")
        
        # Conteo final por estados
        pendientes = sum(1 for r in reporte if r["estado_nuevo"] == "Pendiente")
        tramite = sum(1 for r in reporte if r["estado_nuevo"] == "Tramite")
        archivados = sum(1 for r in reporte if r["estado_nuevo"] == "Archivado")
        print(f"Distribución final: Pendientes={pendientes} | En trámite={tramite} | Archivados={archivados}")

    except Exception as e:
        db.rollback()
        print(f"Error durante la sincronización: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    sincronizar_estados()
