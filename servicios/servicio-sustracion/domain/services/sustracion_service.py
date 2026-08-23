import calendar
from dataclasses import fields
from datetime import date, datetime, timedelta
from typing import List, Optional
from domain.entities.caso_sustracion import CasoSustracion, BitacoraSustracion, HistorialJudicial, NnaSustracion, ProcesoOperativoSustracion
from domain.ports.caso_repository import CasoRepository


class SustracionService:

    REQUISITOS = [
        "Solicitud formal de restitución o régimen de visitas identificada",
        "Identidad y datos del NNA acreditados",
        "Residencia habitual acreditada en el Estado requirente",
        "Derecho de custodia o visitas legalmente ejercido",
        "Traslado o retención ilícita identificado",
        "Documentación sustentatoria y partidas de nacimiento",
        "Traducciones oficiales al español, cuando corresponda",
        "Información para ubicación del NNA y del presunto sustractor",
    ]
    ESTADOS_REQUISITO = {"Pendiente", "Completo", "Observado", "No aplica"}
    FERIADOS_FIJOS = {
        (1, 1), (5, 1), (6, 7), (6, 29), (7, 23), (7, 28), (7, 29),
        (8, 6), (8, 30), (10, 8), (11, 1), (12, 8), (12, 9), (12, 25),
    }

    def __init__(self, caso_repo: CasoRepository):
        self._casos = caso_repo

    def listar(self, estado=None, profesional=None, pais=None, q=None) -> List[CasoSustracion]:
        return self._casos.listar(estado=estado, profesional=profesional, pais=pais, q=q)

    def obtener(self, id: str) -> CasoSustracion:
        caso = self._casos.obtener_por_id(id)
        if not caso:
            raise ValueError(f"Caso {id} no encontrado")
        return caso

    @classmethod
    def proceso_inicial(cls, caso_id: str) -> ProcesoOperativoSustracion:
        return ProcesoOperativoSustracion(
            casoId=caso_id,
            faseOperativa="Evaluación",
            evaluacionResultado="Pendiente",
            requisitos=[{"id": f"r{i + 1}", "nombre": nombre, "estado": "Pendiente"} for i, nombre in enumerate(cls.REQUISITOS)],
        )

    @classmethod
    def sumar_dias_habiles(cls, fecha_iso: str, dias: int) -> str:
        actual = date.fromisoformat(fecha_iso)
        contados = 0
        while contados < dias:
            actual += timedelta(days=1)
            if actual.weekday() < 5 and (actual.month, actual.day) not in cls.FERIADOS_FIJOS:
                contados += 1
        return actual.isoformat()

    @staticmethod
    def sumar_un_mes(fecha_iso: str) -> str:
        actual = date.fromisoformat(fecha_iso)
        mes = 1 if actual.month == 12 else actual.month + 1
        anio = actual.year + 1 if actual.month == 12 else actual.year
        dia = min(actual.day, calendar.monthrange(anio, mes)[1])
        return date(anio, mes, dia).isoformat()

    @staticmethod
    def _clave_nna(datos) -> tuple:
        def normalizar(valor):
            return " ".join((valor or "").strip().upper().split())
        return (
            normalizar(datos.get("nombres") if isinstance(datos, dict) else datos.nombres),
            normalizar(datos.get("primerApellido") if isinstance(datos, dict) else datos.primerApellido),
            normalizar(datos.get("segundoApellido") if isinstance(datos, dict) else datos.segundoApellido),
            (datos.get("fechaNacimiento") if isinstance(datos, dict) else datos.fechaNacimiento) or "",
        )

    @staticmethod
    def _resolver_edad(datos: dict, fecha_referencia: str) -> tuple:
        fecha_nacimiento = (datos.get("fechaNacimiento") or "").strip()
        if not fecha_nacimiento:
            edad = str(datos.get("edad") or "").strip()
            if not edad:
                return None, None
            if not edad.isdigit() or int(edad) < 0:
                raise ValueError("La edad debe ser un número entero mayor o igual a cero")
            tipo = datos.get("tipoEdad")
            if tipo not in ("Años", "Meses", "Días"):
                raise ValueError("Debe seleccionar el tipo de edad")
            return edad, tipo

        try:
            nacimiento = date.fromisoformat(fecha_nacimiento)
            referencia = date.fromisoformat(fecha_referencia)
        except ValueError:
            raise ValueError("La fecha de nacimiento o la fecha de ingreso no es válida")
        if nacimiento > referencia:
            raise ValueError("La fecha de nacimiento no puede ser posterior a la fecha de ingreso")

        anios = referencia.year - nacimiento.year - ((referencia.month, referencia.day) < (nacimiento.month, nacimiento.day))
        if anios >= 1:
            return str(anios), "Años"
        meses = (referencia.year - nacimiento.year) * 12 + referencia.month - nacimiento.month
        if referencia.day < nacimiento.day:
            meses -= 1
        if meses >= 1:
            return str(meses), "Meses"
        return str((referencia - nacimiento).days), "Días"

    def crear(self, datos: dict, usuario: str = "") -> CasoSustracion:
        codigo = datos["codigo"].strip().upper()
        if self._casos.obtener_por_codigo(codigo):
            raise ValueError(f"El código '{codigo}' ya existe")

        nna_registrados = datos.get("nna") or []
        if not nna_registrados:
            raise ValueError("Debe registrar al menos un NNA")
        for nna in nna_registrados:
            nna["edad"], nna["tipoEdad"] = self._resolver_edad(nna, datos["fechaIngreso"])
        claves_nna = [self._clave_nna(nna) for nna in nna_registrados]
        if len(claves_nna) != len(set(claves_nna)):
            raise ValueError("El mismo NNA no puede registrarse dos veces en un caso")
        primer_nna = nna_registrados[0] if nna_registrados else {}

        caso = CasoSustracion(
            codigo      = codigo,
            pais        = datos["pais"].strip(),
            fechaIngreso = datos["fechaIngreso"],
            nnaNombres = (primer_nna.get("nombres") or "").strip() or None,
            nnaPrimerApellido = (primer_nna.get("primerApellido") or "").strip() or None,
            nnaSegundoApellido = (primer_nna.get("segundoApellido") or "").strip() or None,
            nnaSexo = primer_nna.get("sexo"), nnaFechaNac = primer_nna.get("fechaNacimiento"),
            nnaEdad = primer_nna.get("edad"), nnaTipoEdad = primer_nna.get("tipoEdad"),
            profesional = usuario or datos.get("profesional"),
            creadoPor   = datos.get("creadoPor") or usuario,
            **{k: v for k, v in datos.items() if k not in (
                "codigo", "nna", "nnaNombres", "nnaPrimerApellido", "nnaSegundoApellido",
                "nnaSexo", "nnaEdad", "nnaTipoEdad", "nnaFechaNac",
                "pais", "fechaIngreso", "profesional", "creadoPor",
            )}
        )
        resultado = self._casos.guardar(caso)
        for nna in nna_registrados:
            self.agregar_nna(resultado.id, nna, usuario=usuario)
        self._casos.guardar_proceso(self.proceso_inicial(resultado.id))
        return self.obtener(resultado.id)

    def actualizar(self, id: str, datos: dict) -> CasoSustracion:
        caso = self.obtener(id)

        if caso.estado == "Archivado":
            raise ValueError("Un expediente cerrado se conserva sin modificaciones para fines de auditoría")

        if datos.get("estado") == "Archivado":
            proceso_cierre = self._casos.obtener_proceso(id)
            if not proceso_cierre or proceso_cierre.faseOperativa != "Cierre":
                raise ValueError("El expediente solo puede archivarse cuando el flujo ha llegado a la etapa de cierre")
            fecha_cierre = datos.get("fechaSalida", caso.fechaSalida)
            motivo = datos.get("motivoCierre", caso.motivoCierre)
            retorno = datos.get("retorno", caso.retorno)
            if not fecha_cierre or not motivo or not retorno or retorno == "Pendiente":
                raise ValueError("Para cerrar el expediente debe registrar fecha, motivo y resultado del retorno")

        campos_judiciales = {"estadoJudicial", "fechaDemanda", "numExpedienteJudicial", "juzgado", "sentencia1ra", "sentencia2da", "casacion"}
        if campos_judiciales.intersection(datos):
            proceso = self._casos.obtener_proceso(id)
            fase = (proceso.faseOperativa if proceso else "") or ""
            es_legado_judicial = caso.etapa == "Judicial" or bool(caso.fechaDemanda or caso.numExpedienteJudicial)
            if "Judicial" not in fase and not es_legado_judicial:
                raise ValueError("El proceso judicial aún no está habilitado por el flujo operativo")

        if "fechaIngreso" in datos:
            for nna in caso.nna:
                if nna.fechaNacimiento:
                    self._resolver_edad({"fechaNacimiento": nna.fechaNacimiento}, datos["fechaIngreso"])

        # Validar código único si cambia
        nuevo_codigo = datos.get("codigo", "").strip().upper()
        if nuevo_codigo and nuevo_codigo != caso.codigo:
            existente = self._casos.obtener_por_codigo(nuevo_codigo)
            if existente and existente.id != id:
                raise ValueError(f"El código '{nuevo_codigo}' ya está en uso")

        for campo, valor in datos.items():
            if hasattr(caso, campo):
                setattr(caso, campo, valor.strip() if isinstance(valor, str) and campo != "codigo" else valor)

        if nuevo_codigo:
            caso.codigo = nuevo_codigo

        caso.updatedAt = datetime.utcnow()
        resultado = self._casos.actualizar(caso)
        if datos.get("estado") == "Archivado":
            proceso = self._casos.obtener_proceso(id) or self.proceso_inicial(id)
            proceso.faseOperativa = "Cierre"
            proceso.updatedAt = datetime.utcnow()
            self._casos.guardar_proceso(proceso)
        if "fechaIngreso" in datos:
            for nna in resultado.nna:
                if not nna.fechaNacimiento:
                    continue
                nna.edad, nna.tipoEdad = self._resolver_edad(
                    {"fechaNacimiento": nna.fechaNacimiento}, resultado.fechaIngreso
                )
                self._casos.actualizar_nna(nna)
            return self.obtener(id)
        return resultado

    def eliminar(self, id: str) -> bool:
        caso = self.obtener(id)
        if caso.estado == "Archivado":
            raise ValueError("Los expedientes cerrados no se eliminan; deben conservarse para auditoría")
        return self._casos.eliminar(id)

    def actualizar_proceso(self, caso_id: str, datos: dict, usuario: str = "") -> CasoSustracion:
        caso = self.obtener(caso_id)
        if caso.estado == "Archivado":
            raise ValueError("Un expediente cerrado no puede modificar su flujo operativo")
        proceso = self._casos.obtener_proceso(caso_id) or self.proceso_inicial(caso_id)
        fase_anterior = proceso.faseOperativa

        fecha_entrevista = datos.pop("fechaEntrevista", None)
        resultado_entrevista = datos.pop("resultadoEntrevista", None)
        if fecha_entrevista is not None:
            caso.fechaEntrevista = fecha_entrevista or None
        if resultado_entrevista is not None:
            caso.resultadoEntrevista = resultado_entrevista or None

        campos = {f.name for f in fields(ProcesoOperativoSustracion)} - {"casoId", "updatedAt"}
        for campo, valor in datos.items():
            if campo in campos:
                setattr(proceso, campo, valor)

        self._validar_requisitos(proceso.requisitos)
        resultado_eval = proceso.evaluacionResultado or "Pendiente"
        if resultado_eval == "Completa":
            if not all(r["estado"] in ("Completo", "No aplica") for r in proceso.requisitos):
                raise ValueError("La evaluación solo puede marcarse completa cuando los 8 requisitos están atendidos")
            if not self._nna_aplican_convenio(caso):
                raise ValueError("Todos los NNA deben tener edad conocida y ser menores de 16 años a la fecha de ingreso")
        elif resultado_eval == "Observada":
            if not any(r["estado"] in ("Pendiente", "Observado") for r in proceso.requisitos):
                raise ValueError("Una evaluación observada debe contener al menos un requisito pendiente u observado")
        elif resultado_eval not in ("Pendiente", "No corresponde"):
            raise ValueError("Resultado de evaluación no válido")

        if proceso.ampliacionSubsanacion not in (None, "", "No", "Sí"):
            raise ValueError("La ampliación de subsanación debe indicar Sí o No")
        if proceso.resultadoSubsanacion not in (None, "", "Pendiente", "Subsanó", "Subsanó parcialmente", "No subsanó"):
            raise ValueError("Resultado de subsanación no válido")
        if proceso.resultadoSubsanacion in ("Subsanó", "Subsanó parcialmente", "No subsanó") and not proceso.fechaRespuestaSubsanacion:
            raise ValueError("Debe registrar la fecha de respuesta para emitir el resultado de subsanación")
        if proceso.estadoCooperacion not in (None, "", "En seguimiento", "Proceso judicial exterior", "Concluido"):
            raise ValueError("Estado de cooperación internacional no válido")
        if caso.resultadoEntrevista not in (None, "", "Pendiente", "Acepta retorno voluntario", "Rechaza retorno", "No asiste", "Reprogramada"):
            raise ValueError("Resultado de entrevista no válido")
        if caso.resultadoEntrevista not in (None, "", "Pendiente") and not caso.fechaEntrevista:
            raise ValueError("Debe registrar la fecha de entrevista antes de emitir su resultado")
        if proceso.fechaRetornoEfectivo and caso.resultadoEntrevista != "Acepta retorno voluntario":
            raise ValueError("El retorno efectivo requiere una aceptación de retorno voluntario")

        if proceso.fechaNotificacion:
            plazo = 10 if proceso.ampliacionSubsanacion == "Sí" else 5
            proceso.fechaLimiteSubsanacion = self.sumar_dias_habiles(proceso.fechaNotificacion, plazo)
        if proceso.fechaAcuerdo:
            proceso.fechaLimitePasajes = self.sumar_un_mes(proceso.fechaAcuerdo)

        proceso.faseOperativa = self._resolver_fase(caso, proceso)
        caso.etapa = "Judicial" if "Judicial" in proceso.faseOperativa else "Administrativo"
        if proceso.fechaRetornoEfectivo:
            caso.retorno = "SI"
        proceso.updatedAt = datetime.utcnow()
        self._casos.guardar_proceso(proceso)
        self._casos.actualizar(caso)

        if fase_anterior != proceso.faseOperativa:
            self.agregar_bitacora(caso_id, {
                "fecha": date.today().isoformat(),
                "texto": f"Cambio de fase: {fase_anterior} → {proceso.faseOperativa}.",
            }, usuario=usuario)
        return self.obtener(caso_id)

    def _validar_requisitos(self, requisitos: list) -> None:
        if len(requisitos) != len(self.REQUISITOS):
            raise ValueError("La evaluación debe conservar los 8 requisitos normativos")
        ids = set()
        for requisito in requisitos:
            if requisito.get("estado") not in self.ESTADOS_REQUISITO:
                raise ValueError("Estado de requisito no válido")
            if not requisito.get("id") or requisito["id"] in ids:
                raise ValueError("Los requisitos deben tener identificadores únicos")
            ids.add(requisito["id"])
        ids_esperados = {f"r{i + 1}" for i in range(len(self.REQUISITOS))}
        if ids != ids_esperados:
            raise ValueError("La matriz de evaluación no corresponde a los 8 requisitos normativos")
        nombres = {f"r{i + 1}": nombre for i, nombre in enumerate(self.REQUISITOS)}
        for requisito in requisitos:
            requisito["nombre"] = nombres[requisito["id"]]

    @staticmethod
    def _nna_aplican_convenio(caso: CasoSustracion) -> bool:
        if not caso.nna:
            return False
        for nna in caso.nna:
            if nna.tipoEdad == "Años":
                if nna.edad is None or int(nna.edad) >= 16:
                    return False
            elif nna.tipoEdad not in ("Meses", "Días"):
                return False
        return True

    def _resolver_fase(self, caso: CasoSustracion, proceso: ProcesoOperativoSustracion) -> str:
        if proceso.faseOperativa == "Cierre":
            return "Cierre"
        evaluacion = proceso.evaluacionResultado or "Pendiente"
        if evaluacion == "Pendiente":
            return "Evaluación"
        if evaluacion == "No corresponde":
            return "Cierre"
        if evaluacion == "Observada":
            resultado_sub = proceso.resultadoSubsanacion or "Pendiente"
            if resultado_sub == "Subsanó":
                pass
            elif resultado_sub == "No subsanó":
                return "Cierre"
            elif resultado_sub in ("Pendiente", "Subsanó parcialmente"):
                return "Subsanación"
            else:
                raise ValueError("Resultado de subsanación no válido")

        if caso.acPeru == "Requirente":
            estado = proceso.estadoCooperacion or "En seguimiento"
            if estado == "Concluido":
                return "Cierre"
            if estado == "Proceso judicial exterior":
                return "Judicial exterior"
            return "Gestión internacional"
        if caso.acPeru != "Requerida":
            raise ValueError("Debe definir el rol de la AC Perú antes de continuar")

        if proceso.fechaRetornoEfectivo:
            return "Cierre"
        resultado = caso.resultadoEntrevista or "Pendiente"
        if resultado in ("Rechaza retorno", "No asiste") or proceso.estadoRetornoVoluntario == "Sin acuerdo":
            return "Judicial"
        return "Retorno voluntario"

    def agregar_nna(self, caso_id: str, datos: dict, usuario: str = "") -> NnaSustracion:
        caso = self.obtener(caso_id)
        nombres = (datos.get("nombres") or "").strip()
        apellido = (datos.get("primerApellido") or "").strip()
        if not nombres or not apellido:
            raise ValueError("Nombres y primer apellido son obligatorios")
        if any(self._clave_nna(nna) == self._clave_nna(datos) for nna in caso.nna):
            raise ValueError("Este NNA ya está registrado en el caso")
        edad, tipo_edad = self._resolver_edad(datos, caso.fechaIngreso)
        return self._casos.agregar_nna(NnaSustracion(
            casoId=caso_id, nombres=nombres, primerApellido=apellido,
            segundoApellido=(datos.get("segundoApellido") or "").strip() or None,
            sexo=datos.get("sexo"), fechaNacimiento=datos.get("fechaNacimiento"),
            edad=edad, tipoEdad=tipo_edad,
        ))

    def actualizar_nna(self, caso_id: str, nna_id: str, datos: dict) -> NnaSustracion:
        caso = self.obtener(caso_id)
        edad, tipo_edad = self._resolver_edad(datos, caso.fechaIngreso)
        actual = NnaSustracion(casoId=caso_id, id=nna_id, nombres=(datos.get("nombres") or "").strip(),
            primerApellido=(datos.get("primerApellido") or "").strip(),
            segundoApellido=(datos.get("segundoApellido") or "").strip() or None,
            sexo=datos.get("sexo"), fechaNacimiento=datos.get("fechaNacimiento"), edad=edad, tipoEdad=tipo_edad)
        if not actual.nombres or not actual.primerApellido:
            raise ValueError("Nombres y primer apellido son obligatorios")
        if any(nna.id != nna_id and self._clave_nna(nna) == self._clave_nna(datos) for nna in caso.nna):
            raise ValueError("Este NNA ya está registrado en el caso")
        resultado = self._casos.actualizar_nna(actual)
        if not resultado: raise ValueError("NNA no encontrado")
        return resultado

    def eliminar_nna(self, caso_id: str, nna_id: str) -> bool:
        caso = self.obtener(caso_id)
        if not any(nna.id == nna_id for nna in caso.nna):
            raise ValueError("NNA no encontrado")
        if len(caso.nna) <= 1:
            raise ValueError("El expediente debe conservar al menos un NNA")
        if not self._casos.eliminar_nna(caso_id, nna_id):
            raise ValueError("NNA no encontrado")
        return True

    # ── Bitácora ──────────────────────────────────────────────────

    def agregar_bitacora(self, caso_id: str, datos: dict, usuario: str = "") -> BitacoraSustracion:
        self.obtener(caso_id)
        entrada = BitacoraSustracion(
            casoId    = caso_id,
            fecha     = datos["fecha"],
            texto     = datos["texto"].strip(),
            creadoPor = datos.get("creadoPor") or usuario,
        )
        return self._casos.agregar_bitacora(entrada)

    def eliminar_bitacora(self, caso_id: str, entrada_id: str) -> bool:
        return self._casos.eliminar_bitacora(caso_id, entrada_id)

    # ── Historial judicial ─────────────────────────────────────────

    def agregar_historial(self, caso_id: str, datos: dict, usuario: str = "") -> HistorialJudicial:
        caso = self.obtener(caso_id)
        proceso = self._casos.obtener_proceso(caso_id)
        fase = (proceso.faseOperativa if proceso else "") or ""
        es_legado_judicial = caso.etapa == "Judicial" or bool(caso.fechaDemanda or caso.numExpedienteJudicial)
        if "Judicial" not in fase and not es_legado_judicial:
            raise ValueError("El proceso judicial aún no está habilitado por el flujo operativo")
        entrada = HistorialJudicial(
            casoId      = caso_id,
            etapa       = datos["etapa"],
            fecha       = datos["fecha"],
            descripcion = datos.get("descripcion"),
            creadoPor   = datos.get("creadoPor") or usuario,
        )
        resultado = self._casos.agregar_historial(entrada)

        # Regla de negocio: actualizar estado judicial del caso
        caso.estadoJudicial = datos["etapa"]
        if datos["etapa"] == "Demanda presentada" and not caso.fechaDemanda:
            caso.fechaDemanda = datos["fecha"]
        self._casos.actualizar(caso)

        return resultado

    def eliminar_historial(self, caso_id: str, entrada_id: str) -> bool:
        resultado = self._casos.eliminar_historial(caso_id, entrada_id)

        # Regla de negocio: recalcular estado judicial
        caso = self.obtener(caso_id)
        ultimo = self._casos.ultimo_historial(caso_id)
        caso.estadoJudicial = ultimo.etapa if ultimo else "Sin demanda"
        self._casos.actualizar(caso)

        return resultado
