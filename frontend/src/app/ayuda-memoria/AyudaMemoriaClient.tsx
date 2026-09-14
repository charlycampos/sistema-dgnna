'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  FileText,
  Plus,
  Search,
  Building2,
  Users,
  ShieldAlert,
  Scale,
  Share2,
  LayoutDashboard,
  Download,
  Printer,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Edit3,
  Trash2,
  Upload,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  RefreshCw,
  Sparkles,
  Save,
  Check,
  X,
  Copy,
  Eye,
  PowerOff,
  CheckCheck,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
}

export type DireccionCodigo = 'DPE' | 'DA' | 'DSLD' | 'DPNNA' | 'COLABORATIVO' | 'CONSOLIDADO'

const DIRECCIONES_CONFIG: Record<string, { nombre: string; descripcion: string; icono: any; badgeBg: string; textCol: string }> = {
  DPE: {
    nombre: 'Dirección de Protección Especial',
    descripcion: 'Centros de Acogida Residencial (CAR), Acreditación, Unidades de Protección Especial (UPE) y Familias Acogedoras.',
    icono: ShieldAlert,
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    textCol: 'text-indigo-700',
  },
  DA: {
    nombre: 'Dirección de Adopciones',
    descripcion: 'Procedimientos administrativos de adopción, evaluaciones de idoneidad y seguimiento post-adoptivo.',
    icono: Scale,
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    textCol: 'text-amber-700',
  },
  DSLD: {
    nombre: 'Dirección de Sistemas Locales y Defensorías',
    descripcion: 'Acreditación y supervisión de DEMUNAs, y despliegue de la Estrategia Juguemos en tu DEMUNA.',
    icono: Building2,
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    textCol: 'text-blue-700',
  },
  DPNNA: {
    nombre: 'Dirección de Políticas de Niñas, Niños y Adolescentes',
    descripcion: 'CCONNA, COMUDENNA, Línea ANNA 1810 y campañas nacionales de prevención y sensibilización.',
    icono: Users,
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textCol: 'text-emerald-700',
  },
  COLABORATIVO: {
    nombre: 'Espacio Colaborativo Inter-Direcciones',
    descripcion: 'Reportes compartidos que combinan indicadores de múltiples direcciones y casos sensibles vinculados.',
    icono: Share2,
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    textCol: 'text-purple-700',
  },
  CONSOLIDADO: {
    nombre: 'Consolidado Ejecutivo DGNNA',
    descripcion: 'Supervisión integral de cortes mensuales, estado de avance de bloques y generación de informes a Alta Dirección.',
    icono: LayoutDashboard,
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    textCol: 'text-slate-800',
  },
}

const DEPARTAMENTOS_PERU = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
]

const COLORS_CHART = ['#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface SeccionItem {
  seccionId: string
  orden: number
  titulo: string
  tipoSeccion: string
  guiaLlenado?: string
  direccionSugerida?: string
  configuracionJson?: string
  valorId?: string
  textoContenido?: string
  datosTablaJson?: string
  datosGraficoJson?: string
  cifraCorte?: string
}

interface AccionItem {
  id: string
  fecha: string
  institucion?: string
  descripcion: string
  creadoPor?: string
  createdAt?: string
}

interface DocumentoItem {
  id: string
  codigoInterno: string
  titulo: string
  region?: string
  fechaCorte?: string
  estado: string
  direccion: string
  nivelRiesgo?: string
  servicioMimp?: string
  plantillaId?: string
  plantillaNombre?: string
  creadoPor?: string
  publicadoPor?: string
  publicadoAt?: string
  hashIntegridad?: string
  versionDoc?: string
  documentoOrigenId?: string
  observacionesRevision?: string
  updatedAt?: string
  secciones?: SeccionItem[]
  acciones?: AccionItem[]
}

interface PlantillaItem {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  tipoAmbito: string
  direccionDuena: string
  esOficial: boolean
  version?: string
  estadoPlantilla?: string
  plantillaOrigenId?: string
  numSecciones: number
  secciones: {
    id: string
    orden: number
    titulo: string
    tipoSeccion: string
    guiaLlenado?: string
    direccionSugerida?: string
    configuracionJson?: string
  }[]
}

export default function AyudaMemoriaClient({ session }: Props) {
  const isAdmin = session.rol === 'admin'
  const [vistaPrincipal, setVistaPrincipal] = useState<'DOCUMENTOS' | 'PLANTILLAS'>('DOCUMENTOS')
  const [direccionActiva, setDireccionActiva] = useState<DireccionCodigo>('DPE')
  const [regionSeleccionada, setRegionSeleccionada] = useState<string>('TODAS')
  const [ambitoFiltro, setAmbitoFiltro] = useState<'TODOS' | 'NACIONAL' | 'REGIONAL'>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')

  // Estados de datos
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([])
  const [plantillas, setPlantillas] = useState<PlantillaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Documento activo en edición
  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoItem | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [seccionesColapsadas, setSeccionesColapsadas] = useState<Record<string, boolean>>({})
  const [seccionActivaId, setSeccionActivaId] = useState<string | null>(null)

  // Modales
  const [modalNuevoDocOpen, setModalNuevoDocOpen] = useState(false)
  const [modalNuevaPlantillaOpen, setModalNuevaPlantillaOpen] = useState(false)
  const [modalAccionOpen, setModalAccionOpen] = useState(false)

  // Modal Clonar Plantilla
  const [modalClonarOpen, setModalClonarOpen] = useState(false)
  const [plantillaAClonar, setPlantillaAClonar] = useState<PlantillaItem | null>(null)
  const [clonNuevaVersion, setClonNuevaVersion] = useState('2.0')
  const [clonNuevoNombre, setClonNuevoNombre] = useState('')

  // Modal Preview Plantilla
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false)
  const [plantillaPreview, setPlantillaPreview] = useState<PlantillaItem | null>(null)

  // Modal Observar Documento
  const [modalObservarOpen, setModalObservarOpen] = useState(false)
  const [textoObservaciones, setTextoObservaciones] = useState('')

  // Modal Versionar Documento Publicado
  const [modalVersionarDocOpen, setModalVersionarDocOpen] = useState(false)
  const [versionDocNueva, setVersionDocNueva] = useState('2.0')
  const [versionDocMotivo, setVersionDocMotivo] = useState('')

  // Formulario nuevo doc
  const [nuevoPlantillaId, setNuevoPlantillaId] = useState('')
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevaRegion, setNuevaRegion] = useState('')
  const [nuevaFechaCorte, setNuevaFechaCorte] = useState('Septiembre 2026')
  const [nuevoNivelRiesgo, setNuevoNivelRiesgo] = useState('MODERADO')
  const [nuevoServicioMimp, setNuevoServicioMimp] = useState('')

  // Formulario nueva acción bitácora
  const [accionFecha, setAccionFecha] = useState('')
  const [accionInstitucion, setAccionInstitucion] = useState('UPE')
  const [accionDescripcion, setAccionDescripcion] = useState('')

  // Formulario diseñador de nueva plantilla (Asistente 3 pasos)
  const [pasoDisenador, setPasoDisenador] = useState<1 | 2 | 3>(1)
  const [plantillaCodigoCustom, setPlantillaCodigoCustom] = useState('')
  const [plantillaNombre, setPlantillaNombre] = useState('')
  const [plantillaDesc, setPlantillaDesc] = useState('')
  const [plantillaAmbito, setPlantillaAmbito] = useState('NACIONAL')
  const [plantillaDireccion, setPlantillaDireccion] = useState('DPE')
  const [plantillaSecciones, setPlantillaSecciones] = useState<
    { orden: number; titulo: string; tipoSeccion: string; guiaLlenado: string; columnas: string }[]
  >([
    { orden: 1, titulo: 'Resumen Ejecutivo', tipoSeccion: 'TEXTO', guiaLlenado: 'Antecedentes y contexto general.', columnas: '' },
    { orden: 2, titulo: 'Cuadro de Cobertura y Metas', tipoSeccion: 'TABLA_DATOS', guiaLlenado: 'Ingrese las cifras desagregadas.', columnas: 'Provincia, Distrito, Total_Atendidos, Meta, Porcentaje' }
  ])

  // Cargar datos al inicio
  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [resDocs, resPlt] = await Promise.all([
        fetch('/api/ayuda-memoria/documentos'),
        fetch('/api/ayuda-memoria/plantillas')
      ])

      if (resDocs.ok) {
        const dataDocs = await resDocs.json()
        setDocumentos(dataDocs)
      }
      if (resPlt.ok) {
        const dataPlt = await resPlt.json()
        setPlantillas(dataPlt)
        if (dataPlt.length > 0 && !nuevoPlantillaId) {
          setNuevoPlantillaId(dataPlt[0].id)
        }
      }
    } catch (error) {
      toast.error('Error al conectar con el servicio de Ayuda Memoria')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Publicar Plantilla (Admin)
  const handlePublicarPlantilla = async (pltId: string) => {
    try {
      const res = await fetch(`/api/ayuda-memoria/plantillas/${pltId}/publicar`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success('Plantilla publicada en estado VIGENTE')
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al publicar plantilla')
      }
    } catch (e) {
      toast.error('Error de red al publicar plantilla')
    }
  }

  // Retirar Plantilla (Admin)
  const handleRetirarPlantilla = async (pltId: string) => {
    try {
      const res = await fetch(`/api/ayuda-memoria/plantillas/${pltId}/retirar`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success('Plantilla marcada como RETIRADA')
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al retirar plantilla')
      }
    } catch (e) {
      toast.error('Error de red al retirar plantilla')
    }
  }

  // Clonar Plantilla a nueva versión
  const handleEjecutarClon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plantillaAClonar) return
    try {
      const res = await fetch(`/api/ayuda-memoria/plantillas/${plantillaAClonar.id}/clonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevaVersion: clonNuevaVersion,
          nuevoNombre: clonNuevoNombre || undefined
        })
      })
      if (res.ok) {
        toast.success('Nueva versión creada en estado BORRADOR')
        setModalClonarOpen(false)
        setPlantillaAClonar(null)
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al clonar plantilla')
      }
    } catch (e) {
      toast.error('Error de red al clonar plantilla')
    }
  }

  // Abrir y cargar un documento específico
  const abrirDocumento = async (docId: string) => {
    setLoadingDoc(true)
    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docId}`)
      if (res.ok) {
        const data = await res.json()
        setDocSeleccionado(data)
      } else {
        toast.error('No se pudo cargar el documento')
      }
    } catch (e) {
      toast.error('Error al cargar detalle del documento')
    } finally {
      setLoadingDoc(false)
    }
  }

  // Guardar documento
  const guardarDocumento = async (nuevoEstado?: string) => {
    if (!docSeleccionado) return
    setGuardando(true)
    try {
      const payload = {
        titulo: docSeleccionado.titulo,
        region: docSeleccionado.region,
        fechaCorte: docSeleccionado.fechaCorte,
        estado: nuevoEstado || docSeleccionado.estado,
        direccion: docSeleccionado.direccion,
        nivelRiesgo: docSeleccionado.nivelRiesgo,
        servicioMimp: docSeleccionado.servicioMimp,
        valores: (docSeleccionado.secciones || []).map(s => ({
          seccionId: s.seccionId,
          textoContenido: s.textoContenido || '',
          datosTablaJson: s.datosTablaJson || null,
          datosGraficoJson: s.datosGraficoJson || null,
          cifraCorte: s.cifraCorte || null
        }))
      }

      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success(nuevoEstado === 'PUBLICADO' ? '¡Ayuda Memoria publicada con éxito!' : 'Borrador guardado correctamente')
        if (nuevoEstado) {
          setDocSeleccionado({ ...docSeleccionado, estado: nuevoEstado })
        }
        cargarDatos()
      } else {
        toast.error('Error al guardar cambios')
      }
    } catch (e) {
      toast.error('Error de red al guardar')
    } finally {
      setGuardando(false)
    }
  }

  // Enviar a Revisión
  const handleEnviarRevision = async () => {
    if (!docSeleccionado) return
    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}/revisar`, { method: 'POST' })
      if (res.ok) {
        toast.success('Documento enviado a revisión institucional')
        abrirDocumento(docSeleccionado.id)
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al enviar a revisión')
      }
    } catch {
      toast.error('Error de red al enviar a revisión')
    }
  }

  // Observar Documento
  const handleObservarDocumento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docSeleccionado || !textoObservaciones.trim()) return
    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}/observar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: textoObservaciones.trim() })
      })
      if (res.ok) {
        toast.success('Observaciones registradas en el documento')
        setModalObservarOpen(false)
        setTextoObservaciones('')
        abrirDocumento(docSeleccionado.id)
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al formular observaciones')
      }
    } catch {
      toast.error('Error de red al observar documento')
    }
  }

  // Aprobar Documento
  const handleAprobarDocumento = async () => {
    if (!docSeleccionado) return
    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}/aprobar`, { method: 'POST' })
      if (res.ok) {
        toast.success('Documento APROBADO, listo para publicación')
        abrirDocumento(docSeleccionado.id)
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al aprobar documento')
      }
    } catch {
      toast.error('Error de red al aprobar documento')
    }
  }

  // Sellar y Publicar Inmutable con Hash SHA-256
  const handlePublicarConHash = async () => {
    if (!docSeleccionado) return
    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}/publicar`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success(`¡Documento PUBLICADO y SELLADO! Hash: ${data.hashIntegridad.substring(0, 8)}...`)
        abrirDocumento(docSeleccionado.id)
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al publicar documento')
      }
    } catch {
      toast.error('Error de red al publicar documento')
    }
  }

  // Crear Nueva Versión de Corrección desde un Documento Publicado
  const handleCrearNuevaVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docSeleccionado) return
    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}/versionar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevaVersion: versionDocNueva,
          motivo: versionDocMotivo || undefined
        })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Nueva versión generada: ${data.codigoInterno} (v${data.versionDoc})`)
        setModalVersionarDocOpen(false)
        await cargarDatos()
        abrirDocumento(data.id)
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al versionar documento')
      }
    } catch {
      toast.error('Error de red al crear nueva versión')
    }
  }


  // Crear nuevo documento
  const handleCrearDocumento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoPlantillaId || !nuevoTitulo.trim()) {
      toast.warning('Complete el título y seleccione una plantilla')
      return
    }

    try {
      const payload = {
        plantillaId: nuevoPlantillaId,
        titulo: nuevoTitulo.trim(),
        region: nuevaRegion === 'TODAS' ? null : nuevaRegion,
        fechaCorte: nuevaFechaCorte,
        direccion: direccionActiva === 'CONSOLIDADO' || direccionActiva === 'COLABORATIVO' ? 'DPE' : direccionActiva,
        nivelRiesgo: nuevoNivelRiesgo,
        servicioMimp: nuevoServicioMimp
      }

      const res = await fetch('/api/ayuda-memoria/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Ayuda Memoria creada: ${data.codigoInterno}`)
        setModalNuevoDocOpen(false)
        setNuevoTitulo('')
        await cargarDatos()
        abrirDocumento(data.id)
      } else {
        toast.error('Error al crear documento')
      }
    } catch (error) {
      toast.error('Error al comunicarse con el servidor')
    }
  }

  // Agregar acción a la bitácora
  const handleAgregarAccion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docSeleccionado || !accionFecha || !accionDescripcion.trim()) {
      toast.warning('Complete la fecha y la descripción de la acción')
      return
    }

    try {
      const res = await fetch(`/api/ayuda-memoria/documentos/${docSeleccionado.id}/acciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: accionFecha,
          institucion: accionInstitucion,
          descripcion: accionDescripcion
        })
      })

      if (res.ok) {
        const nuevaAccion = await res.json()
        toast.success('Acción registrada en la bitácora histórica')
        setDocSeleccionado({
          ...docSeleccionado,
          acciones: [...(docSeleccionado.acciones || []), nuevaAccion]
        })
        setModalAccionOpen(false)
        setAccionFecha('')
        setAccionDescripcion('')
      } else {
        toast.error('Error al registrar acción')
      }
    } catch (e) {
      toast.error('Error al guardar acción')
    }
  }

  // Descargar Word
  const descargarWord = (docId: string, codigo: string) => {
    toast.info('Generando documento oficial en Word (.docx)...')
    const link = document.createElement('a')
    link.href = `/api/ayuda-memoria/documentos/${docId}/exportar-docx`
    link.download = `${codigo}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Imprimir / Guardar en PDF con formato institucional
  const imprimirPDF = () => {
    window.print()
  }

  // Guardar nueva plantilla personalizada
  const handleGuardarPlantilla = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plantillaNombre.trim()) {
      toast.warning('Ingrese el nombre de la plantilla')
      return
    }

    try {
      const payload = {
        codigo: plantillaCodigoCustom.trim() || undefined,
        nombre: plantillaNombre.trim(),
        descripcion: plantillaDesc,
        tipoAmbito: plantillaAmbito,
        direccionDuena: plantillaDireccion,
        esOficial: false,
        version: "1.0",
        estadoPlantilla: "BORRADOR",
        secciones: plantillaSecciones.map((s, idx) => {
          let configJson = null
          if (s.tipoSeccion === 'TABLA_DATOS' && s.columnas) {
            const cols = s.columnas.split(',').map(c => c.trim()).filter(Boolean)
            const filaEjemplo: Record<string, any> = {}
            cols.forEach(c => { filaEjemplo[c] = '' })
            configJson = JSON.stringify([filaEjemplo])
          }
          return {
            orden: idx + 1,
            titulo: s.titulo,
            tipoSeccion: s.tipoSeccion,
            guiaLlenado: s.guiaLlenado,
            direccionSugerida: plantillaDireccion,
            configuracionJson: configJson
          }
        })
      }

      const res = await fetch('/api/ayuda-memoria/plantillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success('Nueva plantilla de formulario guardada en el catálogo (BORRADOR)')
        setModalNuevaPlantillaOpen(false)
        setPasoDisenador(1)
        setPlantillaCodigoCustom('')
        setPlantillaNombre('')
        setPlantillaDesc('')
        cargarDatos()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Error al guardar plantilla')
      }
    } catch (e) {
      toast.error('Error de red al guardar plantilla')
    }
  }

  // Importar Excel a una tabla de sección (Validación Robusta e Ingesta Segura)
  const handleImportarExcel = (e: React.ChangeEvent<HTMLInputElement>, seccionId: string) => {
    const file = e.target.files?.[0]
    if (!file || !docSeleccionado) return

    // 1. Validar extensión de archivo
    const nombre = file.name.toLowerCase()
    if (!nombre.endsWith('.xlsx') && !nombre.endsWith('.xls')) {
      toast.error('Formato no soportado. Debe seleccionar un archivo Excel (.xlsx o .xls)')
      e.target.value = ''
      return
    }

    // 2. Validar tamaño máximo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo permitido de 5 MB')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          toast.error('El libro de Excel no contiene hojas de cálculo')
          return
        }

        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

        if (!Array.isArray(data) || data.length === 0) {
          toast.warning('La hoja de cálculo está vacía o no contiene filas de datos legibles')
          return
        }

        // Sanitizar encabezados y valores (evitar inyecciones o caracteres extraños)
        const sanitizadas = data.map(fila => {
          const nueva: Record<string, any> = {}
          Object.entries(fila).forEach(([k, v]) => {
            const claveLimpia = String(k).trim().replace(/\s+/g, '_')
            nueva[claveLimpia] = v !== undefined && v !== null ? String(v) : ''
          })
          return nueva
        })

        const nuevasSecciones = (docSeleccionado.secciones || []).map(s => {
          if (s.seccionId === seccionId) {
            return { ...s, datosTablaJson: JSON.stringify(sanitizadas) }
          }
          return s
        })

        setDocSeleccionado({ ...docSeleccionado, secciones: nuevasSecciones })
        toast.success(`Se importaron ${sanitizadas.length} registros desde "${file.name}" exitosamente`)
      } catch (err) {
        toast.error('Error al procesar el archivo Excel. Verifique que no esté dañado o protegido con contraseña')
      } finally {
        e.target.value = ''
      }
    }
    reader.onerror = () => {
      toast.error('Error al leer el archivo en el navegador')
      e.target.value = ''
    }
    reader.readAsBinaryString(file)
  }

  // Filtrado de documentos
  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      // Filtro por dirección
      if (direccionActiva !== 'CONSOLIDADO' && direccionActiva !== 'COLABORATIVO') {
        if (doc.direccion !== direccionActiva) return false
      }
      // Filtro por región
      if (regionSeleccionada !== 'TODAS') {
        if (doc.region !== regionSeleccionada) return false
      }
      // Filtro por ámbito
      if (ambitoFiltro === 'NACIONAL' && doc.region) return false
      if (ambitoFiltro === 'REGIONAL' && !doc.region) return false

      // Filtro por estado
      if (filtroEstado !== 'TODOS' && doc.estado !== filtroEstado) return false

      // Filtro por búsqueda
      if (busqueda.trim()) {
        const term = busqueda.toLowerCase()
        const coincideTitulo = doc.titulo.toLowerCase().includes(term)
        const coincideCodigo = doc.codigoInterno.toLowerCase().includes(term)
        const coincideRegion = (doc.region || '').toLowerCase().includes(term)
        if (!coincideTitulo && !coincideCodigo && !coincideRegion) return false
      }

      return true
    })
  }, [documentos, direccionActiva, regionSeleccionada, ambitoFiltro, filtroEstado, busqueda])

  // Contadores de estado
  const contadores = useMemo(() => {
    const total = documentosFiltrados.length
    const publicados = documentosFiltrados.filter(d => d.estado === 'PUBLICADO').length
    const actualizados = documentosFiltrados.filter(d => d.estado === 'ACTUALIZADO').length
    const borradores = documentosFiltrados.filter(d => d.estado === 'BORRADOR').length
    return { total, publicados, actualizados, borradores }
  }, [documentosFiltrados])

  // Cálculo dinámico de completitud de documento seleccionado
  const estadisticasDocSeleccionado = useMemo(() => {
    if (!docSeleccionado || !docSeleccionado.secciones || docSeleccionado.secciones.length === 0) {
      return { total: 0, completadas: 0, porcentaje: 0, estadosSecciones: {} as Record<string, boolean> }
    }
    const total = docSeleccionado.secciones.length
    let completadas = 0
    const estadosSecciones: Record<string, boolean> = {}

    docSeleccionado.secciones.forEach((sec) => {
      let estaCompleta = false
      if (sec.tipoSeccion === 'TEXTO' || sec.tipoSeccion === 'CONCLUSIONES') {
        estaCompleta = Boolean(sec.textoContenido && sec.textoContenido.trim().length > 10)
      } else if (sec.tipoSeccion === 'TABLA_DATOS') {
        try {
          const filas = sec.datosTablaJson ? JSON.parse(sec.datosTablaJson) : []
          estaCompleta = Array.isArray(filas) && filas.length > 0
        } catch {
          estaCompleta = false
        }
      } else if (sec.tipoSeccion === 'BITACORA') {
        estaCompleta = Boolean(docSeleccionado.acciones && docSeleccionado.acciones.length > 0)
      } else {
        estaCompleta = Boolean(sec.textoContenido || sec.datosTablaJson || sec.cifraCorte)
      }

      estadosSecciones[sec.seccionId] = estaCompleta
      if (estaCompleta) completadas += 1
    })

    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0
    return { total, completadas, porcentaje, estadosSecciones }
  }, [docSeleccionado])

  const toggleColapsoSeccion = (seccionId: string) => {
    setSeccionesColapsadas(prev => ({
      ...prev,
      [seccionId]: !prev[seccionId]
    }))
  }

  const colapsarTodas = (colapsar: boolean) => {
    if (!docSeleccionado?.secciones) return
    const newState: Record<string, boolean> = {}
    docSeleccionado.secciones.forEach(s => {
      newState[s.seccionId] = colapsar
    })
    setSeccionesColapsadas(newState)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* ─── Header Principal ───────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/menu"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
              title="Volver al Menú Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Módulo de Ayuda Memoria Institucional
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold border border-sky-200">
                  DGNNA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Generación descentralizada de reportes temáticos por dirección y seguimiento de casos emblemáticos
              </p>
            </div>
          </div>

          {/* Botones de acción principales */}
          <div className="flex items-center gap-2.5">
            {/* Selector de Pestaña Principal */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs font-semibold mr-2">
              <button
                onClick={() => setVistaPrincipal('DOCUMENTOS')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  vistaPrincipal === 'DOCUMENTOS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                Ayudas Memoria ({documentos.length})
              </button>
              <button
                onClick={() => setVistaPrincipal('PLANTILLAS')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  vistaPrincipal === 'PLANTILLAS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Catálogo de Plantillas ({plantillas.length})
              </button>
            </div>

            <button
              onClick={() => setModalNuevaPlantillaOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              Diseñar Nueva Plantilla
            </button>
            <button
              onClick={() => setModalNuevoDocOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nueva Ayuda Memoria
            </button>
          </div>
        </div>

        {/* ─── Navegador Ergonómico por Direcciones de Línea ──────────── */}
        <div className="w-full px-6 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
            {(['DPE', 'DA', 'DSLD', 'DPNNA', 'COLABORATIVO', 'CONSOLIDADO'] as DireccionCodigo[]).map((dirKey) => {
              const conf = DIRECCIONES_CONFIG[dirKey]
              const Icono = conf.icono
              const isActive = direccionActiva === dirKey

              return (
                <button
                  key={dirKey}
                  onClick={() => {
                    setDireccionActiva(dirKey)
                    setDocSeleccionado(null)
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border-slate-300 ring-2 ring-sky-500/20'
                      : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Icono className={`w-4 h-4 ${isActive ? conf.textCol : 'text-slate-500'}`} />
                  <span>{dirKey === 'COLABORATIVO' ? 'Colaborativo' : dirKey === 'CONSOLIDADO' ? 'Consolidado Ejecutivo' : dirKey}</span>
                  {dirKey !== 'COLABORATIVO' && dirKey !== 'CONSOLIDADO' && (
                    <span className="text-[10px] text-slate-500 font-normal hidden lg:inline">
                      ({conf.nombre.split(' ')[2] || ''})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ─── Contenedor Principal (100% de Ancho sin sidebars intrusivos) ─── */}
      <main className="w-full px-6 pt-6">
        {/* Banner informativo de la Dirección Activa */}
        <div className="mb-6 p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border ${DIRECCIONES_CONFIG[direccionActiva].badgeBg}`}>
              {React.createElement(DIRECCIONES_CONFIG[direccionActiva].icono, { className: 'w-5 h-5' })}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {DIRECCIONES_CONFIG[direccionActiva].nombre}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                {DIRECCIONES_CONFIG[direccionActiva].descripcion}
              </p>
            </div>
          </div>

          {/* Filtro Territorial y Ámbito (Viajes de Despacho) */}
          {vistaPrincipal === 'DOCUMENTOS' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setAmbitoFiltro('TODOS')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    ambitoFiltro === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setAmbitoFiltro('NACIONAL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    ambitoFiltro === 'NACIONAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nacional
                </button>
                <button
                  onClick={() => setAmbitoFiltro('REGIONAL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    ambitoFiltro === 'REGIONAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Regional
                </button>
              </div>

              {/* Selector de Departamento */}
              <div className="relative">
                <select
                  value={regionSeleccionada}
                  onChange={(e) => setRegionSeleccionada(e.target.value)}
                  className="text-xs py-1.5 pl-3 pr-8 rounded-lg bg-white border border-slate-300 font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="TODAS">📍 Todas las regiones</option>
                  {DEPARTAMENTOS_PERU.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ─── VISTA: CATÁLOGO DE PLANTILLAS V2 ────────────────────────── */}
        {vistaPrincipal === 'PLANTILLAS' ? (
          <div className="space-y-6">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Catálogo Oficial y Formatos Personalizados
                </h3>
                <p className="text-xs text-slate-500">
                  Plantillas modulares con versionado formal y ciclo de vida institucional
                </p>
              </div>
              <button
                onClick={() => setModalNuevaPlantillaOpen(true)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Crear Formato desde Cero
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {plantillas.map((plt) => {
                const estado = plt.estadoPlantilla || 'VIGENTE'
                const version = plt.version || '1.0'

                return (
                  <div
                    key={plt.id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {plt.codigo}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Badge de Versión */}
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                            v{version}
                          </span>
                          {/* Badge de Estado del Ciclo de Vida */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              estado === 'VIGENTE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : estado === 'BORRADOR'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : estado === 'EN_REVISION'
                                ? 'bg-sky-50 text-sky-700 border-sky-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {estado}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-1 leading-snug group-hover:text-indigo-600 transition-colors">
                        {plt.nombre}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                        {plt.descripcion || 'Formato estándar institucional para reportes temáticos.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 mb-2">
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          🏛️ {plt.direccionDuena}
                        </span>
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          📍 {plt.tipoAmbito}
                        </span>
                        <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          📑 {plt.secciones?.length || plt.numSecciones || 0} Bloques
                        </span>
                      </div>
                    </div>

                    {/* Barra de Acciones de la Plantilla */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setPlantillaPreview(plt)
                          setModalPreviewOpen(true)
                        }}
                        className="p-1.5 text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md font-semibold flex items-center gap-1 transition-colors"
                        title="Ver estructura y bloques"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Vista Previa
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setPlantillaAClonar(plt)
                            const [maj, min] = (plt.version || '1.0').split('.')
                            const nextV = maj ? `${parseInt(maj, 10) + 1}.0` : '2.0'
                            setClonNuevaVersion(nextV)
                            setClonNuevoNombre(`${plt.nombre} (v${nextV})`)
                            setModalClonarOpen(true)
                          }}
                          className="p-1.5 text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md font-semibold flex items-center gap-1 transition-colors"
                          title="Clonar a nueva versión"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Clonar
                        </button>

                        {isAdmin && estado === 'BORRADOR' && (
                          <button
                            onClick={() => handlePublicarPlantilla(plt.id)}
                            className="p-1.5 text-xs text-emerald-700 hover:bg-emerald-100/70 rounded-md font-bold flex items-center gap-1 transition-colors"
                            title="Publicar versión como Vigente"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Publicar
                          </button>
                        )}

                        {isAdmin && estado === 'VIGENTE' && (
                          <button
                            onClick={() => handleRetirarPlantilla(plt.id)}
                            className="p-1.5 text-xs text-rose-700 hover:bg-rose-100/70 rounded-md font-bold flex items-center gap-1 transition-colors"
                            title="Retirar plantilla del catálogo"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                            Retirar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <>
            {/* ─── Fila de Métricas / Semáforo de Avance ───────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Registros</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{contadores.total}</div>
                <span className="text-[11px] text-slate-500">En vista seleccionada</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-medium">Publicados / Oficial</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{contadores.publicados}</div>
                <span className="text-[11px] text-emerald-600">Listos para Despacho</span>
              </div>
              <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sky-800 font-medium">Actualizados</span>
                  <RefreshCw className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-2xl font-bold text-sky-700 mt-1">{contadores.actualizados}</div>
                <span className="text-[11px] text-sky-600">Cifras al día</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-800 font-medium">En Borrador</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-700 mt-1">{contadores.borradores}</div>
                <span className="text-[11px] text-amber-600">En edición</span>
              </div>
            </div>

            {/* ─── Filtros de Búsqueda y Grilla Principal ─────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[260px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por título, código o región..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Estado:</span>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-700"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="PUBLICADO">Publicado</option>
                    <option value="ACTUALIZADO">Actualizado</option>
                    <option value="BORRADOR">Borrador</option>
                  </select>
                </div>
              </div>

              {/* Tabla / Lista de Ayudas Memoria */}
              {loading ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                  Cargando ayudas memoria...
                </div>
              ) : documentosFiltrados.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No se encontraron ayudas memoria</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No hay registros con los filtros aplicados. Puedes iniciar una nueva ayuda memoria haciendo clic en "+ Nueva Ayuda Memoria".
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Nombre / Asunto de la Ayuda Memoria</th>
                        <th className="py-3 px-4">Ámbito / Región</th>
                        <th className="py-3 px-4">Dirección</th>
                        <th className="py-3 px-4">Fecha Corte</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documentosFiltrados.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                            {doc.codigoInterno}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 text-[13px]">{doc.titulo}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{doc.plantillaNombre}</span>
                              {doc.nivelRiesgo && (
                                <span className={`px-1.5 py-0.2 rounded-sm text-[10px] font-bold ${
                                  doc.nivelRiesgo === 'CRITICO' ? 'bg-rose-100 text-rose-800' :
                                  doc.nivelRiesgo === 'ALTO' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  Riesgo {doc.nivelRiesgo}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {doc.region ? (
                              <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                <MapPin className="w-3 h-3 text-sky-600" />
                                {doc.region}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Nacional</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {doc.direccion}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            {doc.fechaCorte || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                doc.estado === 'PUBLICADO'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : doc.estado === 'ACTUALIZADO'
                                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300'
                              }`}
                            >
                              {doc.estado}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => abrirDocumento(doc.id)}
                                className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-50 transition-colors font-medium text-xs flex items-center gap-1"
                                title="Editar y Llenar"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span className="hidden sm:inline">Llenar</span>
                              </button>
                              <button
                                onClick={() => descargarWord(doc.id, doc.codigoInterno)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Descargar Word (.docx)"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ─── MODAL / DRAWER DE EDICIÓN DINÁMICA DEL DOCUMENTO ───────────────────── */}
      {docSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Cabecera del Editor */}
            <div className="p-4 px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-200">
                    {docSeleccionado.codigoInterno}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                    {docSeleccionado.direccion}
                  </span>
                  {docSeleccionado.region && (
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {docSeleccionado.region}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    docSeleccionado.estado === 'PUBLICADO'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : docSeleccionado.estado === 'ACTUALIZADO'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {docSeleccionado.estado}
                  </span>
                </div>
                <input
                  type="text"
                  value={docSeleccionado.titulo}
                  onChange={(e) => setDocSeleccionado({ ...docSeleccionado, titulo: e.target.value })}
                  className="mt-1.5 text-base font-bold text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-hidden py-0.5 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={imprimirPDF}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Imprimir o Guardar como PDF oficial (Ctrl+P)"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  Imprimir / PDF
                </button>
                <button
                  onClick={() => descargarWord(docSeleccionado.id, docSeleccionado.codigoInterno)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Exportar en formato oficial Word (.docx)"
                >
                  <Download className="w-4 h-4" />
                  Descargar Word (.docx)
                </button>
                <button
                  onClick={() => {
                    setDocSeleccionado(null)
                    setSeccionActivaId(null)
                  }}
                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                  title="Cerrar editor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Completitud y Acciones Rápidas */}
            <div className="px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
              {/* Indicador de Avance / Progreso */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Progreso del Documento:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                    estadisticasDocSeleccionado.porcentaje === 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : estadisticasDocSeleccionado.porcentaje >= 50
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {estadisticasDocSeleccionado.porcentaje}% ({estadisticasDocSeleccionado.completadas}/{estadisticasDocSeleccionado.total} bloques)
                  </span>
                </div>
                <div className="w-28 bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300">
                  <div
                    className={`h-full transition-all duration-300 ${
                      estadisticasDocSeleccionado.porcentaje === 100
                        ? 'bg-emerald-500'
                        : estadisticasDocSeleccionado.porcentaje >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${estadisticasDocSeleccionado.porcentaje}%` }}
                  />
                </div>
              </div>

              {/* Controles de Acordeón y Guardado */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border-r border-slate-300 pr-2 mr-1">
                  <button
                    type="button"
                    onClick={() => colapsarTodas(false)}
                    className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-[11px] font-medium"
                    title="Desplegar todas las secciones"
                  >
                    Desplegar Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => colapsarTodas(true)}
                    className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-[11px] font-medium"
                    title="Plegar todas las secciones para vista compacta"
                  >
                    Plegar Todo
                  </button>
                </div>

                {/* Botonera dinámica según Estado del Documento */}
                {docSeleccionado.estado === 'PUBLICADO' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVersionDocNueva('2.0')
                        setVersionDocMotivo('')
                        setModalVersionarDocOpen(true)
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                      title="Crear nueva versión de corrección a partir de este documento oficial"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Crear Nueva Versión
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Guardar Borrador */}
                    <button
                      onClick={() => guardarDocumento('BORRADOR')}
                      disabled={guardando}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-500" />
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>

                    {/* Enviar a Revisión */}
                    {docSeleccionado.estado === 'BORRADOR' || docSeleccionado.estado === 'OBSERVADO' ? (
                      <button
                        onClick={handleEnviarRevision}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Enviar para revisión de la Dirección / Revisor"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Enviar a Revisión
                      </button>
                    ) : null}

                    {/* Acciones de Revisor / Directivo */}
                    {(docSeleccionado.estado === 'EN_REVISION' || isAdmin) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTextoObservaciones('')
                            setModalObservarOpen(true)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 text-xs flex items-center gap-1.5"
                          title="Formular observaciones para subsanación"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Observar
                        </button>
                        <button
                          onClick={handleAprobarDocumento}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                          title="Aprobar documento para publicación final"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                      </>
                    )}

                    {/* Sellar y Publicar Oficialmente */}
                    {(docSeleccionado.estado === 'APROBADO' || isAdmin) && (
                      <button
                        onClick={handlePublicarConHash}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Sellar con hash criptográfico SHA-256 e inmutabilidad estricta"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Sellar y Publicar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Banner de Observaciones o Sello Criptográfico */}
            {docSeleccionado.observacionesRevision && (
              <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Observación formulada:</span>
                  <p className="mt-0.5">{docSeleccionado.observacionesRevision}</p>
                </div>
              </div>
            )}

            {docSeleccionado.hashIntegridad && (
              <div className="bg-emerald-50/80 border-b border-emerald-200 p-2.5 px-6 text-xs text-emerald-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Documento Oficial Sellado:</strong> Publicado por <em>{docSeleccionado.publicadoPor || 'DGNNA'}</em> el {docSeleccionado.publicadoAt || 'Fecha oficial'}
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-white border border-emerald-300 px-2 py-0.5 rounded-md font-bold text-emerald-900" title="Hash SHA-256 de Inmutabilidad">
                  SHA-256: {docSeleccionado.hashIntegridad.substring(0, 16)}...
                </span>
              </div>
            )}

            {/* Cuerpo del Editor con Panel Lateral de Secciones y Formulario Principal */}
            <div className="flex-1 flex overflow-hidden">
              {/* Barra Lateral: Índice de Navegación Rápida */}
              <div className="w-64 border-r border-slate-200 bg-slate-50/70 p-4 overflow-y-auto space-y-1.5 hidden md:block shrink-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Índice de Secciones
                </div>
                {(docSeleccionado.secciones || []).map((sec, sIdx) => {
                  const completada = estadisticasDocSeleccionado.estadosSecciones[sec.seccionId]
                  return (
                    <button
                      key={sec.seccionId}
                      type="button"
                      onClick={() => {
                        setSeccionActivaId(sec.seccionId)
                        // Asegurar que no esté colapsada al hacer clic
                        setSeccionesColapsadas(prev => ({ ...prev, [sec.seccionId]: false }))
                        const el = document.getElementById(`seccion-${sec.seccionId}`)
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all ${
                        seccionActivaId === sec.seccionId
                          ? 'bg-sky-100 text-sky-900 font-bold border border-sky-200'
                          : 'text-slate-700 hover:bg-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold shrink-0">
                          {sIdx + 1}
                        </span>
                        <span className="truncate text-[11px]">{sec.titulo}</span>
                      </div>
                      {completada ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                    </button>
                  )
                })}

                <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-2">
                  <div className="font-semibold text-slate-700">Metadatos del Corte:</div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Fecha de Corte:</label>
                    <input
                      type="text"
                      value={docSeleccionado.fechaCorte || ''}
                      onChange={(e) => setDocSeleccionado({ ...docSeleccionado, fechaCorte: e.target.value })}
                      className="w-full mt-0.5 font-medium bg-white px-2 py-1 rounded border border-slate-300 text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Nivel de Riesgo:</label>
                    <select
                      value={docSeleccionado.nivelRiesgo || 'MODERADO'}
                      onChange={(e) => setDocSeleccionado({ ...docSeleccionado, nivelRiesgo: e.target.value })}
                      className="w-full mt-0.5 text-xs px-2 py-1 rounded bg-white border border-slate-300 font-semibold"
                    >
                      <option value="BAJO">BAJO</option>
                      <option value="MODERADO">MODERADO</option>
                      <option value="ALTO">ALTO</option>
                      <option value="CRITICO">CRÍTICO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Formulario Principal de Edición de Secciones */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
                {(docSeleccionado.secciones || []).map((sec, sIdx) => {
                  const estaColapsada = Boolean(seccionesColapsadas[sec.seccionId])
                  const completada = estadisticasDocSeleccionado.estadosSecciones[sec.seccionId]

                  return (
                    <div
                      id={`seccion-${sec.seccionId}`}
                      key={sec.seccionId}
                      className={`rounded-xl bg-white border transition-all ${
                        seccionActivaId === sec.seccionId
                          ? 'border-sky-400 ring-2 ring-sky-100 shadow-md'
                          : 'border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Cabecera de la Sección (Clickeable para colapsar) */}
                      <div
                        onClick={() => toggleColapsoSeccion(sec.seccionId)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 select-none rounded-t-xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            {estaColapsada ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-xs flex items-center justify-center font-bold shrink-0">
                            {sec.orden || sIdx + 1}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {sec.titulo}
                            </h3>
                            {sec.guiaLlenado && (
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                {sec.guiaLlenado}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {completada ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Completo
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                              Pendiente
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono uppercase font-semibold">
                            {sec.tipoSeccion}
                          </span>
                        </div>
                      </div>

                      {/* Contenido Desplegable */}
                      {!estaColapsada && (
                        <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                          {/* ── Si la sección es TEXTO o CONCLUSIONES ── */}
                          {(sec.tipoSeccion === 'TEXTO' || sec.tipoSeccion === 'CONCLUSIONES') && (
                            <textarea
                              rows={5}
                              value={sec.textoContenido || ''}
                              onChange={(e) => {
                                const nuevasSecciones = [...(docSeleccionado.secciones || [])]
                                nuevasSecciones[sIdx].textoContenido = e.target.value
                                setDocSeleccionado({ ...docSeleccionado, secciones: nuevasSecciones })
                              }}
                              placeholder="Escriba aquí la descripción ejecutiva, antecedentes, marco legal o acuerdos..."
                              className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-sans leading-relaxed"
                            />
                          )}

                          {/* ── Si la sección es TABLA DE DATOS ── */}
                          {sec.tipoSeccion === 'TABLA_DATOS' && (() => {
                            let filas: any[] = []
                            try {
                              filas = sec.datosTablaJson ? JSON.parse(sec.datosTablaJson) : []
                            } catch {
                              filas = []
                            }
                            const headers = filas.length > 0 ? Object.keys(filas[0]) : []

                            return (
                              <div className="space-y-3">
                                {/* Botonera de Tabla */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-500 font-medium">
                                    {filas.length} registros cargados
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors border border-slate-300">
                                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                      Importar Excel (.xlsx)
                                      <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="hidden"
                                        onChange={(e) => handleImportarExcel(e, sec.seccionId)}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nuevaFila: any = {}
                                        headers.forEach(h => { nuevaFila[h] = '' })
                                        const nuevasFilas = [...filas, nuevaFila]
                                        const nuevasSecciones = [...(docSeleccionado.secciones || [])]
                                        nuevasSecciones[sIdx].datosTablaJson = JSON.stringify(nuevasFilas)
                                        setDocSeleccionado({ ...docSeleccionado, secciones: nuevasSecciones })
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium transition-colors border border-sky-200"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Agregar Fila
                                    </button>
                                  </div>
                                </div>

                                {/* DataGrid interactivo */}
                                {filas.length > 0 ? (
                                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                      <thead className="bg-slate-100 sticky top-0 text-slate-700 font-semibold">
                                        <tr>
                                          {headers.map((h) => (
                                            <th key={h} className="p-2 border-b border-slate-200">
                                              {h.replace('_', ' ')}
                                            </th>
                                          ))}
                                          <th className="p-2 border-b border-slate-200 w-8"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {filas.map((fila, rIdx) => (
                                          <tr key={rIdx} className="hover:bg-slate-50">
                                            {headers.map((h) => (
                                              <td key={h} className="p-1.5 border-r border-slate-100">
                                                <input
                                                  type="text"
                                                  value={fila[h] ?? ''}
                                                  onChange={(e) => {
                                                    const nuevasFilas = [...filas]
                                                    nuevasFilas[rIdx][h] = e.target.value
                                                    const nuevasSecciones = [...(docSeleccionado.secciones || [])]
                                                    nuevasSecciones[sIdx].datosTablaJson = JSON.stringify(nuevasFilas)
                                                    setDocSeleccionado({ ...docSeleccionado, secciones: nuevasSecciones })
                                                  }}
                                                  className="w-full bg-transparent px-1.5 py-1 text-xs rounded-sm focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800"
                                                />
                                              </td>
                                            ))}
                                            <td className="p-1.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevasFilas = filas.filter((_, idx) => idx !== rIdx)
                                                  const nuevasSecciones = [...(docSeleccionado.secciones || [])]
                                                  nuevasSecciones[sIdx].datosTablaJson = JSON.stringify(nuevasFilas)
                                                  setDocSeleccionado({ ...docSeleccionado, secciones: nuevasSecciones })
                                                }}
                                                className="text-slate-400 hover:text-rose-600 p-1"
                                                title="Eliminar fila"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                                    Sin filas todavía. Agregue una fila o importe un archivo Excel.
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* ── Si la sección es BITÁCORA (Casos Sensibles) ── */}
                          {sec.tipoSeccion === 'BITACORA' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  Línea de Tiempo Acumulativa (Inmutable)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setModalAccionOpen(true)}
                                  className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Agregar Actuación
                                </button>
                              </div>

                              {/* Lista cronológica */}
                              <div className="space-y-2.5">
                                {(docSeleccionado.acciones || []).length === 0 ? (
                                  <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                                    Aún no se registran actuaciones para este caso.
                                  </div>
                                ) : (
                                  (docSeleccionado.acciones || []).map((acc) => (
                                    <div
                                      key={acc.id}
                                      className="p-3 rounded-lg bg-rose-50/40 border border-rose-100 flex items-start gap-3"
                                    >
                                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                      <div className="flex-1 text-xs">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-bold text-slate-800">{acc.fecha}</span>
                                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-sm">
                                            {acc.institucion || 'MIMP'}
                                          </span>
                                        </div>
                                        <p className="text-slate-700 mt-1 leading-relaxed">
                                          {acc.descripcion}
                                        </p>
                                        <span className="text-[10px] text-slate-400 mt-1 block">
                                          Por: {acc.creadoPor}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVA AYUDA MEMORIA ───────────────────────────────── */}
      {modalNuevoDocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Crear Nueva Ayuda Memoria</h3>
                <p className="text-xs text-slate-500">Seleccione la plantilla y defina los datos iniciales</p>
              </div>
              <button
                onClick={() => setModalNuevoDocOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearDocumento} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Formulario Plantilla:
                </label>
                <select
                  value={nuevoPlantillaId}
                  onChange={(e) => setNuevoPlantillaId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.esOficial ? '(Oficial)' : '(Personalizada)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Asunto / Título de la Ayuda Memoria:
                </label>
                <input
                  type="text"
                  required
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="ej. Servicios NNA Región Piura - Visita Despacho"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    3. Región / Ámbito:
                  </label>
                  <select
                    value={nuevaRegion}
                    onChange={(e) => setNuevaRegion(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="TODAS">Nacional (Todo el país)</option>
                    {DEPARTAMENTOS_PERU.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    4. Fecha de Corte:
                  </label>
                  <input
                    type="text"
                    value={nuevaFechaCorte}
                    onChange={(e) => setNuevaFechaCorte(e.target.value)}
                    placeholder="ej. Septiembre 2026"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoDocOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 shadow-xs"
                >
                  Crear y Abrir Formulario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DISEÑADOR VISUAL DE PLANTILLAS V2 (3 PASOS) ─────────── */}
      {modalNuevaPlantillaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Cabecera del Asistente */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Diseñador Visual de Plantillas y Formatos
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asistente institucional guiado para creación de plantillas con bloques modulares
                </p>
              </div>
              <button
                onClick={() => {
                  setModalNuevaPlantillaOpen(false)
                  setPasoDisenador(1)
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper de 3 Pasos */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPasoDisenador(1)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  pasoDisenador === 1
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                Datos Generales
              </button>
              <div className="w-6 h-px bg-slate-200" />
              <button
                type="button"
                onClick={() => {
                  if (!plantillaNombre.trim()) {
                    toast.warning('Complete el nombre de la plantilla primero')
                    return
                  }
                  setPasoDisenador(2)
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  pasoDisenador === 2
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                Bloques y Secciones ({plantillaSecciones.length})
              </button>
              <div className="w-6 h-px bg-slate-200" />
              <button
                type="button"
                onClick={() => {
                  if (!plantillaNombre.trim()) {
                    toast.warning('Complete el nombre de la plantilla primero')
                    return
                  }
                  setPasoDisenador(3)
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  pasoDisenador === 3
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                Vista Previa y Guardar
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* ─── PASO 1: DATOS GENERALES ───────────────────────────── */}
              {pasoDisenador === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Nombre de la Plantilla / Formato: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={plantillaNombre}
                      onChange={(e) => setPlantillaNombre(e.target.value)}
                      placeholder="ej. Formato de Supervisión Inopinada de Servicios CAR"
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Código Identificador (Opcional):
                      </label>
                      <input
                        type="text"
                        value={plantillaCodigoCustom}
                        onChange={(e) => setPlantillaCodigoCustom(e.target.value.toUpperCase())}
                        placeholder="ej. SUP_CAR_INOP"
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Dirección Responsable:
                      </label>
                      <select
                        value={plantillaDireccion}
                        onChange={(e) => setPlantillaDireccion(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="DPE">DPE — Protección Especial</option>
                        <option value="DA">DA — Adopciones</option>
                        <option value="DSLD">DSLD — Sistemas Locales y Defensorías</option>
                        <option value="DPNNA">DPNNA — Políticas de Niñas, Niños y Adolescentes</option>
                        <option value="MULTIDIRECCIONAL">Multidireccional / Todas</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Ámbito Territorial:
                      </label>
                      <select
                        value={plantillaAmbito}
                        onChange={(e) => setPlantillaAmbito(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="NACIONAL">Nacional (Todo el país)</option>
                        <option value="REGIONAL">Regional (Por departamento)</option>
                        <option value="ESPECIFICO">Específico (Caso emblemático o intervención)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Descripción o Finalidad:
                      </label>
                      <input
                        type="text"
                        value={plantillaDesc}
                        onChange={(e) => setPlantillaDesc(e.target.value)}
                        placeholder="ej. Reporte mensual de incidencias y cobertura."
                        className="w-full p-2.5 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── PASO 2: BLOQUES Y SECCIONES ────────────────────────── */}
              {pasoDisenador === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Bloques del Formulario</h4>
                      <p className="text-[11px] text-slate-500">Configure los campos, tipos de datos y el orden de captura</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPlantillaSecciones([
                          ...plantillaSecciones,
                          {
                            orden: plantillaSecciones.length + 1,
                            titulo: `Nueva Sección ${plantillaSecciones.length + 1}`,
                            tipoSeccion: 'TEXTO',
                            guiaLlenado: '',
                            columnas: ''
                          }
                        ])
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold border border-sky-200 flex items-center gap-1 hover:bg-sky-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Bloque
                    </button>
                  </div>

                  <div className="space-y-3">
                    {plantillaSecciones.map((sec, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {idx + 1}
                          </span>

                          <input
                            type="text"
                            value={sec.titulo}
                            onChange={(e) => {
                              const updated = [...plantillaSecciones]
                              updated[idx].titulo = e.target.value
                              setPlantillaSecciones(updated)
                            }}
                            placeholder="Título del bloque..."
                            className="flex-1 p-2 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                          />

                          <select
                            value={sec.tipoSeccion}
                            onChange={(e) => {
                              const updated = [...plantillaSecciones]
                              updated[idx].tipoSeccion = e.target.value
                              setPlantillaSecciones(updated)
                            }}
                            className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                          >
                            <option value="TEXTO">📝 Texto Libre</option>
                            <option value="TABLA_DATOS">📊 Cuadro / Tabla de Datos</option>
                            <option value="BITACORA">⏱️ Bitácora Cronológica</option>
                            <option value="CONCLUSIONES">💡 Conclusiones / Acuerdos</option>
                          </select>

                          {/* Botones de Reordenar */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return
                                const updated = [...plantillaSecciones]
                                const temp = updated[idx - 1]
                                updated[idx - 1] = updated[idx]
                                updated[idx] = temp
                                setPlantillaSecciones(updated)
                              }}
                              className="p-1 text-slate-500 hover:text-sky-600 disabled:opacity-30"
                              title="Mover arriba"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === plantillaSecciones.length - 1}
                              onClick={() => {
                                if (idx === plantillaSecciones.length - 1) return
                                const updated = [...plantillaSecciones]
                                const temp = updated[idx + 1]
                                updated[idx + 1] = updated[idx]
                                updated[idx] = temp
                                setPlantillaSecciones(updated)
                              }}
                              className="p-1 text-slate-500 hover:text-sky-600 disabled:opacity-30"
                              title="Mover abajo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (plantillaSecciones.length <= 1) {
                                toast.warning('La plantilla debe tener al menos una sección')
                                return
                              }
                              setPlantillaSecciones(plantillaSecciones.filter((_, i) => i !== idx))
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
                            title="Eliminar bloque"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Guía de Llenado / Tooltip */}
                        <div className="pl-8">
                          <input
                            type="text"
                            value={sec.guiaLlenado}
                            onChange={(e) => {
                              const updated = [...plantillaSecciones]
                              updated[idx].guiaLlenado = e.target.value
                              setPlantillaSecciones(updated)
                            }}
                            placeholder="Instrucciones o guía de llenado para el especialista (opcional)..."
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-md text-[11px] text-slate-600"
                          />
                        </div>

                        {/* Configuración de Columnas para TABLA_DATOS */}
                        {sec.tipoSeccion === 'TABLA_DATOS' && (
                          <div className="pl-8 bg-sky-50/50 p-2.5 rounded-lg border border-sky-100">
                            <label className="block font-bold text-sky-900 mb-1 text-[11px]">
                              Columnas de la Tabla (separadas por coma):
                            </label>
                            <input
                              type="text"
                              value={sec.columnas}
                              onChange={(e) => {
                                const updated = [...plantillaSecciones]
                                updated[idx].columnas = e.target.value
                                setPlantillaSecciones(updated)
                              }}
                              placeholder="ej. Provincia, Distrito, Beneficiarios_Meta, Ejecutado, Porcentaje"
                              className="w-full p-1.5 bg-white border border-sky-300 rounded-md text-[11px] font-mono"
                            />
                            <span className="text-[10px] text-sky-700 mt-1 block">
                              💡 Se generará un cuadro interactivo con soporte de importación Excel compatible con estos encabezados.
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── PASO 3: VISTA PREVIA Y GUARDADO ────────────────────── */}
              {pasoDisenador === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">
                        {plantillaCodigoCustom || 'AUTOGENERADO'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                        v1.0 (BORRADOR)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                        {plantillaDireccion} — {plantillaAmbito}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{plantillaNombre || 'Plantilla sin título'}</h3>
                    <p className="text-xs text-slate-500">{plantillaDesc || 'Sin descripción adicional'}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-2">Previsualización de Secciones ({plantillaSecciones.length}):</h4>
                    <div className="space-y-2.5">
                      {plantillaSecciones.map((sec, idx) => (
                        <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              {sec.titulo}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                              {sec.tipoSeccion}
                            </span>
                          </div>
                          {sec.guiaLlenado && (
                            <p className="text-[11px] text-slate-500 italic pl-7">
                              💡 {sec.guiaLlenado}
                            </p>
                          )}
                          {sec.tipoSeccion === 'TABLA_DATOS' && sec.columnas && (
                            <div className="pl-7 mt-2">
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap gap-1.5">
                                {sec.columnas.split(',').map((col, cIdx) => (
                                  <span key={cIdx} className="text-[10px] bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-slate-700">
                                    {col.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Navegación del Asistente */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                {pasoDisenador > 1 && (
                  <button
                    type="button"
                    onClick={() => setPasoDisenador((p) => ((p - 1) as 1 | 2 | 3))}
                    className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200 font-semibold"
                  >
                    ← Anterior
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalNuevaPlantillaOpen(false)
                    setPasoDisenador(1)
                  }}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium"
                >
                  Cancelar
                </button>

                {pasoDisenador < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!plantillaNombre.trim()) {
                        toast.warning('Ingrese el nombre de la plantilla')
                        return
                      }
                      setPasoDisenador((p) => ((p + 1) as 1 | 2 | 3))
                    }}
                    className="px-4 py-2 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 shadow-xs"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGuardarPlantilla}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Guardar Formato en Catálogo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVA ACCIÓN EN BITÁCORA ──────────────────────────── */}
      {modalAccionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600" />
                Registrar Actuación en Bitácora
              </h3>
              <button
                onClick={() => setModalAccionOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAgregarAccion} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha / Hora:</label>
                  <input
                    type="text"
                    required
                    value={accionFecha}
                    onChange={(e) => setAccionFecha(e.target.value)}
                    placeholder="ej. 10/09/2026 14:30"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institución:</label>
                  <input
                    type="text"
                    value={accionInstitucion}
                    onChange={(e) => setAccionInstitucion(e.target.value)}
                    placeholder="ej. UPE Lima Este / PNP"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detalle de la Acción:</label>
                <textarea
                  rows={4}
                  required
                  value={accionDescripcion}
                  onChange={(e) => setAccionDescripcion(e.target.value)}
                  placeholder="Detalle exacto de la medida de protección dictada, apersonamiento o coordinación..."
                  className="w-full p-2 rounded-lg border border-slate-300 leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAccionOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs"
                >
                  Guardar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CLONAR PLANTILLA A NUEVA VERSIÓN ─────────────────── */}
      {modalClonarOpen && plantillaAClonar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-600" />
                Clonar Plantilla a Nueva Versión
              </h3>
              <button
                onClick={() => setModalClonarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEjecutarClon} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <div className="font-semibold text-slate-800">Plantilla Origen:</div>
                <div className="font-mono text-[11px] text-indigo-700">{plantillaAClonar.codigo} (v{plantillaAClonar.version || '1.0'})</div>
                <div className="text-[11px] mt-0.5">{plantillaAClonar.nombre}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nueva Versión:
                </label>
                <input
                  type="text"
                  required
                  value={clonNuevaVersion}
                  onChange={(e) => setClonNuevaVersion(e.target.value)}
                  placeholder="ej. 2.0 o 1.1"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de la Nueva Plantilla:
                </label>
                <input
                  type="text"
                  required
                  value={clonNuevoNombre}
                  onChange={(e) => setClonNuevoNombre(e.target.value)}
                  placeholder="ej. Estado situacional de caso sensible (v2.0)"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ℹ️ La nueva plantilla se creará en estado <strong>BORRADOR</strong> duplicando todos los bloques de secciones para su libre edición.
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalClonarOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Crear Versión Clonada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL VISTA PREVIA DE ESTRUCTURA DE PLANTILLA ────────────── */}
      {modalPreviewOpen && plantillaPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">
                    {plantillaPreview.codigo}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                    v{plantillaPreview.version || '1.0'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    {plantillaPreview.estadoPlantilla || 'VIGENTE'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {plantillaPreview.nombre}
                </h3>
              </div>
              <button
                onClick={() => setModalPreviewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-600">
                <div><strong>Dirección Dueña:</strong> {plantillaPreview.direccionDuena}</div>
                <div><strong>Ámbito:</strong> {plantillaPreview.tipoAmbito}</div>
                <div className="col-span-2"><strong>Descripción:</strong> {plantillaPreview.descripcion || 'Sin descripción'}</div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5 text-xs">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Estructura de Bloques y Secciones ({plantillaPreview.secciones?.length || 0}):
                </h4>

                <div className="space-y-2">
                  {(plantillaPreview.secciones || []).map((sec, idx) => (
                    <div key={sec.id || idx} className="p-3 rounded-lg border border-slate-200 bg-white flex items-start gap-3 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {sec.orden || idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{sec.titulo}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {sec.tipoSeccion}
                          </span>
                        </div>
                        {sec.guiaLlenado && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            💡 {sec.guiaLlenado}
                          </p>
                        )}
                        {sec.configuracionJson && (
                          <pre className="mt-1.5 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-600 overflow-x-auto">
                            {sec.configuracionJson}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setPlantillaPreview(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white font-semibold text-xs hover:bg-slate-700"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL FORMULAR OBSERVACIONES ─────────────────────────── */}
      {modalObservarOpen && docSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-rose-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Formular Observaciones al Documento
              </h3>
              <button
                onClick={() => setModalObservarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleObservarDocumento} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <div className="font-semibold text-slate-800">Documento a Observar:</div>
                <div className="font-mono text-[11px] text-rose-700">{docSeleccionado.codigoInterno}</div>
                <div className="text-[11px] mt-0.5">{docSeleccionado.titulo}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detalle de la Observación / Subsanación Requerida: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={textoObservaciones}
                  onChange={(e) => setTextoObservaciones(e.target.value)}
                  placeholder="Detalle los puntos a corregir o completar por el especialista responsable..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalObservarOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Registrar Observación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CREAR NUEVA VERSIÓN DE DOCUMENTO PUBLICADO ───────── */}
      {modalVersionarDocOpen && docSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-indigo-50/70 flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-600" />
                Nueva Versión de Documento Oficial
              </h3>
              <button
                onClick={() => setModalVersionarDocOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearNuevaVersion} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <div className="font-semibold text-slate-800">Documento Origen (Sellado):</div>
                <div className="font-mono text-[11px] text-indigo-700">{docSeleccionado.codigoInterno} (v{docSeleccionado.versionDoc || '1.0'})</div>
                <div className="text-[11px] mt-0.5">{docSeleccionado.titulo}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nueva Versión Identificadora:
                </label>
                <input
                  type="text"
                  required
                  value={versionDocNueva}
                  onChange={(e) => setVersionDocNueva(e.target.value)}
                  placeholder="ej. 2.0 o 1.1"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo de la Nueva Versión:
                </label>
                <input
                  type="text"
                  value={versionDocMotivo}
                  onChange={(e) => setVersionDocMotivo(e.target.value)}
                  placeholder="ej. Actualización de cifras al cierre de mes"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ℹ️ Se creará un nuevo borrador editable manteniendo el historial y trazabilidad con el documento original.
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalVersionarDocOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Generar Versión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
