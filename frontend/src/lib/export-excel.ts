import * as XLSX from 'xlsx';
import { ApelacionConRelaciones, TransparenciaRegistro } from '@/types';
import { format } from 'date-fns';

export function descargarExcelApelaciones(apelaciones: ApelacionConRelaciones[]) {
    // Preparar datos con cabecera exacta según requerimiento
    const datos = apelaciones.map((a, index) => ({
        'N°': index + 1,
        'Fecha Ingreso MIMP': a.fechaIngresoMIMP ? format(new Date(a.fechaIngresoMIMP), 'dd/MM/yyyy') : '',
        'Plazo Vencimiento': a.plazoVencimiento ? format(new Date(a.plazoVencimiento), 'dd/MM/yyyy') : '',
        'Fecha Ingreso': format(new Date(a.fechaIngreso), 'dd/MM/yyyy'),
        'N° Expediente': a.numeroExpediente,
        'Apelante': a.apelantes && a.apelantes.length > 0
            ? a.apelantes.map((ap: any) => 
                ap.tipo === "institucion" 
                    ? ap.institucion 
                    : [ap.nombres, ap.apellidoPaterno, ap.apellidoMaterno].filter(Boolean).join(" ")
              ).filter(Boolean).join(", ")
            : '',
        'NNA o CAR': a.nnas && a.nnas.length > 0
            ? a.nnas.map((nna: any) => {
                if (nna.tipo === "institucion") return nna.institucion;
                const name = [nna.nombres, nna.primerApellido, nna.segundoApellido].filter(Boolean).join(" ");
                const edadStr = nna.edad ? ` (${nna.edad} años)` : "";
                return name + edadStr;
              }).filter(Boolean).join(", ")
            : '',
        'Procedencia': a.procedencia,
        'Documento': a.documento,
        'Asunto': a.asunto,
        'Folios': a.folios,
        'Pts Folios': a.puntosExtension,
        'Complejidad Jurídica': a.complejidad?.nombre || '',
        'Pts Compl': a.puntosComplejidad,
        'Abogado': a.abogado?.nombre || '',
        'Fecha Asignación': format(new Date(a.fechaAsignacion), 'dd/MM/yyyy'),
        'Estado': a.estado,
        'Puntos Total': a.puntosTotal,
        'Revisado por': a.revisor?.nombre || '',
        'Fecha Asignación Revisor': a.fechaRevisor ? format(new Date(a.fechaRevisor), 'dd/MM/yyyy') : '',
        'N° Resolución': a.numeroResolucion || '',
        'Documento de Atención': a.documentoAtencion || '',
        'Cargos': a.cargos || '',
        'Observaciones': a.observaciones || ''
    }));

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Apelaciones');

    // Ajustar anchos de columna según requerimiento
    ws['!cols'] = [
        { wch: 5 },   // N°
        { wch: 14 },  // Fecha Ingreso MIMP
        { wch: 14 },  // Plazo Vencimiento
        { wch: 12 },  // Fecha Ingreso
        { wch: 25 },  // N° Expediente
        { wch: 40 },  // Apelante
        { wch: 40 },  // NNA o CAR
        { wch: 15 },  // Procedencia
        { wch: 25 },  // Documento
        { wch: 60 },  // Asunto
        { wch: 8 },   // Folios
        { wch: 10 },  // Pts Folios
        { wch: 35 },  // Complejidad Jurídica
        { wch: 10 },  // Pts Compl
        { wch: 18 },  // Abogado
        { wch: 15 },  // Fecha Asignación
        { wch: 12 },  // Estado
        { wch: 12 },  // Puntos Total
        { wch: 22 },  // Revisado por
        { wch: 20 },  // Fecha Asignación Revisor
        { wch: 28 },  // N° Resolución
        { wch: 30 },  // Documento de Atención
        { wch: 12 },  // Cargos
        { wch: 35 }   // Observaciones
    ];

    // Generar nombre de archivo con fecha actual
    const hoy = new Date();
    const nombreArchivo = `Apelaciones_DGNNA_${hoy.getFullYear()}_${String(hoy.getMonth() + 1).padStart(2, '0')}_${String(hoy.getDate()).padStart(2, '0')}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(wb, nombreArchivo);
}

interface SustracionExportRow {
    codigo: string
    nnaNombres?: string
    nnaPrimerApellido?: string
    nnaSegundoApellido?: string | null
    nnaNombre?: string
    nnaSexo?: string | null
    nnaFechaNac?: string | null
    nna?: Array<{
        nombres: string
        primerApellido: string
        segundoApellido?: string | null
        sexo?: string | null
        fechaNacimiento?: string | null
        edad?: string | null
        tipoEdad?: string | null
    }>
    nnaEdad?: string | null
    nnaTipoEdad?: string | null
    pais: string
    profesional?: string | null
    fechaIngreso?: string | null
    estado: string
    etapa?: string | null
    tipoSolicitud?: string | null
    acPeru?: string | null
    solicitanteNombre?: string | null
    solicitanteSexo?: string | null
    requeridoNombre?: string | null
    requeridoSexo?: string | null
    fechaEntrevista?: string | null
    estadoJudicial?: string | null
    fechaDemanda?: string | null
    numExpedienteJudicial?: string | null
    juzgado?: string | null
    resultadoEntrevista?: string | null
    sentencia1ra?: string | null
    sentencia2da?: string | null
    casacion?: string | null
    fechaSalida?: string | null
    motivoCierre?: string | null
    retorno?: string | null
    observaciones?: string | null
    bitacora?: Array<{ fecha: string; texto: string }>
}

export function descargarExcelSustracion(casos: SustracionExportRow[]) {
    const fechaEs = (value?: string | null) => {
        if (!value) return ''
        const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
        if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'dd/MM/yyyy')
    }

    const filas = casos.flatMap(c => {
        const nnas = c.nna?.length ? c.nna : [{
            nombres: c.nnaNombres || c.nnaNombre || '',
            primerApellido: c.nnaPrimerApellido || '',
            segundoApellido: c.nnaSegundoApellido,
            sexo: c.nnaSexo,
            fechaNacimiento: c.nnaFechaNac,
            edad: c.nnaEdad,
            tipoEdad: c.nnaTipoEdad,
        }]
        const ultimaGestion = [...(c.bitacora || [])]
            .filter(b => !b.texto.startsWith('__JUD__:'))
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .at(-1)

        return nnas.map((nna, nnaIndex) => ({
            'Hoja de Trámite': c.codigo,
            'NNA N.°': nnaIndex + 1,
            'N.° de NNA': nnas.length,
            'Nombres': nna.nombres || '',
            'Primer Apellido': nna.primerApellido || '',
            'Segundo Apellido': nna.segundoApellido || '',
            'NNA Nombre Completo': [nna.nombres, nna.primerApellido, nna.segundoApellido].filter(Boolean).join(' '),
            'Sexo NNA': nna.sexo || '',
            'Fecha Nacimiento': fechaEs(nna.fechaNacimiento),
            'Edad': nna.edad || '',
            'Tipo Edad': nna.tipoEdad || '',
            'Estado Solicitud': c.estado,
            'Profesional': c.profesional || '',
            'Fecha Ingreso Solicitud': fechaEs(c.fechaIngreso),
            'Etapa': c.etapa || '',
            'Tipo de Solicitud': c.tipoSolicitud || '',
            'AC Perú': c.acPeru || '',
            'País': c.pais,
            'Nombre del Solicitante': c.solicitanteNombre || '',
            'Sexo Solicitante': c.solicitanteSexo || '',
            'Nombre de la Persona Requerida': c.requeridoNombre || '',
            'Sexo Persona Requerida': c.requeridoSexo || '',
            'Fecha Entrevista': fechaEs(c.fechaEntrevista),
            'Resultado Entrevista': c.resultadoEntrevista || '',
            'Última Gestión': ultimaGestion ? `${fechaEs(ultimaGestion.fecha)} - ${ultimaGestion.texto}` : '',
            'Estado Judicial': c.estadoJudicial || '',
            'Fecha Demanda': fechaEs(c.fechaDemanda),
            'N.° Expediente Judicial': c.numExpedienteJudicial || '',
            'Juzgado': c.juzgado || '',
            'Sentencia 1ra Instancia': c.sentencia1ra || '',
            'Sentencia 2da Instancia': c.sentencia2da || '',
            'Casación': c.casacion || '',
            'Fecha Cierre': fechaEs(c.fechaSalida),
            'Retorno': c.retorno || '',
            'Motivo de Cierre': c.motivoCierre || '',
            'Observaciones': c.observaciones || '',
        }))
    })

    const datos = filas.map((fila, index) => ({ 'N.°': index + 1, ...fila }))

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sustracion_Internacional');

    ws['!cols'] = [
        { wch:5 }, { wch:20 }, { wch:8 }, { wch:10 }, { wch:22 }, { wch:18 }, { wch:18 },
        { wch:38 }, { wch:12 }, { wch:16 }, { wch:8 }, { wch:12 }, { wch:16 }, { wch:18 },
        { wch:20 }, { wch:16 }, { wch:20 }, { wch:14 }, { wch:18 }, { wch:32 }, { wch:16 },
        { wch:34 }, { wch:18 }, { wch:16 }, { wch:22 }, { wch:60 }, { wch:22 }, { wch:16 },
        { wch:24 }, { wch:32 }, { wch:32 }, { wch:32 }, { wch:28 }, { wch:16 }, { wch:14 },
        { wch:32 }, { wch:50 },
    ];

    const hoy = new Date();
    const nombreArchivo = `Sustracion_DGNNA_${hoy.getFullYear()}_${String(hoy.getMonth() + 1).padStart(2, '0')}_${String(hoy.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
}

export function descargarExcelTransparencia(registros: TransparenciaRegistro[]) {
    const datos = registros.map((r, index) => ({
        'N°':                  index + 1,
        'N° Expediente':       r.numeroExpediente,
        'Fecha Ingreso':       r.fechaIngreso ? format(new Date(r.fechaIngreso), 'dd/MM/yyyy') : '',
        'Plazo Vencimiento':   r.plazoVencimiento ? format(new Date(r.plazoVencimiento), 'dd/MM/yyyy') : '',
        'Documento Ingreso':   r.documentoIngreso || '',
        'Dirección':           r.direccion,
        'Asunto':              r.asunto,
        'Categoría':           r.categoria || '',
        'Estado':              r.estado,
        'Fecha Atención':      r.fechaAtencion ? format(new Date(r.fechaAtencion), 'dd/MM/yyyy') : '',
        'Documento Respuesta': r.documentoRespuesta || '',
        'Observaciones':       r.observaciones || '',
        'Creado por':          r.creadoPor || '',
    }))

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transparencia')

    ws['!cols'] = [
        { wch: 5 },   // N°
        { wch: 25 },  // N° Expediente
        { wch: 14 },  // Fecha Ingreso
        { wch: 16 },  // Plazo Vencimiento
        { wch: 30 },  // Documento Ingreso
        { wch: 12 },  // Dirección
        { wch: 60 },  // Asunto
        { wch: 20 },  // Categoría
        { wch: 12 },  // Estado
        { wch: 14 },  // Fecha Atención
        { wch: 30 },  // Documento Respuesta
        { wch: 40 },  // Observaciones
        { wch: 20 },  // Creado por
    ]

    const hoy = new Date()
    const nombreArchivo = `Transparencia_DGNNA_${hoy.getFullYear()}_${String(hoy.getMonth() + 1).padStart(2, '0')}_${String(hoy.getDate()).padStart(2, '0')}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
}
