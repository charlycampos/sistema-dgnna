from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from domain.entities.caso_sustracion import CasoSustracion, BitacoraSustracion, HistorialJudicial
from domain.ports.caso_repository import CasoRepository
from infrastructure.db.models import CasoSustracionModel, BitacoraSustracionModel, HistorialJudicialModel


class CasoRepositoryImpl(CasoRepository):

    def __init__(self, db: Session):
        self._db = db

    def _q(self):
        return self._db.query(CasoSustracionModel).options(
            selectinload(CasoSustracionModel.bitacora),
            selectinload(CasoSustracionModel.historialJudicial),
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
                CasoSustracionModel.codigo.ilike(like)
            )
        return [self._to_entity(m) for m in query.order_by(CasoSustracionModel.createdAt.desc()).all()]

    def obtener_por_id(self, id: str) -> Optional[CasoSustracion]:
        m = self._q().filter(CasoSustracionModel.id == id).first()
        return self._to_entity(m) if m else None

    def obtener_por_codigo(self, codigo: str) -> Optional[CasoSustracion]:
        m = self._db.query(CasoSustracionModel).filter(CasoSustracionModel.codigo == codigo).first()
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
        campos = [c for c in vars(caso) if not c.startswith('_') and c not in ('bitacora', 'historialJudicial', 'id')]
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
            id=m.id, codigo=m.codigo, nnaNombre=m.nnaNombre, nnaSexo=m.nnaSexo,
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
        return caso

    @staticmethod
    def _to_model(e: CasoSustracion) -> CasoSustracionModel:
        return CasoSustracionModel(
            id=e.id, codigo=e.codigo, nnaNombre=e.nnaNombre, nnaSexo=e.nnaSexo,
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
