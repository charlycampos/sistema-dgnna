"""
Seed inicial del módulo Mapa Interactivo.
Carga el catálogo UBIGEO (INEI) y las 25 UPE con su ámbito de competencia
(según el documento oficial del MIMP 'Encuentra la UPE más cercana').
Solo se ejecuta si las tablas están vacías.
"""
import json
import os

from sqlalchemy.orm import Session

from infrastructure.db.models import MapaUbigeo, MapaInstitucion, MapaCobertura

_SEED_FILE    = os.path.join(os.path.dirname(__file__), "seed_mapa.json")
_SEED_DEMUNAS = os.path.join(os.path.dirname(__file__), "seed_demunas.json")
_SEED_WARMI   = os.path.join(os.path.dirname(__file__), "seed_warmi.json")


def ejecutar_seed(db: Session) -> None:
    with open(_SEED_FILE, encoding="utf-8") as f:
        data = json.load(f)

    # ── Catálogo UBIGEO (agrega los códigos que falten) ──────────
    existentes = {c[0] for c in db.query(MapaUbigeo.codigo).all()}
    faltantes = [u for u in data["ubigeo"] if u["codigo"] not in existentes]
    if faltantes:
        db.bulk_save_objects([
            MapaUbigeo(
                codigo=u["codigo"],
                departamento=u["departamento"],
                provincia=u["provincia"],
                distrito=u["distrito"],
                nombre=u["nombre"],
            )
            for u in faltantes
        ])
        db.commit()
        print(f"[seed] Catálogo UBIGEO: {len(faltantes)} registros agregados")

    # ── Instituciones UPE + cobertura ─────────────────────────────
    if db.query(MapaInstitucion).count() == 0:
        total_cob = 0
        for i in data["instituciones"]:
            inst = MapaInstitucion(
                nombre=i["nombre"],
                tipo=i["tipo"],
                direccion=i["direccion"],
                departamento=i["departamento"],
                telefono=i.get("telefono"),
                horario=i.get("horario"),
                lat=i.get("lat"),
                lng=i.get("lng"),
                estado="activo",
                creadoPor="seed-mimp",
            )
            db.add(inst)
            db.flush()
            db.bulk_save_objects([
                MapaCobertura(institucionId=inst.id, ubigeo=u)
                for u in i["cobertura"]
            ])
            total_cob += len(i["cobertura"])
        db.commit()
        print(f"[seed] {len(data['instituciones'])} UPE cargadas, {total_cob} distritos de cobertura")

    # ── DEMUNAs (padrón MIMP) ─────────────────────────────────────
    if (os.path.exists(_SEED_DEMUNAS)
            and db.query(MapaInstitucion).filter(MapaInstitucion.tipo == "DEMUNA").count() == 0):
        with open(_SEED_DEMUNAS, encoding="utf-8") as f:
            demunas = json.load(f)["instituciones"]
        for i in demunas:
            inst = MapaInstitucion(
                nombre=i["nombre"],
                tipo="DEMUNA",
                direccion=i.get("direccion"),
                departamento=i.get("departamento"),
                telefono=i.get("telefono"),
                horario=i.get("horario"),
                estado=i.get("estado", "activo"),
                acreditacion=i.get("acreditacion"),
                creadoPor="seed-demuna",
            )
            db.add(inst)
            db.flush()
            db.bulk_save_objects([
                MapaCobertura(institucionId=inst.id, ubigeo=u)
                for u in i["cobertura"]
            ])
        db.commit()
        print(f"[seed] {len(demunas)} DEMUNAs cargadas")

    # ── Servicios Warmi Ñan: CEM, HRT, SAU, SAR, CAI, PIAS ────────
    _TIPOS_WARMI = ("CEM", "HRT", "SAU", "SAR", "CAI", "PIAS")
    if (os.path.exists(_SEED_WARMI)
            and db.query(MapaInstitucion).filter(MapaInstitucion.tipo.in_(_TIPOS_WARMI)).count() == 0):
        with open(_SEED_WARMI, encoding="utf-8") as f:
            servicios = json.load(f)["instituciones"]
        for i in servicios:
            inst = MapaInstitucion(
                nombre=i["nombre"],
                tipo=i["tipo"],
                direccion=i.get("direccion"),
                departamento=i.get("departamento"),
                telefono=i.get("telefono"),
                horario=i.get("horario"),
                lat=i.get("lat"),
                lng=i.get("lng"),
                estado=i.get("estado", "activo"),
                creadoPor="seed-warmi",
            )
            db.add(inst)
            db.flush()
            db.bulk_save_objects([
                MapaCobertura(institucionId=inst.id, ubigeo=u)
                for u in i["cobertura"]
            ])
        db.commit()
        print(f"[seed] {len(servicios)} servicios Warmi Ñan cargados (CEM/HRT/SAU/SAR/CAI/PIAS)")
