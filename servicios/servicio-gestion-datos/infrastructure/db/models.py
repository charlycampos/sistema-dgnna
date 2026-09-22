import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Date, Integer, ForeignKey, Text, Identity
from sqlalchemy.orm import relationship
from infrastructure.db.database import Base


def _new_id():
    return str(uuid.uuid4())


class DatasetModel(Base):
    __tablename__ = "datasets"

    id               = Column(String(36),   primary_key=True, default=_new_id)
    codigo           = Column(String(50),   nullable=False, unique=True)
    nombre           = Column(String(250),  nullable=False)
    descripcion      = Column(String(1000), nullable=True)
    direccionLinea   = Column("DIRECCION_LINEA", String(50),  nullable=False) # DPE, DA, DSLD, DPNNA, DGNNA
    tipoFuente       = Column("TIPO_FUENTE", String(50),  default="Sistema Interno") # Sistema Interno, Base de Datos, Excel/CSV, API
    frecuenciaAct    = Column("FRECUENCIA_ACT", String(50),  default="Mensual") # Diario, Semanal, Mensual, Trimestral, Anual
    formatoSalida    = Column("FORMATO_SALIDA", String(50),  default="Excel") # Excel, CSV, JSON, API
    responsable      = Column(String(200),  nullable=True)
    estado           = Column(String(20),   default="activo") # activo, inactivo, en_revision
    creadoPor        = Column("CREADO_POR", String(200),  nullable=True)
    createdAt        = Column("CREATED_AT", DateTime,     default=datetime.utcnow)
    updatedAt        = Column("UPDATED_AT", DateTime,     default=datetime.utcnow, onupdate=datetime.utcnow)

    campos = relationship("DiccionarioCampoModel", back_populates="dataset", cascade="all, delete-orphan")


class DiccionarioCampoModel(Base):
    __tablename__ = "diccionario_campos"

    id             = Column(String(36),  primary_key=True, default=_new_id)
    datasetId      = Column("DATASET_ID", String(36), ForeignKey("datasets.id"), nullable=False)
    nombreCampo    = Column("NOMBRE_CAMPO", String(100), nullable=False)
    tipoDato       = Column("TIPO_DATO", String(50),  nullable=False) # VARCHAR2, NUMBER, DATE, TIMESTAMP, BOOLEAN
    longitudMax    = Column("LONGITUD_MAX", Integer,     nullable=True)
    esObligatorio  = Column("ES_OBLIGATORIO", Integer,     default=0) # 0 = No, 1 = Sí
    descripcion    = Column(String(500), nullable=True)
    ejemplo        = Column(String(200), nullable=True)
    createdAt      = Column("CREATED_AT", DateTime,    default=datetime.utcnow)

    dataset = relationship("DatasetModel", back_populates="campos")


# ─── MODELOS SUITE DSLD (DEMUNA, SUPERVISIÓN, CAPACITACIÓN, CCONNA, MODO NIÑEZ, PIAS) ───

# Esquema v2 (docs/DSLD_ESQUEMA_DEMUNA_SUPERVISION.md · dsld_01_demuna_supervision.sql)
# Fuente: DNA.mdb. Se cargan con domain/services/dsld_demuna_etl.py.

class DsldCargaModel(Base):
    __tablename__ = "dsld_cargas"

    id                  = Column(Integer, Identity(always=True), primary_key=True)
    origen              = Column(String(30),   nullable=False)
    archivo             = Column(String(500),  nullable=False)
    archivoHash         = Column("archivo_hash", String(64))
    archivoFecha        = Column("archivo_fecha", DateTime)
    usuario             = Column(String(100))
    fechaInicio         = Column("fecha_inicio", DateTime, nullable=False, default=datetime.now)
    fechaFin            = Column("fecha_fin", DateTime)
    estado              = Column(String(20),   nullable=False, default="EN_PROCESO")  # EN_PROCESO / EXITOSA / FALLIDA
    registrosLeidos     = Column("registros_leidos", Integer, default=0)
    registrosCargados   = Column("registros_cargados", Integer, default=0)
    registrosRechazados = Column("registros_rechazados", Integer, default=0)
    detalle             = Column(String(4000))


class DsldUbigeoModel(Base):
    __tablename__ = "dsld_ubigeo"

    ubigeo          = Column(String(6),   primary_key=True)
    nivel           = Column(String(12),  nullable=False)   # DEPARTAMENTO / PROVINCIA / DISTRITO
    ccdd            = Column(String(2),   nullable=False)
    ccpp            = Column(String(2))
    ccdi            = Column(String(2))
    ubigeoProv      = Column("ubigeo_prov", String(4), index=True)
    nombre          = Column(String(100), nullable=False)
    departamento    = Column(String(100), nullable=False)
    provincia       = Column(String(100))
    distrito        = Column(String(100))
    departamentoMod = Column("departamento_mod", String(100), nullable=False, index=True)
    ccddAnalitico   = Column("ccdd_analitico", String(2), nullable=False)
    cargaId         = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"))


class DsldPoblacionModel(Base):
    __tablename__ = "dsld_poblacion"

    ubigeo          = Column(String(6), ForeignKey("dsld_ubigeo.ubigeo"), primary_key=True)
    poblacionTotal  = Column("poblacion_total", Integer)
    poblacionNna    = Column("poblacion_nna", Integer)
    fuente          = Column(String(100), default="INEI (DNA.mdb)")
    cargaId         = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"))


class DsldCatEstadoModel(Base):
    __tablename__ = "dsld_cat_estado"

    codigo          = Column(String(1),  primary_key=True)
    estado          = Column(String(60), nullable=False)
    grupoTablero    = Column("grupo_tablero", String(20))


class DsldCatModeloModel(Base):
    __tablename__ = "dsld_cat_modelo"

    codigo          = Column(String(2),   primary_key=True)
    modelo          = Column(String(120), nullable=False)
    siglas          = Column(String(30),  nullable=False)
    esDemuna        = Column("es_demuna", Integer, nullable=False, default=0)


class DsldCatSupervisorModel(Base):
    __tablename__ = "dsld_cat_supervisor"

    id              = Column(Integer, primary_key=True, autoincrement=False)
    nombre          = Column(String(100), nullable=False)


class DsldDemunaModel(Base):
    __tablename__ = "dsld_demunas"

    codigo                 = Column(String(5),   primary_key=True)
    nombre                 = Column(String(250), nullable=False)
    nombreCorto            = Column("nombre_corto", String(250))
    ubigeo                 = Column(String(6),   ForeignKey("dsld_ubigeo.ubigeo"), nullable=False, unique=True)
    departamento           = Column(String(100), nullable=False)
    provincia              = Column(String(100), nullable=False)
    distrito               = Column(String(100), nullable=False)
    modelo                 = Column(String(2),   ForeignKey("dsld_cat_modelo.codigo"), nullable=False)
    estadoAcreditacion     = Column("estado_acreditacion", String(1), ForeignKey("dsld_cat_estado.codigo"), nullable=False, index=True)
    fechaAcreditacion      = Column("fecha_acreditacion", Date, index=True)
    anioAcreditacion       = Column("anio_acreditacion", Integer)
    resolucionAcreditacion = Column("resolucion_acreditacion", String(100))
    estadoRegistro         = Column("estado_registro", String(1), ForeignKey("dsld_cat_estado.codigo"))
    fechaRegistro          = Column("fecha_registro", Date)
    resolucionInscripcion  = Column("resolucion_inscripcion", String(100))
    fechaInicio            = Column("fecha_inicio", Date)
    fechaRof               = Column("fecha_rof", Date)
    direccion              = Column(String(250))
    telefono1              = Column(String(20))
    telefono2              = Column(String(20))
    email                  = Column(String(150))
    horario                = Column(String(100))
    defensoresF            = Column("defensores_f", Integer)
    defensoresM            = Column("defensores_m", Integer)
    promotoresF            = Column("promotores_f", Integer)
    promotoresM            = Column("promotores_m", Integer)
    otrosF                 = Column("otros_f", Integer)
    otrosM                 = Column("otros_m", Integer)
    fechaUltimaSupAccess   = Column("fecha_ultima_sup_access", Date)
    fechaCconna            = Column("fecha_cconna", Date)
    fortalecida            = Column(String(2))
    pi2022                 = Column("pi_2022", String(1))
    pi2025                 = Column("pi_2025", String(1))
    rangoPi2023            = Column("rango_pi_2023", Integer)
    cargaId                = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)
    fechaActualizacion     = Column("fecha_actualizacion", DateTime, default=datetime.now)


class DsldSupervisionModel(Base):
    __tablename__ = "dsld_supervisiones"

    id                 = Column(Integer, primary_key=True, autoincrement=False)
    codigoDemuna       = Column("codigo_demuna", String(5), ForeignKey("dsld_demunas.codigo"), nullable=False, index=True)
    fechaSupervision   = Column("fecha_supervision", Date, nullable=False)
    anio               = Column(Integer, nullable=False, index=True)
    tipoSupervision    = Column("tipo_supervision", Integer)   # 1 = VIRTUAL, 2 = PRESENCIAL
    supervisorId       = Column("supervisor_id", Integer)   # sin FK: el Access tiene ids no catalogados
    resumen            = Column(String(4000))
    comentarios        = Column(String(4000))
    cargaId            = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)


class DsldParametroModel(Base):
    """Parámetros internos del servicio (p. ej. la clave con la que se seudonimiza el DNI)."""
    __tablename__ = "dsld_parametros"

    clave         = Column(String(50), primary_key=True)
    valor         = Column(String(200), nullable=False)
    fechaCreacion = Column("fecha_creacion", DateTime, nullable=False, default=datetime.now)


class DsldCapacitacionModel(Base):
    """Capacitación (esquema v2): una fila por participación. Sin DNI: persona_id es un seudónimo HMAC."""
    __tablename__ = "dsld_capacitaciones"

    id               = Column(Integer, Identity(always=True), primary_key=True)
    anio             = Column(Integer, nullable=False)
    mes              = Column(Integer, nullable=False)
    anioRegistro     = Column("anio_registro", Integer)
    fechaInicio      = Column("fecha_inicio", Date, nullable=False)
    fechaFin         = Column("fecha_fin", Date)
    codigoDemuna     = Column("codigo_demuna", String(10))
    ubigeo           = Column(String(6))
    ccdd             = Column(String(2))
    departamento     = Column(String(100))
    provincia        = Column(String(100))
    distrito         = Column(String(100))
    departamentoMod  = Column("departamento_mod", String(100))
    curso            = Column(String(250))
    siglasCurso      = Column("siglas_curso", String(20))
    sede             = Column(String(100))
    tipoCapacitacion = Column("tipo_capacitacion", String(12))
    tipoAsistente    = Column("tipo_asistente", String(30))
    estado           = Column(String(20), nullable=False)
    personaId        = Column("persona_id", String(64))
    sexo             = Column(String(1))
    cargaId          = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)


class DsldCconnaModel(Base):
    """CCONNA conformados (esquema v2). Sin datos del especialista encargado."""
    __tablename__ = "dsld_cconna"

    ubigeo            = Column(String(6), primary_key=True)
    nivel             = Column(String(12), nullable=False)      # DISTRITAL / PROVINCIAL / REGIONAL
    nombre            = Column(String(200), nullable=False)
    ccdd              = Column(String(2), nullable=False)
    ubigeoProv        = Column("ubigeo_prov", String(4))
    departamento      = Column(String(100))
    provincia         = Column(String(100))
    distrito          = Column(String(100))
    departamentoMod   = Column("departamento_mod", String(100))
    numeroOrden       = Column("numero_orden", Integer)
    numeroOrdenanza   = Column("numero_ordenanza", String(100))
    fechaOrdenanza    = Column("fecha_ordenanza", Date)
    numeroResolucion  = Column("numero_resolucion", String(100))
    fechaResolucion   = Column("fecha_resolucion", Date)
    fechaActa         = Column("fecha_acta", Date)
    fechaPlan         = Column("fecha_plan", Date)
    anioConformacion  = Column("anio_conformacion", Integer)
    baseNominal       = Column("base_nominal", String(50))
    registroMimp      = Column("registro_mimp", String(10))
    oficioDsld        = Column("oficio_dsld", String(100))
    fechaRegistro     = Column("fecha_registro", Date)
    cargaId           = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)


class DsldCconnaIntegranteModel(Base):
    """Integrantes NNA de los CCONNA, solo en conteos (sin datos personales)."""
    __tablename__ = "dsld_cconna_integrantes"

    id                = Column(Integer, Identity(always=True), primary_key=True)
    nivel             = Column(String(12), nullable=False)
    ubigeo            = Column(String(6))
    ccdd              = Column(String(2))
    ubigeoProv        = Column("ubigeo_prov", String(4))
    departamento      = Column(String(100))
    provincia         = Column(String(100))
    distrito          = Column(String(100))
    departamentoMod   = Column("departamento_mod", String(100))
    sexo              = Column(String(1))
    condicion         = Column(String(12), nullable=False)
    cantidad          = Column(Integer, nullable=False)
    cargaId           = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)


class DsldModoNinezModel(Base):
    """Ponte en Modo Niñez (esquema v2). Sin datos personales: no guarda SR/SRA ni ALCALDE/SA."""
    __tablename__ = "dsld_modo_ninez"

    ubigeo            = Column(String(6),   primary_key=True)
    nivelGobierno     = Column("nivel_gobierno", String(12), nullable=False)   # REGIONAL / PROVINCIAL / DISTRITAL
    nombreGobierno    = Column("nombre_gobierno", String(200), nullable=False)
    macroregion       = Column(String(50))
    ccdd              = Column(String(2), nullable=False)
    ubigeoProv        = Column("ubigeo_prov", String(4))
    departamento      = Column(String(100))
    provincia         = Column(String(100))
    distrito          = Column(String(100))
    departamentoMod   = Column("departamento_mod", String(100))
    adherido          = Column(String(1), nullable=False)                      # S / N
    anioAdhesion      = Column("anio_adhesion", Integer)
    fechaPresentacion = Column("fecha_presentacion", Date)
    anioPresentacion  = Column("anio_presentacion", Integer)
    fechaActa         = Column("fecha_acta", Date)
    codigoDemuna      = Column("codigo_demuna", String(10))
    estadoDemuna      = Column("estado_demuna", String(20))
    numeroOrden       = Column("numero_orden", Integer)
    cargaId           = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)


class DsldPiasAtencionModel(Base):
    """Atenciones PIAS (esquema v2): una fila por persona atendida, sin datos personales (solo sexo)."""
    __tablename__ = "dsld_pias_atenciones"

    id              = Column(Integer, Identity(always=True), primary_key=True)
    tipoPersona     = Column("tipo_persona", String(20), nullable=False)   # AUTORIDAD / PADRE DE FAMILIA / NNA
    fechaAtencion   = Column("fecha_atencion", Date, nullable=False)
    anio            = Column(Integer, nullable=False)
    mes             = Column(Integer)
    ubigeo          = Column(String(6), nullable=False)
    departamento    = Column(String(100))
    provincia       = Column(String(100))
    distrito        = Column(String(100))
    departamentoMod = Column("departamento_mod", String(100))
    centroPoblado   = Column("centro_poblado", String(150))
    areaResidencia  = Column("area_residencia", String(10))
    cuenca          = Column(String(150), nullable=False)
    modalidad       = Column(String(12))
    sexo            = Column(String(1))
    numSesiones     = Column("num_sesiones", Integer)
    cargaId         = Column("carga_id", Integer, ForeignKey("dsld_cargas.id"), nullable=False)


# ─── MODELOS SUITE DPNNA (CENTROS CAR Y NNA ACOGIDOS CON CIFRADO AES-256) ───

class CarCentroModel(Base):
    """Directorio oficial de Centros CAR (Fuente: BASE_RENE_CENTROS_2026_CAR)."""
    __tablename__ = "car_centros"

    id             = Column(Integer, Identity(always=True), primary_key=True)
    codCen         = Column("cod_cen", String(50), nullable=False, unique=True)
    codDgnna       = Column("cod_dgnna", String(50))
    nomCen         = Column("nom_cen", String(250), nullable=False)
    tipCen         = Column("tip_cen", String(50))
    tipCenEsp      = Column("tip_cen_esp", String(150))
    ubigeo         = Column(String(10))
    depCen         = Column("dep_cen", String(100))
    provCen        = Column("prov_cen", String(100))
    disCen         = Column("dis_cen", String(100))
    uniLin         = Column("uni_lin", String(50))
    nomServ        = Column("nom_serv", String(300))
    defServ        = Column("def_serv", String(1000))
    defServAgru    = Column("def_serv_agru", String(1000))
    tipCenAgru     = Column("tip_cen_agru", String(100))
    textoEgreso    = Column("texto_egreso", String(1000))
    capInstalada   = Column("cap_instalada", Integer)
    capReal        = Column("cap_real", Integer)
    perfilCentro   = Column("perfil_centro", String(200))
    acreditado     = Column(String(10))
    nroConstancia  = Column("nro_constancia", String(100))
    rd             = Column(String(100))
    vigencia       = Column(String(50))
    latitud        = Column(String(50))
    longitud       = Column(String(50))
    updatedAt      = Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CarCargaModel(Base):
    """Registro histórico de cargas de archivos CAR."""
    __tablename__ = "car_cargas"

    id                  = Column(Integer, Identity(always=True), primary_key=True)
    tipoCar             = Column("tipo_car", String(50), nullable=False) # BASICO, ESPECIALIZADO, URGENCIA, CENTROS
    nombreArchivo       = Column("nombre_archivo", String(250), nullable=False)
    archivoHash         = Column("archivo_hash", String(64))
    periodoCorte        = Column("periodo_corte", String(20), nullable=False) # Ej. '2026-06'
    usuario             = Column(String(100))
    fechaCarga          = Column("fecha_carga", DateTime, default=datetime.utcnow)
    totalRegistros      = Column("total_registros", Integer, default=0)
    estado              = Column(String(20), default="EXITOSA") # EXITOSA / ERROR
    mensaje             = Column(String(1000))


class CarCargaFilaRawModel(Base):
    """Capa de auditoría RAW: almacena el 100% de la fila del Excel en formato JSON/CLOB."""
    __tablename__ = "car_carga_filas_raw"

    id             = Column(Integer, Identity(always=True), primary_key=True)
    cargaId        = Column("carga_id", Integer, ForeignKey("car_cargas.id"), nullable=False)
    filaIndex      = Column("fila_index", Integer, nullable=False)
    codUsu         = Column("cod_usu", String(100))
    codCen         = Column("cod_cen", String(50))
    rawJson        = Column("raw_json", Text, nullable=False)


class CarNnaCorteModel(Base):
    """Capa analítica tipada de NNA albergados en CAR, con datos sensibles encriptados."""
    __tablename__ = "car_nna_cortes"

    id                     = Column(Integer, Identity(always=True), primary_key=True)
    cargaId                = Column("carga_id", Integer, ForeignKey("car_cargas.id"), nullable=False)
    periodoCorte           = Column("periodo_corte", String(20), nullable=False)
    esUltimoCorte          = Column("es_ultimo_corte", String(1), default="S", nullable=False) # 'S' / 'N'
    tipoCar                = Column("tipo_car", String(50), nullable=False) # BASICO / ESPECIALIZADO / URGENCIA

    # Identificación básica no sensible
    codUsu                 = Column("cod_usu", String(100))
    tipDoc                 = Column("tip_doc", String(50))
    
    # DATOS SENSIBLES CIFRADOS (AES-256-GCM)
    nroDocEnc              = Column("nro_doc_enc", String(255))
    nombresEnc             = Column("nombres_enc", String(500))
    primerApellidoEnc      = Column("primer_apellido_enc", String(255))
    segundoApellidoEnc     = Column("segundo_apellido_enc", String(255))
    
    # BLIND INDEX DETERMINISTA (HMAC-SHA256) PARA BÚSQUEDAS EXACTAS
    nroDocHash             = Column("nro_doc_hash", String(64), index=True)
    nomCompletoHash        = Column("nom_completo_hash", String(64), index=True)

    # Demografía y Salud
    sexo                   = Column(String(20))
    fechaNacimiento        = Column("fecha_nacimiento", Date)
    edad                   = Column(Integer)
    grupoEtario            = Column("grupo_etario", String(50))
    paisNacimiento         = Column("pais_nacimiento", String(100))
    depNacimiento          = Column("dep_nacimiento", String(100))
    provNacimiento         = Column("prov_nacimiento", String(100))
    disNacimiento          = Column("dis_nacimiento", String(100))
    ubigeoNacimiento       = Column("ubigeo_nacimiento", String(10))
    tieneDiscapacidad      = Column("tiene_discapacidad", String(20))
    lenguaMaterna          = Column("lengua_materna", String(100))
    seguroSalud            = Column("seguro_salud", String(100))
    nivelEducativo         = Column("nivel_educativo", String(100))

    # Servicio CAR
    codServicio            = Column("cod_servicio", String(50))
    nomServicio            = Column("nom_servicio", String(250))
    codCen                 = Column("cod_cen", String(50), index=True)
    nomCen                 = Column("nom_cen", String(250))
    
    # Ingreso y Situación Legal
    fechaIngreso           = Column("fecha_ingreso", Date)
    fechaReingreso         = Column("fecha_reingreso", Date)
    medioIngreso           = Column("medio_ingreso", String(150))
    tipoIngreso            = Column("tipo_ingreso", String(150))
    perfilIngreso          = Column("perfil_ingreso", String(150))
    situacionLegal         = Column("situacion_legal", String(150))
    expedienteIngreso      = Column("expediente_ingreso", String(150))
    instanciaDeriva        = Column("instancia_deriva", String(250))

    # PTI y Permanencia
    cuentaPti              = Column("cuenta_pti", String(20))
    fechaAprobacionPti     = Column("fecha_aprobacion_pti", Date)
    diasPermanencia        = Column("dias_permanencia", Integer)
    mayor18Meses           = Column("mayor_18_meses", String(10)) # SI / NO

    # Situación Actual y Egreso
    estadoActual           = Column("estado_actual", String(100))
    movimientoPoblacional  = Column("movimiento_poblacional", String(100))
    fechaEgreso            = Column("fecha_egreso", Date)
    motivoEgreso           = Column("motivo_egreso", String(250))
    especificarTraslado    = Column("especificar_traslado", String(250))
    
    createdAt              = Column("created_at", DateTime, default=datetime.utcnow)


# ─── MODELOS SUITE DIRECCIÓN DE ADOPCIONES (DA / RPADO) ─────────────────────

class DaCargaModel(Base):
    """Registro y trazabilidad de importación periódica de Excels de Adopciones."""
    __tablename__ = "da_cargas"

    id             = Column(Integer, Identity(always=True), primary_key=True)
    tipoArchivo    = Column("tipo_archivo", String(50), nullable=False) # ADOPCIONES / RPADO
    nombreArchivo  = Column("nombre_archivo", String(255), nullable=False)
    archivoHash    = Column("archivo_hash", String(64))
    periodoCorte   = Column("periodo_corte", String(50), nullable=False)
    usuario        = Column(String(100))
    fechaCarga     = Column("fecha_carga", DateTime, default=datetime.utcnow)
    totalRegistros = Column("total_registros", Integer, default=0)
    estado         = Column(String(30), default="EXITOSA") # EXITOSA / OBSERVADA / ERROR
    mensaje        = Column(String(500))


class DaCargaFilaRawModel(Base):
    """Guarda el 100% de la fila original como JSON cifrado AES-256-GCM."""
    __tablename__ = "da_carga_filas_raw"

    id         = Column(Integer, Identity(always=True), primary_key=True)
    cargaId    = Column("carga_id", Integer, ForeignKey("da_cargas.id"), nullable=False, index=True)
    tipoArchivo= Column("tipo_archivo", String(50), nullable=False) # ADOPCIONES / RPADO
    filaNumero = Column("fila_numero", Integer, nullable=False)
    rawJson    = Column("raw_json", Text, nullable=False)
    createdAt  = Column("created_at", DateTime, default=datetime.utcnow)


class DaNnaAdopcionModel(Base):
    """Expedientes y NNA en proceso de adopción (RENE ADOPCIONES). Datos personales cifrados."""
    __tablename__ = "da_nna_adopciones"

    id                  = Column(Integer, Identity(always=True), primary_key=True)
    cargaId             = Column("carga_id", Integer, ForeignKey("da_cargas.id"), nullable=False, index=True)
    periodoCorte        = Column("periodo_corte", String(50), nullable=False)
    esUltimoCorte       = Column("es_ultimo_corte", String(1), default="S", index=True) # S / N

    # Sede y Expediente
    sede                = Column(String(100), index=True) # UA-LIMA, UA-AREQUIPA, etc.
    estado              = Column(String(100), index=True) # ADOPTABLE, ADOPTADO, ARCHIVO DEFINITIVO, etc.
    codNna              = Column("cod_nna", String(50), index=True)
    numExpNna           = Column("num_exp_nna", String(100))
    fechaRegExp         = Column("fecha_reg_exp", Date)

    # Datos Personales Cifrados (AES-256-GCM) y Blind Index (HMAC-SHA256)
    nombresEnc          = Column("nombres_enc", String(500))
    primerApellidoEnc   = Column("primer_apellido_enc", String(255))
    segundoApellidoEnc  = Column("segundo_apellido_enc", String(255))
    nroDocEnc           = Column("nro_doc_enc", String(255))
    tipDoc              = Column("tip_doc", String(50))
    nroDocHash          = Column("nro_doc_hash", String(64), index=True)
    nomCompletoHash     = Column("nom_completo_hash", String(64), index=True)

    # Demografía
    sexo                = Column(String(20)) # HOMBRE / MUJER
    fechaNacimiento     = Column("fecha_nacimiento", Date)
    edad                = Column(Integer)
    grupoEtario         = Column("grupo_etario", String(50))
    depNacimiento       = Column("dep_nacimiento", String(100))
    provNacimiento      = Column("prov_nacimiento", String(100))
    distNacimiento      = Column("dist_nacimiento", String(100))

    # Medida y Residencia CAR
    medidaProteccion    = Column("medida_proteccion", String(150))
    nomCar              = Column("nom_car", String(250))
    codCar              = Column("cod_car", String(50))
    depCar              = Column("dep_car", String(100))
    provCar             = Column("prov_car", String(100))
    distCar             = Column("dist_car", String(100))

    # Procedencia Tutelar y Resolución Judicial
    procedenciaTutelar  = Column("procedencia_tutelar", String(150))
    nomUpe              = Column("nom_upe", String(150))
    tipoResolucion      = Column("tipo_resolucion", String(50)) # RJA, etc.
    fechaResolucion     = Column("fecha_resolucion", Date)
    fechaConsentida     = Column("fecha_consentida", Date)

    # Condición y Adopción Especial
    condicionUltima     = Column("condicion_ultima", String(150)) # PARA DESIGNAR, MAYOR DE EDAD, etc.
    condicionFinal      = Column("condicion_final", String(150))
    tipoAdopcion        = Column("tipo_adopcion", String(100)) # ESPECIAL / REGULAR / EVALUACION ESPECIAL
    grupoReferencia     = Column("grupo_referencia", String(150)) # GRUPO DE HERMANOS, CON DISCAPACIDAD, etc.
    fechaDesignacion    = Column("fecha_designacion", Date)

    createdAt           = Column("created_at", DateTime, default=datetime.utcnow)


class DaRpadoSeguimientoModel(Base):
    """Seguimiento postadopción de familias adoptivas (RPADO - PP 0117)."""
    __tablename__ = "da_rpado_seguimiento"

    id                  = Column(Integer, Identity(always=True), primary_key=True)
    cargaId             = Column("carga_id", Integer, ForeignKey("da_cargas.id"), nullable=False, index=True)
    periodoCorte        = Column("periodo_corte", String(50), nullable=False)
    esUltimoCorte       = Column("es_ultimo_corte", String(1), default="S", index=True) # S / N

    # Estado General
    estado              = Column(String(50), index=True) # Finalizado, En proceso, Fallido
    faltaInforme        = Column("falta_informe", String(150)) # Visita N° 1..6, Emitir 5to inf, etc.
    fechaResolAdopcion  = Column("fecha_resol_adopcion", Date)
    fechaInicioPost     = Column("fecha_inicio_post", Date)
    numExp              = Column("num_exp", String(100))
    numHijosAdoptados   = Column("num_hijos_adoptados", Integer, default=1)
    sede                = Column(String(100), index=True) # UA-LIMA, UA-AREQUIPA, etc.
    paisResidencia      = Column("pais_residencia", String(100))
    depResidencia       = Column("dep_residencia", String(100))
    tipoAdopcion        = Column("tipo_adopcion", String(100))

    # Semáforo de Informes (1 a 6)
    fechaProyInf1       = Column("fecha_proy_inf_1", Date)
    retrasoDiasInf1     = Column("retraso_dias_inf_1", Integer)
    fechaProyInf2       = Column("fecha_proy_inf_2", Date)
    retrasoDiasInf2     = Column("retraso_dias_inf_2", Integer)
    fechaProyInf3       = Column("fecha_proy_inf_3", Date)
    retrasoDiasInf3     = Column("retraso_dias_inf_3", Integer)
    fechaProyInf4       = Column("fecha_proy_inf_4", Date)
    retrasoDiasInf4     = Column("retraso_dias_inf_4", Integer)
    fechaProyInf5       = Column("fecha_proy_inf_5", Date)
    retrasoDiasInf5     = Column("retraso_dias_inf_5", Integer)
    fechaProyInf6       = Column("fecha_proy_inf_6", Date)
    retrasoDiasInf6     = Column("retraso_dias_inf_6", Integer)

    # Condición de Quiebre / Adopción Fallida
    esFallida           = Column("es_fallida", String(10), default="NO") # SI / NO
    docFinalizacion     = Column("doc_finalizacion", String(250))
    observaciones       = Column(String(1000))

    createdAt           = Column("created_at", DateTime, default=datetime.utcnow)

