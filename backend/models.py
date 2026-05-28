"""
Modelos SQLAlchemy — equivalentes al schema Prisma del proyecto Next.js.
Compatibles con SQLite (desarrollo) y Oracle (producción).
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


def new_id() -> str:
    """Genera un ID tipo cuid compatible (uuid4 sin guiones)."""
    return str(uuid.uuid4())


class Abogado(Base):
    __tablename__ = "abogados"

    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(200), nullable=False)
    activo    = Column(Boolean, default=True)
    createdAt = Column("CREATEDAT", DateTime, default=datetime.utcnow)
    updatedAt = Column("UPDATEDAT", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apelaciones = relationship("Apelacion", back_populates="abogado")


class Revisor(Base):
    __tablename__ = "revisores"

    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(200), nullable=False)
    activo    = Column(Boolean, default=True)
    createdAt = Column("CREATEDAT", DateTime, default=datetime.utcnow)
    updatedAt = Column("UPDATEDAT", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apelaciones = relationship("Apelacion", back_populates="revisor")


class ComplejidadJuridica(Base):
    __tablename__ = "complejidades_juridicas"

    id     = Column(String(36), primary_key=True, default=new_id)
    nombre = Column(String(100), nullable=False, unique=True)
    puntos = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True)

    apelaciones = relationship("Apelacion", back_populates="complejidad")


class ExtensionRango(Base):
    __tablename__ = "extension_rangos"

    id          = Column(String(36), primary_key=True, default=new_id)
    descripcion = Column(String(100), nullable=False)   # "1 - 500", etc.
    minFolios   = Column(Integer, nullable=False)
    maxFolios   = Column(Integer, nullable=True)         # None = sin límite
    puntos      = Column(Integer, nullable=False)
    activo      = Column(Boolean, default=True)


class Apelacion(Base):
    __tablename__ = "apelaciones"

    id                = Column(String(36), primary_key=True, default=new_id)
    numeroExpediente  = Column("NUMEROEXPEDIENTE", String(100), nullable=False)
    fechaIngreso      = Column("FECHAINGRESO", DateTime, nullable=False)
    fechaIngresoMIMP  = Column("FECHAINGRESOMIMP", DateTime, nullable=True)
    plazoVencimiento  = Column("PLAZOVENCIMIENTO", DateTime, nullable=True)
    apelante          = Column(String(300), nullable=False)
    nnaCar            = Column("NNACAR", String(300), nullable=True)
    procedencia       = Column(String(200), nullable=False)
    documento         = Column(String(300), nullable=False)
    asunto            = Column(String(500), nullable=False)
    folios            = Column(Integer, nullable=False)
    puntosExtension   = Column("PUNTOSEXTENSION", Integer, nullable=False)
    complejidadId     = Column("COMPLEJIDADID", String(36), ForeignKey("complejidades_juridicas.id"), nullable=False)
    puntosComplejidad = Column("PUNTOSCOMPLEJIDAD", Integer, nullable=False)
    puntosTotal       = Column("PUNTOSTOTAL", Integer, nullable=False)
    abogadoId         = Column("ABOGADOID", String(36), ForeignKey("abogados.id"), nullable=False)
    revisorId         = Column("REVISORID", String(36), ForeignKey("revisores.id"), nullable=True)
    fechaRevisor      = Column("FECHAREVISOR", DateTime, nullable=True)
    fechaAsignacion   = Column("FECHAASIGNACION", DateTime, nullable=False)
    estado            = Column(String(20), default="Pendiente")  # Pendiente | Resuelto | Atendido
    numeroResolucion  = Column("NUMERORESOLUCION", String(200), nullable=True)
    documentoAtencion = Column("DOCUMENTOATENCION", String(200), nullable=True)
    cargos            = Column(String(200), nullable=True)
    observaciones     = Column(String(1000), nullable=True)
    createdAt         = Column("CREATEDAT", DateTime, default=datetime.utcnow)
    updatedAt         = Column("UPDATEDAT", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    abogado     = relationship("Abogado", back_populates="apelaciones")
    revisor     = relationship("Revisor", back_populates="apelaciones")
    complejidad = relationship("ComplejidadJuridica", back_populates="apelaciones")


class Usuario(Base):
    __tablename__ = "usuarios"

    id           = Column(String(36), primary_key=True, default=new_id)
    nombre       = Column(String(200), nullable=False)
    email        = Column(String(200), nullable=False, unique=True)
    passwordHash = Column(String(200), nullable=False)
    rol          = Column(String(20), default="usuario")  # admin | usuario
    activo       = Column(Boolean, default=True)
    createdAt    = Column(DateTime, default=datetime.utcnow)
    updatedAt    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    modulos = relationship("UsuarioModulo", back_populates="usuario", cascade="all, delete-orphan")


class UsuarioModulo(Base):
    __tablename__ = "usuario_modulos"

    id        = Column(String(36), primary_key=True, default=new_id)
    usuarioId = Column(String(36), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    modulo    = Column(String(50), nullable=False)    # apelaciones | sustraccion | fortalecimiento
    rolModulo = Column(String(50), nullable=False)    # registrador | directora

    usuario = relationship("Usuario", back_populates="modulos")

    __table_args__ = (
        UniqueConstraint("usuarioId", "modulo", name="uq_usuario_modulo"),
    )


class ReservaSala(Base):
    __tablename__ = "reservas_sala"

    id          = Column(String(36), primary_key=True, default=new_id)
    fecha       = Column(String(10), nullable=False)   # YYYY-MM-DD
    titulo      = Column(String(200), nullable=False)  # nombre del responsable / evento
    horaInicio  = Column(String(5), nullable=False)    # HH:MM
    horaFin     = Column(String(5), nullable=False)    # HH:MM
    categoria   = Column(String(100), nullable=False)  # para asignar color
    estado      = Column(String(20), default="Programado")  # Programado | Realizado | Cancelado | Reprogramado
    descripcion = Column(String(500), nullable=True)
    creadoPor   = Column(String(200), nullable=True)   # nombre del usuario que registró
    createdAt   = Column(DateTime, default=datetime.utcnow)
    updatedAt   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CasoSustracion(Base):
    __tablename__ = "casos_sustracion"

    id                   = Column("ID", String(36), primary_key=True, default=new_id)
    codigo               = Column("CODIGO", String(20), nullable=False, unique=True)   # HOJA_TRAMITE
    # ── NNA ──────────────────────────────────────────────────────────
    nnaNombre            = Column("nnaNombre", String(300), nullable=False)  # NOMBRES + APELLIDOS
    nnaSexo              = Column("nnasexo", String(10), nullable=True)    # Hombre | Mujer
    nnaEdad              = Column("nnaedad", String(10), nullable=True)    # valor numérico
    nnaTipoEdad          = Column("nnatipoedad", String(10), nullable=True)    # Años | Meses | Días
    nnaFechaNac          = Column("nnaFechaNac", String(10), nullable=True)    # YYYY-MM-DD (opcional)
    # ── Trámite ──────────────────────────────────────────────────────
    pais                 = Column("PAIS", String(100), nullable=False)  # PAIS_CONTRAPARTE
    etapa                = Column("etapa", String(20), nullable=True)    # Administrativo | Judicial
    tipoSolicitud        = Column("tiposolicitud", String(50), nullable=True)    # Restitución | Régimen de Visitas
    acPeru               = Column("acperu", String(20), nullable=True)    # Requirente | Requerida
    fechaIngreso         = Column("fechaIngreso", String(10), nullable=False)   # YYYY-MM-DD
    fechaSalida          = Column("fechaSalida", String(10), nullable=True)    # YYYY-MM-DD
    # ── Solicitante ──────────────────────────────────────────────────
    solicitanteNombre    = Column("solicitanteNombre", String(300), nullable=True)
    solicitanteSexo      = Column("solicitantesexo", String(10), nullable=True)    # Hombre | Mujer
    solicitanteTelefono  = Column("solicitanteTelefono", String(50), nullable=True)
    solicitanteCorreo    = Column("solicitantecorreo", String(200), nullable=True)
    solicitanteDomicilio = Column("solicitanteDomicilio", String(500), nullable=True)
    # ── Requerido ────────────────────────────────────────────────────
    requeridoNombre      = Column("requeridoNombre", String(300), nullable=True)
    requeridoSexo        = Column("requeridosexo", String(10), nullable=True)    # Hombre | Mujer
    requeridoTelefono    = Column("requeridotelefono", String(50), nullable=True)
    requeridoCorreo      = Column("requeridocorreo", String(200), nullable=True)
    requeridoDomicilio   = Column("requeridoDomicilio", String(500), nullable=True)
    # ── Gestión y seguimiento ─────────────────────────────────────────
    profesional          = Column("PROFESIONAL", String(100), nullable=True)   # EMMA | JANNY | CECILIA
    estado               = Column("ESTADO", String(20), default="Tramite") # Tramite | Pendiente | Archivado
    fechaEntrevista      = Column("fechaentrevista", String(10), nullable=True)    # YYYY-MM-DD
    resultadoEntrevista  = Column("resultadoentrevista", String(20), nullable=True)    # Favorable | Desfavorable | Pendiente | No aplica
    # ── Proceso judicial ─────────────────────────────────────────────
    estadoJudicial       = Column("estadoJudicial", String(100), nullable=True)   # Sin demanda | ... | Ejecución
    fechaDemanda         = Column("fechademanda", String(10), nullable=True)    # YYYY-MM-DD
    numExpedienteJudicial= Column("numexpedientejudicial", String(100), nullable=True)
    juzgado              = Column("juzgado", String(300), nullable=True)
    sentencia1ra         = Column("sentencia1ra", String(300), nullable=True)
    sentencia2da         = Column("sentencia2da", String(300), nullable=True)
    casacion             = Column("casacion", String(300), nullable=True)
    # ── Cierre ───────────────────────────────────────────────────────
    motivoCierre         = Column("motivoCierre", String(200), nullable=True)
    retorno              = Column("retorno", String(20), nullable=True)    # SI | NO | Pendiente | No aplica
    # ── General ──────────────────────────────────────────────────────
    observaciones        = Column("OBSERVACIONES", String(1000), nullable=True)
    creadoPor            = Column("creadoPor", String(200), nullable=True)
    createdAt            = Column("createdAt", DateTime, default=datetime.utcnow)
    updatedAt            = Column("updatedAt", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bitacora = relationship("BitacoraSustracion", back_populates="caso",
                            cascade="all, delete-orphan",
                            order_by="BitacoraSustracion.fecha")

    historialJudicial = relationship("HistorialJudicial", back_populates="caso",
                                     cascade="all, delete-orphan",
                                     order_by="HistorialJudicial.fecha")


class BitacoraSustracion(Base):
    __tablename__ = "bitacora_sustracion"

    id        = Column("id", String(36), primary_key=True, default=new_id)
    casoId    = Column("casoId", String(36), ForeignKey("casos_sustracion.ID", ondelete="CASCADE"), nullable=False)
    fecha     = Column("fecha", String(10), nullable=False)    # YYYY-MM-DD
    texto     = Column("texto", String(2000), nullable=False)
    creadoPor = Column("creadoPor", String(200), nullable=True)
    createdAt = Column("createdAt", DateTime, default=datetime.utcnow)

    caso = relationship("CasoSustracion", back_populates="bitacora")


class HistorialJudicial(Base):
    __tablename__ = "historial_judicial"

    id          = Column("id", String(36), primary_key=True, default=new_id)
    casoId      = Column("casoId", String(36), ForeignKey("casos_sustracion.ID", ondelete="CASCADE"), nullable=False)
    etapa       = Column("etapa", String(100), nullable=False)   # etapa del proceso
    fecha       = Column("fecha", String(10), nullable=False)    # YYYY-MM-DD
    descripcion = Column("descripcion", String(2000), nullable=True)
    creadoPor   = Column("creadoPor", String(200), nullable=True)
    createdAt   = Column("createdAt", DateTime, default=datetime.utcnow)

    caso = relationship("CasoSustracion", back_populates="historialJudicial")


# ─────────────────────────────────────────────────────────────────────────────
#  MÓDULO LEY DE TRANSPARENCIA
# ─────────────────────────────────────────────────────────────────────────────

TR_SCHEMA = "TRANSPARENCIA_DB"


class Transparencia(Base):
    """
    Pedidos de información recibidos por la DGNNA en virtud de la
    Ley de Transparencia y Acceso a la Información Pública.
    Plazo legal de respuesta: 10 días hábiles.
    """
    __tablename__ = "transparencia"
    __table_args__ = {"schema": TR_SCHEMA}

    id                  = Column(String(36), primary_key=True, default=new_id)
    numeroExpediente    = Column("NUMEROEXPEDIENTE", String(100), nullable=False)
    fechaIngreso        = Column("FECHAINGRESO", DateTime, nullable=False)
    documentoIngreso    = Column("DOCUMENTOINGRESO", String(300), nullable=True)
    direccion           = Column("DIRECCION", String(20), nullable=False)
    estado              = Column("ESTADO", String(20), default="Pendiente")
    fechaAtencion       = Column("FECHAATENCION", DateTime, nullable=True)
    asunto              = Column("ASUNTO", String(500), nullable=False)
    documentoRespuesta  = Column("DOCUMENTORESPUESTA", String(300), nullable=True)
    categoria           = Column("CATEGORIA", String(100), nullable=True)
    plazoVencimiento    = Column("PLAZOVENCIMIENTO", DateTime, nullable=True)
    observaciones       = Column("OBSERVACIONES", String(1000), nullable=True)
    creadoPor           = Column("CREADOPOR", String(200), nullable=True)
    createdAt           = Column("CREATEDAT", DateTime, default=datetime.utcnow)
    updatedAt           = Column("UPDATEDAT", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
#  MÓDULO PROYECTOS DE LEY
# ─────────────────────────────────────────────────────────────────────────────

PL_SCHEMA = "PROYECTOS_LEY_DB"


class PlComision(Base):
    __tablename__ = "pl_comisiones"
    __table_args__ = {"schema": PL_SCHEMA}
    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(300), nullable=False, unique=True)
    activo    = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    proyectos = relationship("ProyectoLey", back_populates="comision")


class PlCongresista(Base):
    __tablename__ = "pl_congresistas"
    __table_args__ = {"schema": PL_SCHEMA}
    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(300), nullable=False, unique=True)
    partido   = Column(String(300), nullable=False)
    activo    = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    proyectos = relationship("ProyectoLey", back_populates="congresista")


class PlTipoOpinion(Base):
    __tablename__ = "pl_tipos_opinion"
    __table_args__ = {"schema": PL_SCHEMA}
    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(200), nullable=False, unique=True)
    activo    = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)


class PlDireccion(Base):
    __tablename__ = "pl_direcciones"
    __table_args__ = {"schema": PL_SCHEMA}
    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(200), nullable=False, unique=True)
    activo    = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    eventos   = relationship("PlEventoDireccion", back_populates="direccion")


class PlProfesional(Base):
    __tablename__ = "pl_profesionales"
    __table_args__ = {"schema": PL_SCHEMA}
    id        = Column(String(36), primary_key=True, default=new_id)
    nombre    = Column(String(200), nullable=False, unique=True)
    activo    = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    eventos   = relationship("PlEventoProfesional", back_populates="profesional")


class ProyectoLey(Base):
    __tablename__ = "proyectos_ley"
    __table_args__ = {"schema": PL_SCHEMA}
    id             = Column(String(36), primary_key=True, default=new_id)
    numeroPL       = Column(String(50), nullable=False)
    expediente     = Column(String(100), nullable=True)
    documento      = Column(String(300), nullable=True)
    comisionId     = Column(String(36), ForeignKey(f"{PL_SCHEMA}.pl_comisiones.id"), nullable=True)
    congresistaId  = Column(String(36), ForeignKey(f"{PL_SCHEMA}.pl_congresistas.id"), nullable=True)
    sumilla        = Column(String(1000), nullable=True)
    tema           = Column(String(200), nullable=True)
    opinion        = Column(String(200), nullable=True)
    estado         = Column(String(30), default="en_proceso")
    estadoCongreso = Column(String(100), nullable=True)
    observaciones  = Column(String(1000), nullable=True)
    creadoPor      = Column(String(200), nullable=True)
    createdAt      = Column(DateTime, default=datetime.utcnow)
    updatedAt      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    comision       = relationship("PlComision", back_populates="proyectos")
    congresista    = relationship("PlCongresista", back_populates="proyectos")
    eventos        = relationship("PlEvento", back_populates="proyectoLey",
                                  cascade="all, delete-orphan",
                                  order_by="PlEvento.fecha")


class PlEvento(Base):
    __tablename__ = "pl_eventos"
    __table_args__ = {"schema": PL_SCHEMA}
    id                   = Column(String(36), primary_key=True, default=new_id)
    proyectoLeyId        = Column(String(36), ForeignKey(f"{PL_SCHEMA}.proyectos_ley.id", ondelete="CASCADE"), nullable=False)
    tipo                 = Column(String(30), nullable=False)
    fecha                = Column(String(10), nullable=False)
    documento            = Column(String(300), nullable=True)
    expediente           = Column(String(100), nullable=True)
    observaciones        = Column(String(1000), nullable=True)
    registradoPor        = Column(String(200), nullable=True)
    fechaSalidaDireccion = Column(String(10), nullable=True)
    numeroInforme        = Column(String(100), nullable=True)
    opinionDireccion     = Column(String(200), nullable=True)
    direccionInforme     = Column(String(100), nullable=True)
    opinionFinal         = Column(String(200), nullable=True)
    fechaSalidaDGNNA     = Column(String(10), nullable=True)
    memoNota             = Column(String(200), nullable=True)
    createdAt            = Column(DateTime, default=datetime.utcnow)
    proyectoLey          = relationship("ProyectoLey", back_populates="eventos")
    direcciones          = relationship("PlEventoDireccion", back_populates="evento",
                                        cascade="all, delete-orphan")
    profesionales        = relationship("PlEventoProfesional", back_populates="evento",
                                        cascade="all, delete-orphan")


class PlEventoDireccion(Base):
    __tablename__ = "pl_evento_direcciones"
    __table_args__ = {"schema": PL_SCHEMA}
    id          = Column(String(36), primary_key=True, default=new_id)
    eventoId    = Column(String(36), ForeignKey(f"{PL_SCHEMA}.pl_eventos.id", ondelete="CASCADE"), nullable=False)
    direccionId = Column(String(36), ForeignKey(f"{PL_SCHEMA}.pl_direcciones.id"), nullable=False)
    evento      = relationship("PlEvento", back_populates="direcciones")
    direccion   = relationship("PlDireccion", back_populates="eventos")


class PlEventoProfesional(Base):
    __tablename__ = "pl_evento_profesionales"
    __table_args__ = {"schema": PL_SCHEMA}
    id            = Column(String(36), primary_key=True, default=new_id)
    eventoId      = Column(String(36), ForeignKey(f"{PL_SCHEMA}.pl_eventos.id", ondelete="CASCADE"), nullable=False)
    profesionalId = Column(String(36), ForeignKey(f"{PL_SCHEMA}.pl_profesionales.id"), nullable=False)
    evento        = relationship("PlEvento", back_populates="profesionales")
    profesional   = relationship("PlProfesional", back_populates="eventos")
