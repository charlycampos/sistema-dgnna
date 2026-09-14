import json
from infrastructure.db.models import Plantilla, Seccion

PLANTILLAS=(
 {"codigo":"SERV_NNA","nombre":"Ayuda Memoria de Servicios NNA (Nacional)","tipoAmbito":"NACIONAL","direccionDuena":"MULTIDIRECCIONAL","secciones":[("Resumen ejecutivo","TEXTO"),("Cobertura de servicios","TABLA_DATOS")]},
 {"codigo":"REGIONAL","nombre":"Ayuda Memoria Regional","tipoAmbito":"REGIONAL","direccionDuena":"MULTIDIRECCIONAL","secciones":[("Resumen ejecutivo y cobertura territorial","TEXTO"),("Directorio regional de servicios","TABLA_DATOS")]},
 {"codigo":"CASO_SENSIBLE","nombre":"Estado situacional de caso sensible","tipoAmbito":"ESPECIFICO","direccionDuena":"DPE","secciones":[("Datos de ocurrencia","TEXTO"),("Resumen sucinto de hechos","TEXTO"),("Bitácora","BITACORA")]},
 {"codigo":"HITO_TEMATICO","nombre":"Hito, intervención o asamblea especial","tipoAmbito":"ESPECIFICO","direccionDuena":"MULTIDIRECCIONAL","secciones":[("Antecedentes y objetivos","TEXTO"),("Acuerdos y compromisos","TABLA_DATOS"),("Conclusiones y recomendaciones","CONCLUSIONES")]},
)
def sembrar(db):
    creadas=0
    for item in PLANTILLAS:
        if db.query(Plantilla).filter_by(codigo=item["codigo"]).first(): continue
        p=Plantilla(
            codigo=item["codigo"],
            nombre=item["nombre"],
            tipoAmbito=item["tipoAmbito"],
            direccionDuena=item["direccionDuena"],
            esOficial=True,
            version="1.0",
            estadoPlantilla="VIGENTE",
            creadoPor="Sistema DGNNA"
        )
        db.add(p); db.flush()
        for orden,(titulo,tipo) in enumerate(item["secciones"],1):
            config=json.dumps([{"Columna_1":"","Columna_2":""}]) if tipo=="TABLA_DATOS" else None
            db.add(Seccion(plantillaId=p.id,orden=orden,titulo=titulo,tipoSeccion=tipo,configuracionJson=config))
        creadas+=1
    db.commit(); return creadas
