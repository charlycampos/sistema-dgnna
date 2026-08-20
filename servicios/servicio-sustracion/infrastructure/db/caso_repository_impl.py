import json
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from domain.entities.caso_sustracion import CasoSustracion, BitacoraSustracion, HistorialJudicial, NnaSustracion, ProcesoOperativoSustracion
from domain.ports.caso_repository import CasoRepository
from infrastructure.db.models import CasoSustracionModel, BitacoraSustracionModel, HistorialJudicialModel, NnaSustracionModel, ProcesoOperativoSustracionModel


class CasoRepositoryImpl(CasoRepository):

    def __init__(self, db: Session):
        self._db = db

    def _q(self):
        return self._db.query(CasoSustracionModel).options(
            selectinload(CasoSustracionModel.bitacora),
            selectinload(CasoSustracionModel.historialJudicial),
            selectinload(CasoSustracionModel.nna),
            selectinload(CasoSustracionModel.procesoOperativo),
        )

    def listar(self, estado=None, profesional=None, pais=None, q=None) -> List[CasoSustracion]:
        query = self._q()
        if estado:      query = query.filter(CasoSustracionModel.estado == estado)
        if profesional: query = query.filter(CasoSustracionModel.profesional == profesional)
        if pais:        query = query.filter(CasoSustracionModel.pais == pais)
        if q:
            like = f"%{q}%"
            query = query.filter(
                CasoSustracionModel.nnaNombre.ilike(like) |
                CasoSustracionModel.nna.any(
                    NnaSustracionModel.nombres.ilike(like) |
                    NnaSustracionModel.primerApellido.ilike(like) |
                    NnaSustracionModel.segundoApellido.ilike(like)
                ) |
                CasoSustracionModel.codigo.ilike(like)
            )
        return [self._to_entity(m) for m in query.order_by(CasoSustracionModel.createdAt.desc()).all()]

    def obtener_por_id(self, id: str) -> Optional[CasoSustracion]:
        m = self._q().filter(CasoSustracionModel.id == id).first()
        return self._to_entity(m) if m else None

    def obtener_por_codigo(self, codigo: str) -> Optional[CasoSustracion]:
        m = self._db.query(CasoSustracionModel).filter(func.upper(CasoSustracionModel.codigo) == codigo.strip().upper()).first()
        return self._to_entity(m) if m else None

    def guardar(self, caso: CasoSustracion) -> CasoSustracion:
        model = self._to_model(caso)
        self._db.add(model)
        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e
        return self._to_entity(model)

    def actualizar(self, caso: CasoSustracion) -> CasoSustracion:
        model = self._db.query(CasoSustracionModel).filter(CasoSustracionModel.id == caso.id).first()
        relaciones = ('bitacora', 'historialJudicial', 'nna', 'procesoOperativo', 'id')
        campos = [c for c in vars(caso) if not c.startswith('_') and c not in relaciones]
        for campo in campos:
            if hasattr(model, campo):
                setattr(model, campo, getattr(caso, campo))
        try:
            self._db.commit()
            self._db.refresh(model)
        except Exception as e:
            self._db.rollback()
            raise e
        return self._to_entity(self._q().filter(CasoSustracionModel.id == caso.id).first())

    def eliminar(self, id: str) -> bool:
        m = self._db.query(CasoSustracionModel).filter(CasoSustracionModel.id == id).first()
        if not m: return False
        self._db.delete(m)
        self._db.commit()
        return True

    def agregar_nna(self, nna: NnaSustracion) -> NnaSustracion:
        m = NnaSustracionModel(id=nna.id, casoId=nna.casoId, nombres=nna.nombres, primerApellido=nna.primerApellido,
            segundoApellido=nna.segundoApellido, sexo=nna.sexo, fechaNacimiento=nna.fechaNacimiento,
            edad=nna.edad, tipoEdad=nna.tipoEdad)
        self._db.add(m); self._db.commit(); self._db.refresh(m)
        return self._to_nna(m)

    def actualizar_nna(self, nna: NnaSustracion) -> Optional[NnaSustracion]:
        m = self._db.query(NnaSustracionModel).filter(NnaSustracionModel.id == nna.id, NnaSustracionModel.casoId == nna.casoId).first()
        if not m: return None
        for campo in ('nombres', 'primerApellido', 'segundoApellido', 'sexo', 'fechaNacimiento', 'edad', 'tipoEdad'):
            setattr(m, campo, getattr(nna, campo))
        self._db.commit(); self._db.refresh(m)
        return self._to_nna(m)

    def eliminar_nna(self, caso_id: str, nna_id: str) -> bool:
        m = self._db.query(NnaSustracionModel).filter(NnaSustracionModel.id == nna_id, NnaSustracionModel.casoId == caso_id).first()
        if not m: return False
        self._db.delete(m); self._db.commit(); return True

    def obtener_proceso(self, caso_id: str) -> Optional[ProcesoOperativoSustracion]:
        model = self._db.query(ProcesoOperativoSustracionModel).filter(ProcesoOperativoSustracionModel.casoId == caso_id).first()
        return self._to_proceso(model) if model else None

    def guardar_proceso(self, proceso: ProcesoOperativoSustracion) -> ProcesoOperativoSustracion:
        model = self._db.query(ProcesoOperativoSustracionModel).filter(ProcesoOperativoSustracionModel.casoId == proceso.casoId).first()
        if not model:
            model = ProcesoOperativoSustracionModel(casoId=proceso.casoId, requisitosJson="[]")
            self._db.add(model)
        for campo, valor in vars(proceso).items():
            if campo in ("casoId", "requisitos", "updatedAt"):
                continue
            if hasattr(model, campo):
                setattr(model, campo, valor)
        model.requisitosJson = json.dumps(proceso.requisitos, ensure_ascii=False)
        model.updatedAt = proceso.updatedAt
        self._db.commit()
        self._db.refresh(model)
        return self._to_proceso(model)

    def agregar_bitacora(self, entrada: BitacoraSustracion) -> BitacoraSustracion:
        m = BitacoraSustracionModel(id=entrada.id, casoId=entrada.casoId, fecha=entrada.fecha, texto=entrada.texto, creadoPor=entrada.creadoPor)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return BitacoraSustracion(id=m.id, casoId=m.casoId, fecha=m.fecha, texto=m.texto, creadoPor=m.creadoPor, createdAt=m.createdAt)

    def eliminar_bitacora(self, caso_id: str, entrada_id: str) -> bool:
        m = self._db.query(BitacoraSustracionModel).filter(BitacoraSustracionModel.id == entrada_id, BitacoraSustracionModel.casoId == caso_id).first()
        if not m: return False
        self._db.delete(m)
        self._db.commit()
        return True

    def agregar_historial(self, entrada: HistorialJudicial) -> HistorialJudicial:
        m = HistorialJudicialModel(id=entrada.id, casoId=entrada.casoId, etapa=entrada.etapa, fecha=entrada.fecha, descripcion=entrada.descripcion, creadoPor=entrada.creadoPor)
        self._db.add(m)
        self._db.commit()
        self._db.refresh(m)
        return HistorialJudicial(id=m.id, casoId=m.casoId, etapa=m.etapa, fecha=m.fecha, descripcion=m.descripcion, creadoPor=m.creadoPor, createdAt=m.createdAt)

    def eliminar_historial(self, caso_id: str, entrada_id: str) -> bool:
        m = self._db.query(HistorialJudicialModel).filter(HistorialJudicialModel.id == entrada_id, HistorialJudicialModel.casoId == caso_id).first()
        if not m: return False
        self._db.delete(m)
        self._db.commit()
        return True

    def ultimo_historial(self, caso_id: str) -> Optional[HistorialJudicial]:
        m = self._db.query(HistorialJudicialModel).filter(HistorialJudicialModel.casoId == caso_id).order_by(HistorialJudicialModel.fecha.desc(), HistorialJudicialModel.createdAt.desc()).first()
        if not m: return None
        return HistorialJudicial(id=m.id, casoId=m.casoId, etapa=m.etapa, fecha=m.fecha, descripcion=m.descripcion, creadoPor=m.creadoPor, createdAt=m.createdAt)

    @staticmethod
    def _to_entity(m: CasoSustracionModel) -> CasoSustracion:
        caso = CasoSustracion(
            id=m.id, codigo=m.codigo,
            nnaNombres=m.nnaNombre or '',
            nnaPrimerApellido=None,
            nnaSegundoApellido=None,
            nnaSexo=m.nnaSexo,
            nnaEdad=m.nnaEdad, nnaTipoEdad=m.nnaTipoEdad, nnaFechaNac=m.nnaFechaNac,
            pais=m.pais, etapa=m.etapa, tipoSolicitud=m.tipoSolicitud, acPeru=m.acPeru,
            fechaIngreso=m.fechaIngreso, fechaSalida=m.fechaSalida,
            solicitanteNombre=m.solicitanteNombre, solicitanteSexo=m.solicitanteSexo,
            solicitanteTelefono=m.solicitanteTelefono, solicitanteCorreo=m.solicitanteCorreo,
            solicitanteDomicilio=m.solicitanteDomicilio, requeridoNombre=m.requeridoNombre,
            requeridoSexo=m.requeridoSexo, requeridoTelefono=m.requeridoTelefono,
            requeridoCorreo=m.requeridoCorreo, requeridoDomicilio=m.requeridoDomicilio,
            profesional=m.profesional, estado=m.estado, fechaEntrevista=m.fechaEntrevista,
            resultadoEntrevista=m.resultadoEntrevista, estadoJudicial=m.estadoJudicial,
            fechaDemanda=m.fechaDemanda, numExpedienteJudicial=m.numExpedienteJudicial,
            juzgado=m.juzgado, sentencia1ra=m.sentencia1ra, sentencia2da=m.sentencia2da,
            casacion=m.casacion, motivoCierre=m.motivoCierre, retorno=m.retorno,
            observaciones=m.observaciones, creadoPor=m.creadoPor,
            createdAt=m.createdAt, updatedAt=m.updatedAt,
        )
        caso.bitacora = [BitacoraSustracion(id=b.id, casoId=b.casoId, fecha=b.fecha, texto=b.texto, creadoPor=b.creadoPor, createdAt=b.createdAt) for b in m.bitacora]
        caso.historialJudicial = [HistorialJudicial(id=h.id, casoId=h.casoId, etapa=h.etapa, fecha=h.fecha, descripcion=h.descripcion, creadoPor=h.creadoPor, createdAt=h.createdAt) for h in m.historialJudicial]
        caso.nna = [CasoRepositoryImpl._to_nna(n) for n in m.nna]
        caso.procesoOperativo = CasoRepositoryImpl._to_proceso(m.procesoOperativo) if m.procesoOperativo else None
        return caso

    @staticmethod
    def _to_nna(m: NnaSustracionModel) -> NnaSustracion:
        return NnaSustracion(id=m.id, casoId=m.casoId, nombres=m.nombres, primerApellido=m.primerApellido,
            segundoApellido=m.segundoApellido, sexo=m.sexo, fechaNacimiento=m.fechaNacimiento,
            edad=m.edad, tipoEdad=m.tipoEdad, createdAt=m.createdAt)

    @staticmethod
    def _to_proceso(m: ProcesoOperativoSustracionModel) -> ProcesoOperativoSustracion:
        campos = [
            "faseOperativa", "evaluacionResultado", "fechaObservacion", "fechaNotificacion",
            "fechaLimiteSubsanacion", "ampliacionSubsanacion", "fechaRespuestaSubsanacion",
            "resultadoSubsanacion", "detalleSubsanacion", "destinatarioGestion", "tipoComunicacion",
            "fechaEnvio", "referenciaSgd", "respuestaEsperada", "proximaAccion", "fechaLimite",
            "respuestaRecibida", "estadoCooperacion", "estadoRetornoVoluntario", "propuestaRetorno",
            "fechaPrevistaRetorno", "compromisosRetorno", "fechaAcuerdo", "fechaLimitePasajes",
            "pasajesRecibidos", "fechaRetornoEfectivo", "updatedAt",
        ]
        try:
            requisitos = json.loads(m.requisitosJson or "[]")
        except (TypeError, ValueError):
            requisitos = []
        return ProcesoOperativoSustracion(
            casoId=m.casoId,
            requisitos=requisitos,
            **{campo: getattr(m, campo) for campo in campos},
        )

    @staticmethod
    def _to_model(e: CasoSustracion) -> CasoSustracionModel:
        return CasoSustracionModel(
            id=e.id, codigo=e.codigo,
            nnaNombre=" ".join(filter(None, (e.nnaNombres, e.nnaPrimerApellido, e.nnaSegundoApellido))),
            nnaSexo=e.nnaSexo,
            nnaEdad=e.nnaEdad, nnaTipoEdad=e.nnaTipoEdad, nnaFechaNac=e.nnaFechaNac,
            pais=e.pais, etapa=e.etapa, tipoSolicitud=e.tipoSolicitud, acPeru=e.acPeru,
            fechaIngreso=e.fechaIngreso, fechaSalida=e.fechaSalida,
            solicitanteNombre=e.solicitanteNombre, solicitanteSexo=e.solicitanteSexo,
            solicitanteTelefono=e.solicitanteTelefono, solicitanteCorreo=e.solicitanteCorreo,
            solicitanteDomicilio=e.solicitanteDomicilio, requeridoNombre=e.requeridoNombre,
            requeridoSexo=e.requeridoSexo, requeridoTelefono=e.requeridoTelefono,
            requeridoCorreo=e.requeridoCorreo, requeridoDomicilio=e.requeridoDomicilio,
            profesional=e.profesional, estado=e.estado, fechaEntrevista=e.fechaEntrevista,
            resultadoEntrevista=e.resultadoEntrevista, estadoJudicial=e.estadoJudicial,
            fechaDemanda=e.fechaDemanda, numExpedienteJudicial=e.numExpedienteJudicial,
            juzgado=e.juzgado, sentencia1ra=e.sentencia1ra, sentencia2da=e.sentencia2da,
            casacion=e.casacion, motivoCierre=e.motivoCierre, retorno=e.retorno,
            observaciones=e.observaciones, creadoPor=e.creadoPor,
        )
