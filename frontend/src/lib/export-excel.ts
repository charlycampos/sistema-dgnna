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
        'Apelante': a.apelante,
        'NNA o CAR': a.nnaCar || '',
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
        'Fecha Revisor': a.fechaRevisor ? format(new Date(a.fechaRevisor), 'dd/MM/yyyy') : '',
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
        { wch: 15 },  // Fecha Revisor
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
    nnaNombre: string
    nnaEdad?: string | null
    nnaTipoEdad?: string | null
    pais: string
    profesional?: string | null
    fechaIngreso?: string | null
    estado: string
    etapa?: string | null
    solicitanteNombre?: string | null
    requeridoNombre?: string | null
    estadoJudicial?: string | null
    fechaDemanda?: string | null
    numExpedienteJudicial?: string | null
    juzgado?: string | null
    resultadoEntrevista?: string | null
    retorno?: string | null
    observaciones?: string | null
}

export function descargarExcelSustracion(casos: SustracionExportRow[]) {
    const datos = casos.map((c, index) => ({
        'N°': index + 1,
        'Código/HT': c.codigo,
        'NNA Nombre': c.nnaNombre,
        'NNA Edad': `${c.nnaEdad || ''} ${c.nnaTipoEdad || ''}`,
        'País': c.pais,
        'Profesional': c.profesional || '—',
        'Fecha Ingreso': c.fechaIngreso ? format(new Date(c.fechaIngreso), 'dd/MM/yyyy') : '',
        'Estado': c.estado,
        'Etapa': c.etapa || '—',
        'Solicitante': c.solicitanteNombre || '',
        'Requerido': c.requeridoNombre || '',
        'Etapa Judicial': c.estadoJudicial || '—',
        'F. Demanda': c.fechaDemanda || '',
        'Exp. Judicial': c.numExpedienteJudicial || '',
        'Juzgado': c.juzgado || '',
        'Resultado Entrevista': c.resultadoEntrevista || '—',
        'Retorno': c.retorno || '—',
        'Observaciones': c.observaciones || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sustracion_Internacional');

    ws['!cols'] = [
        { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 15 },
        { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 30 },
        { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 25 },
        { wch: 20 }, { wch: 10 }, { wch: 40 }
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
