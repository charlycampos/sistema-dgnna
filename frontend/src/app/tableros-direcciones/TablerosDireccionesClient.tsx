'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  ShieldAlert,
  HeartHandshake,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Search,
  Clock,
  ArrowLeft,
  Info,
  Plus,
  Trash2,
  Edit3,
  Share2,
  Check,
  X,
  SlidersHorizontal,
  RefreshCw,
  Home,
  BarChart3,
  Sparkles
} from 'lucide-react'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
}

export type DireccionCodigo = 'DSLD' | 'DPNNA' | 'DPE' | 'DA'

export interface TableroItem {
  id: string
  titulo: string
  nombreCompletoTooltip?: string
  subtitulo: string
  direccion: DireccionCodigo
  tipo: 'powerbi' | 'proximamente'
  urlEmbed?: string
  descripcion: string
  actualizacion?: string
  estado: 'activo' | 'desarrollo' | 'planificado'
  responsable?: string
  esPersonalizado?: boolean
}

interface DireccionConfig {
  codigo: DireccionCodigo
  nombreCorto: string
  nombreCompleto: string
  descripcion: string
  icono: React.ComponentType<{ className?: string }>
  color: {
    bg: string
    text: string
    badgeBg: string
    border: string
    lightBg: string
  }
}

const DIRECCIONES_DATA: Record<DireccionCodigo, DireccionConfig> = {
  DSLD: {
    codigo: 'DSLD',
    nombreCorto: 'DSLD',
    nombreCompleto: 'Dirección de Sistemas Locales y Defensorías',
    descripcion: 'Supervisión y asistencia técnica a DEMUNAs y servicios locales de protección a nivel distrital y provincial.',
    icono: Building2,
    color: {
      bg: 'bg-blue-600',
      text: 'text-blue-700',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      border: 'border-blue-500',
      lightBg: 'bg-blue-50/50',
    },
  },
  DPNNA: {
    codigo: 'DPNNA',
    nombreCorto: 'DPNNA',
    nombreCompleto: 'Dirección de Políticas de Niñas, Niños y Adolescentes',
    descripcion: 'Diseño, articulación y seguimiento de políticas nacionales, planes sectoriales y comisiones multisectoriales.',
    icono: Users,
    color: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      border: 'border-emerald-500',
      lightBg: 'bg-emerald-50/50',
    },
  },
  DPE: {
    codigo: 'DPE',
    nombreCorto: 'DPE',
    nombreCompleto: 'Dirección de Protección Especial',
    descripcion: 'Gestión y respuesta inmediata de Unidades de Protección Especial (UPE) y medidas por situación de desprotección.',
    icono: ShieldAlert,
    color: {
      bg: 'bg-indigo-600',
      text: 'text-indigo-700',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      border: 'border-indigo-500',
      lightBg: 'bg-indigo-50/50',
    },
  },
  DA: {
    codigo: 'DA',
    nombreCorto: 'DA',
    nombreCompleto: 'Dirección de Adopciones',
    descripcion: 'Trámite, evaluación y seguimiento de adopciones administrativas especiales, nacionales e internacionales.',
    icono: HeartHandshake,
    color: {
      bg: 'bg-rose-600',
      text: 'text-rose-700',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      border: 'border-rose-500',
      lightBg: 'bg-rose-50/50',
    },
  },
}

const TABLEROS_BASE: TableroItem[] = [
  // DSLD
  {
    id: 'dsld-general-v3',
    titulo: 'Tablero General DSLD (V3)',
    subtitulo: 'Monitoreo consolidado de defensorías y servicios distritales',
    direccion: 'DSLD',
    tipo: 'powerbi',
    urlEmbed:
      'https://app.powerbi.com/view?r=eyJrIjoiZDljNTIzNDctNTg2Yy00MWFjLWE4M2ItYzQ1NDc5MTZjMjg1IiwidCI6IjY4MTljNDYzLTVkZWItNDA3MC1hY2I2LTlmZGQzY2FhZTk4NCJ9',
    descripcion:
      'Cuadro de mando interactivo en Power BI para el seguimiento operativo de las Defensorías Municipales del Niño, Niña y Adolescente (DEMUNA) a nivel nacional.',
    actualizacion: 'Actualización en tiempo real (Power BI Service)',
    estado: 'activo',
    responsable: 'Equipo de Información y Estadística DSLD',
  },
  {
    id: 'dsld-acreditacion',
    titulo: 'Casos de RDF reportados',
    nombreCompletoTooltip: 'Casos de Riesgo por desprotección familiar',
    subtitulo: 'Procedimientos por riesgo en DEMUNAs acreditadas',
    direccion: 'DSLD',
    tipo: 'proximamente',
    descripcion:
      'Reporte consolidado y casuística de casos de riesgo de desprotección familiar (RDF) atendidos por las DEMUNAs a nivel nacional.',
    estado: 'desarrollo',
    responsable: 'Equipo Técnico DSLD',
  },

  // DPNNA
  {
    id: 'dpnna-politicas',
    titulo: 'Seguimiento de Políticas y Planes Nacionales',
    subtitulo: 'Metas PNAIA y compromisos intersectoriales',
    direccion: 'DPNNA',
    tipo: 'proximamente',
    descripcion:
      'Indicadores de seguimiento del Plan Nacional de Acción por la Infancia y la Adolescencia (PNAIA) e hitos estratégicos.',
    estado: 'planificado',
    responsable: 'Dirección de Políticas de NNA',
  },
  {
    id: 'dpnna-cconna',
    titulo: 'Participación Infantil y Red CCONNA',
    subtitulo: 'Monitoreo territorial del Consejo Consultivo de NNA',
    direccion: 'DPNNA',
    tipo: 'proximamente',
    descripcion:
      'Registro y representatividad territorial de los Consejos Consultivos de Niñas, Niños y Adolescentes a nivel nacional.',
    estado: 'planificado',
    responsable: 'Equipo de Participación Protagónica DPNNA',
  },
  {
    id: 'dpnna-encuestas-nacionales',
    titulo: 'Situación de la niñez y adolescencia (Encuestas Nacionales)',
    nombreCompletoTooltip: 'Situación de la niñez y adolescencia (Encuestas Nacionales)',
    subtitulo: 'Indicadores sociodemográficos oficiales (ENAHO, ENDES, ENAPRES)',
    direccion: 'DPNNA',
    tipo: 'proximamente',
    descripcion:
      'Monitoreo y análisis de las condiciones de vida, salud, educación y desarrollo de niñas, niños y adolescentes a partir de fuentes de encuestas nacionales.',
    estado: 'desarrollo',
    responsable: 'Dirección de Políticas de NNA',
  },
  {
    id: 'dpnna-registros-administrativos',
    titulo: 'Situación de la niñez y adolescencia (Registros administrativos)',
    nombreCompletoTooltip: 'Situación de la niñez y adolescencia (Registros administrativos)',
    subtitulo: 'Analítica sectorial basada en registros del Estado',
    direccion: 'DPNNA',
    tipo: 'proximamente',
    descripcion:
      'Consolidación y seguimiento de información operativa e institucional proveniente de registros administrativos sectoriales e interinstitucionales.',
    estado: 'desarrollo',
    responsable: 'Dirección de Políticas de NNA',
  },

  // DPE
  {
    id: 'dpe-upe-nacional',
    titulo: 'Monitoreo de Casos y Respuestas UPE',
    subtitulo: 'Procedimientos por desprotección familiar',
    direccion: 'DPE',
    tipo: 'proximamente',
    descripcion:
      'Carga operativa de las Unidades de Protección Especial (UPE), tipos de acogimiento residencial/familiar y plazos de atención.',
    estado: 'desarrollo',
    responsable: 'Coordinación Nacional UPE - DPE',
  },
  {
    id: 'dpe-medidas-urgentes',
    titulo: 'Medidas de Protección Provisionales',
    subtitulo: 'Trazabilidad y cese de medidas urgentes',
    direccion: 'DPE',
    tipo: 'proximamente',
    descripcion:
      'Control de dictado de medidas de protección provisionales, derivaciones judiciales y reintegraciones al núcleo familiar.',
    estado: 'planificado',
    responsable: 'Equipo Legal DPE',
  },

  // DA
  {
    id: 'da-solicitantes-aptos',
    titulo: 'Familias Declaradas Aptas y Procesos',
    subtitulo: 'Registro Nacional de Adopciones',
    direccion: 'DA',
    tipo: 'proximamente',
    descripcion:
      'Estadísticas de solicitantes con idoneidad aprobada, tiempos promedio de espera y perfiles de adoptantes.',
    estado: 'desarrollo',
    responsable: 'Dirección de Adopciones',
  },
  {
    id: 'da-integraciones',
    titulo: 'Designaciones e Integraciones Familiares',
    subtitulo: 'Adopciones regulares y especiales concluidas',
    direccion: 'DA',
    tipo: 'proximamente',
    descripcion:
      'Monitoreo de integraciones familiares efectivas, adopciones prioritarias de grupos de hermanos o NNA con necesidades médicas especiales.',
    estado: 'planificado',
    responsable: 'Equipo Psicosocial DA',
  },
]

const STORAGE_KEY = 'dgnna_tableros_direcciones_v4'

export default function TablerosDireccionesClient({ session }: Props) {
  const [tablerosList, setTablerosList] = useState<TableroItem[]>(TABLEROS_BASE)
  const [tableroActivoId, setTableroActivoId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<DireccionCodigo, boolean>>({
    DSLD: false,
    DPNNA: false,
    DPE: false,
    DA: false,
  })
  const [cargandoIframe, setCargandoIframe] = useState(true)
  const [iframeKey, setIframeKey] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Estado del Modal de Administración / Nuevo Tablero
  const [modalAbierto, setModalAbierto] = useState(false)
  const [tableroEnEdicion, setTableroEnEdicion] = useState<TableroItem | null>(null)
  const [formDireccion, setFormDireccion] = useState<DireccionCodigo>('DSLD')
  const [formTitulo, setFormTitulo] = useState('')
  const [formSubtitulo, setFormSubtitulo] = useState('')
  const [formIframeInput, setFormIframeInput] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formResponsable, setFormResponsable] = useState('')
  const [formEstado, setFormEstado] = useState<'activo' | 'desarrollo' | 'planificado'>('activo')

  const contenedorRef = useRef<HTMLDivElement>(null)

  const puedeGestionar =
    session.rol === 'admin' ||
    session.rol === 'director' ||
    session.rol === 'directora' ||
    session.modulos?.some(
      m =>
        (m.modulo === 'tableros-direcciones' || m.modulo === 'director') &&
        (m.rolModulo === 'registrador' || m.rolModulo === 'admin')
    )

  // Cargar tableros desde microservicio backend y actualizar caché local
  const cargarTablerosDesdeBackend = async (mostrarToast = false) => {
    try {
      const res = await fetch('/api/tableros')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const remotos: TableroItem[] = data.map((d: any) => {
            const baseMatch = TABLEROS_BASE.find(b => b.id === d.id)
            return {
              id: d.id,
              titulo: d.titulo,
              nombreCompletoTooltip:
                baseMatch?.nombreCompletoTooltip ||
                d.nombre_completo_tooltip ||
                (d.id === 'dsld-acreditacion' ? 'Casos de Riesgo por desprotección familiar' : undefined),
              subtitulo: d.subtitulo || '',
              direccion: d.codigo_direccion as DireccionCodigo,
              tipo: (d.tipo || 'powerbi') as any,
              urlEmbed: d.url_embed || undefined,
              descripcion: d.descripcion || '',
              responsable: d.responsable || undefined,
              estado: (d.estado || 'activo') as any,
              esPersonalizado: d.es_personalizado ?? false,
            }
          })
          setTablerosList(remotos)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remotos))
          } catch {}
          if (mostrarToast) {
            toast.success('Tableros sincronizados con el servidor')
          }
          return remotos
        }
      }
    } catch {
      if (mostrarToast) {
        toast.error('No se pudo sincronizar con el servidor')
      }
    }
    return null
  }

  // Cargar tableros (1. Fallback inmediato desde localStorage, 2. Datos frescos desde backend)
  useEffect(() => {
    try {
      const guardados = localStorage.getItem(STORAGE_KEY)
      if (guardados) {
        const parsed = JSON.parse(guardados) as TableroItem[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTablerosList(parsed)
        }
      }
    } catch {
      // Usar base
    }

    cargarTablerosDesdeBackend()

    // Leer parámetro ?id= de la URL si existe
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const paramId = params.get('id')
      if (paramId) {
        setTableroActivoId(paramId)
      }
    }
  }, [])

  // Guardar en localStorage cuando cambie la lista
  const guardarEnStorage = (nuevaLista: TableroItem[]) => {
    setTablerosList(nuevaLista)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaLista))
    } catch {
      // Ignorar errores de cuota
    }
  }

  const tableroActivo = useMemo(() => {
    if (!tableroActivoId) return null
    return tablerosList.find(t => t.id === tableroActivoId) || null
  }, [tablerosList, tableroActivoId])

  const statsDirecciones = useMemo(() => {
    const codigos: DireccionCodigo[] = ['DSLD', 'DPNNA', 'DPE', 'DA']
    const enLinea = codigos.filter(c => tablerosList.some(t => t.direccion === c && t.tipo === 'powerbi')).length
    return {
      enLinea,
      enModelado: codigos.length - enLinea,
    }
  }, [tablerosList])

  const direccionConfig = tableroActivo ? DIRECCIONES_DATA[tableroActivo.direccion] : null

  const toggleSeccion = (dir: DireccionCodigo) => {
    setSeccionesAbiertas(prev => ({ ...prev, [dir]: !prev[dir] }))
  }

  const seleccionarTablero = (item: TableroItem) => {
    setTableroActivoId(item.id)
    setCargandoIframe(true)
  }

  const irAInicio = () => {
    setTableroActivoId(null)
  }

  const recargarIframe = () => {
    setCargandoIframe(true)
    setIframeKey(k => k + 1)
    toast.success('Visualización recargada')
  }

  const toggleFullscreen = () => {
    if (!contenedorRef.current) return
    if (!document.fullscreenElement) {
      contenedorRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {})
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {})
    }
  }

  const compartirEnlace = () => {
    if (typeof window !== 'undefined' && tableroActivo) {
      const url = `${window.location.origin}${window.location.pathname}?id=${tableroActivo.id}`
      navigator.clipboard.writeText(url)
      setCopiado(true)
      toast.success('Enlace del tablero copiado al portapapeles')
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Abrir modal para crear
  const abrirModalCrear = (dirDefault?: DireccionCodigo) => {
    setTableroEnEdicion(null)
    setFormDireccion(dirDefault || (tableroActivo ? tableroActivo.direccion : 'DSLD'))
    setFormTitulo('')
    setFormSubtitulo('')
    setFormIframeInput('')
    setFormDescripcion('')
    setFormResponsable(session.nombre || '')
    setFormEstado('activo')
    setModalAbierto(true)
  }

  // Abrir modal para editar
  const abrirModalEditar = (item: TableroItem) => {
    setTableroEnEdicion(item)
    setFormDireccion(item.direccion)
    setFormTitulo(item.titulo)
    setFormSubtitulo(item.subtitulo)
    setFormIframeInput(item.urlEmbed || '')
    setFormDescripcion(item.descripcion)
    setFormResponsable(item.responsable || '')
    setFormEstado(item.estado)
    setModalAbierto(true)
  }

  // Extraer URL del iframe si el usuario pegó el código HTML completo
  const procesarUrlIframe = (input: string): string => {
    const limpio = input.trim()
    if (!limpio) return ''
    const match = limpio.match(/src=["']([^"']+)["']/i)
    if (match && match[1]) {
      return match[1]
    }
    return limpio
  }

  // Guardar Tablero (Nuevo o Editado)
  const guardarTablero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) {
      toast.error('Por favor ingresa un título para el tablero')
      return
    }

    const urlEmbedExtraida = procesarUrlIframe(formIframeInput)
    const esPowerBi = Boolean(urlEmbedExtraida)

    try {
      if (tableroEnEdicion) {
        // Sincronizar en backend
        await fetch(`/api/tableros/${tableroEnEdicion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: formTitulo.trim(),
            subtitulo: formSubtitulo.trim(),
            codigo_direccion: formDireccion,
            tipo: esPowerBi ? 'powerbi' : 'proximamente',
            url_embed: urlEmbedExtraida || null,
            descripcion: formDescripcion.trim(),
            responsable: formResponsable.trim(),
            estado: formEstado,
          }),
        })

        const actualizados = tablerosList.map(t => {
          if (t.id === tableroEnEdicion.id) {
            return {
              ...t,
              titulo: formTitulo.trim(),
              subtitulo: formSubtitulo.trim(),
              direccion: formDireccion,
              tipo: esPowerBi ? ('powerbi' as const) : ('proximamente' as const),
              urlEmbed: urlEmbedExtraida || undefined,
              descripcion: formDescripcion.trim(),
              responsable: formResponsable.trim(),
              estado: formEstado,
            }
          }
          return t
        })
        guardarEnStorage(actualizados)
        toast.success('Tablero actualizado correctamente')
        await cargarTablerosDesdeBackend()
      } else {
        const nuevoId = `tablero-${formDireccion.toLowerCase()}-${Date.now()}`

        // Sincronizar en backend
        const res = await fetch('/api/tableros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: formTitulo.trim(),
            subtitulo: formSubtitulo.trim() || 'Tablero analítico institucional',
            codigo_direccion: formDireccion,
            tipo: esPowerBi ? 'powerbi' : 'proximamente',
            url_embed: urlEmbedExtraida || null,
            descripcion: formDescripcion.trim() || 'Reporte de seguimiento de gestión para la dirección de línea.',
            responsable: formResponsable.trim() || session.nombre || 'Especialista DGNNA',
            estado: formEstado,
          }),
        })

        let idCreado = nuevoId
        if (res && res.ok) {
          try {
            const creado = await res.json()
            if (creado && creado.id) {
              idCreado = creado.id
            }
          } catch {}
        }

        const nuevoItem: TableroItem = {
          id: idCreado,
          titulo: formTitulo.trim(),
          subtitulo: formSubtitulo.trim() || 'Tablero analítico institucional',
          direccion: formDireccion,
          tipo: esPowerBi ? 'powerbi' : 'proximamente',
          urlEmbed: urlEmbedExtraida || undefined,
          descripcion: formDescripcion.trim() || 'Reporte de seguimiento de gestión para la dirección de línea.',
          actualizacion: 'Actualizado recientemente',
          estado: formEstado,
          responsable: formResponsable.trim() || session.nombre || 'Especialista DGNNA',
          esPersonalizado: true,
        }
        const nuevaLista = [...tablerosList, nuevoItem]
        guardarEnStorage(nuevaLista)
        setTableroActivoId(idCreado)
        toast.success('Nuevo tablero registrado con éxito')
        await cargarTablerosDesdeBackend()
      }
    } catch {
      toast.error('Hubo un inconveniente al guardar')
    }

    setModalAbierto(false)
    setCargandoIframe(true)
  }

  // Eliminar Tablero
  const eliminarTablero = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este tablero de la lista?')) {
      try {
        await fetch(`/api/tableros/${id}`, { method: 'DELETE' })
      } catch {}

      const filtrados = tablerosList.filter(t => t.id !== id)
      guardarEnStorage(filtrados)
      if (tableroActivoId === id) {
        setTableroActivoId(filtrados[0]?.id || 'dsld-general-v3')
      }
      toast.success('Tablero eliminado')
      await cargarTablerosDesdeBackend()
    }
  }

  // Restaurar Catálogo por Defecto
  const restaurarCatalogo = () => {
    if (confirm('¿Deseas restablecer los tableros al catálogo original oficial?')) {
      guardarEnStorage(TABLEROS_BASE)
      setTableroActivoId('dsld-general-v3')
      toast.success('Catálogo oficial restablecido')
    }
  }

  // Filtrado de tableros por búsqueda si existe
  const tablerosPorDireccion = (dir: DireccionCodigo) => {
    return tablerosList.filter(t => {
      const matchDir = t.direccion === dir
      if (!busqueda.trim()) return matchDir
      const q = busqueda.toLowerCase()
      return matchDir && (t.titulo.toLowerCase().includes(q) || t.subtitulo.toLowerCase().includes(q))
    })
  }

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. MENÚ LATERAL IZQUIERDO (SIDEBAR POR DIRECCIONES)
      ───────────────────────────────────────────────────────────── */}
      <aside
        className={`bg-white border-r border-slate-200/90 shadow-sm flex flex-col flex-shrink-0 transition-all duration-300 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-80'
        }`}
      >
        {/* Cabecera del Sidebar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h1 className="font-bold text-xs tracking-tight text-slate-900 leading-tight truncate">
                  Tableros de Dirección
                </h1>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  DGNNA · MIMP
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <LayoutDashboard className="w-4 h-4" />
              </div>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Botones de Navegación Rápida */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 space-y-1.5">
          <Link
            href="/menu"
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
            {!sidebarCollapsed && <span>Volver al Menú Principal</span>}
          </Link>

          <button
            onClick={irAInicio}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tableroActivoId === null
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100 border border-transparent'
            } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
            title="Pantalla de Inicio / Catálogo"
          >
            <Home className="w-3.5 h-3.5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Inicio / Resumen</span>}
          </button>
        </div>

        {/* Buscador Rápido y Botón Agregar (visible si expandido) */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-3 pb-1 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar tablero o tema..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-400 rounded-lg outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={() => cargarTablerosDesdeBackend(true)}
                title="Sincronizar tableros con el servidor central"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors flex-shrink-0 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {puedeGestionar && (
              <button
                onClick={() => abrirModalCrear()}
                className="w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Nuevo Tablero</span>
              </button>
            )}
          </div>
        )}

        {/* Lista de Direcciones y Tableros */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 custom-scrollbar">
          {(['DSLD', 'DPNNA', 'DPE', 'DA'] as DireccionCodigo[]).map(codigo => {
            const dir = DIRECCIONES_DATA[codigo]
            const DirIcon = dir.icono
            const tableros = tablerosPorDireccion(codigo)
            const estaAbierta = Boolean(busqueda.trim()) || seccionesAbiertas[codigo]
            const tieneActivo = tableros.some(t => t.id === tableroActivoId)
            const tienePbi = tableros.some(t => t.tipo === 'powerbi')

            if (sidebarCollapsed) {
              return (
                <div key={codigo} className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      setSidebarCollapsed(false)
                      setSeccionesAbiertas(prev => ({ ...prev, [codigo]: true }))
                      if (tableros[0]) seleccionarTablero(tableros[0])
                    }}
                    title={`${dir.codigo}: ${dir.nombreCompleto}`}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                      tieneActivo
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <DirIcon className="w-5 h-5" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">{dir.codigo}</span>
                </div>
              )
            }

            return (
              <div
                key={codigo}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  tieneActivo
                    ? 'border-blue-200 bg-blue-50/20 shadow-sm'
                    : 'border-slate-200/80 bg-white'
                }`}
              >
                {/* Header de la Dirección (Acordeón) */}
                <button
                  onClick={() => toggleSeccion(codigo)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tieneActivo ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <DirIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 tracking-tight">{dir.codigo}</span>
                        {tienePbi && (
                          <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                            En Línea
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 truncate">{dir.nombreCompleto}</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-1 ${
                      estaAbierta ? 'rotate-180 text-slate-600' : ''
                    }`}
                  />
                </button>

                {/* Sub-items de Tableros */}
                {estaAbierta && (
                  <div className="px-2 pb-2 pt-1 space-y-1 border-t border-slate-100/80">
                    {tableros.map(item => {
                      const isSelected = item.id === tableroActivoId

                      return (
                        <div key={item.id} className="relative group">
                          <button
                            onClick={() => seleccionarTablero(item)}
                            title={item.nombreCompletoTooltip || item.titulo}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-all flex items-start gap-2 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {item.estado === 'activo' ? (
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected ? 'bg-white ring-2 ring-blue-300' : 'bg-emerald-500'
                                  }`}
                                />
                              ) : item.estado === 'desarrollo' ? (
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected ? 'bg-amber-200' : 'bg-amber-400'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected ? 'bg-slate-300' : 'bg-slate-300'
                                  }`}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pr-5">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="truncate leading-tight"
                                  title={item.nombreCompletoTooltip || item.titulo}
                                >
                                  {item.titulo}
                                </span>
                                {item.tipo === 'powerbi' && (
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-extrabold tracking-wider ${
                                      isSelected
                                        ? 'bg-blue-700 text-white'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    PBI
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] block truncate leading-tight mt-0.5 ${
                                  isSelected ? 'text-blue-100' : 'text-slate-500'
                                }`}
                              >
                                {item.subtitulo}
                              </span>
                            </div>
                          </button>

                          {/* Acciones de edición rápida en hover */}
                          {puedeGestionar && (
                            <div className="absolute right-1.5 top-2 hidden group-hover:flex items-center gap-1 z-10">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  abrirModalEditar(item)
                                }}
                                title="Editar tablero"
                                className={`p-1 rounded-md transition-colors ${
                                  isSelected
                                    ? 'bg-blue-700 text-white hover:bg-blue-800'
                                    : 'bg-white text-slate-600 hover:bg-slate-200 shadow-2xs border border-slate-200'
                                }`}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              {item.esPersonalizado && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    eliminarTablero(item.id)
                                  }}
                                  title="Eliminar tablero"
                                  className="p-1 rounded-md bg-white text-red-600 hover:bg-red-50 shadow-2xs border border-red-200 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer del Sidebar con Sesión y Estado */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {session.nombre?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{session.nombre}</p>
                  <p className="text-[10px] font-medium text-slate-500 capitalize">{session.rol}</p>
                </div>
              </div>

              {puedeGestionar && (
                <button
                  onClick={restaurarCatalogo}
                  title="Restaurar catálogo oficial"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {session.nombre?.charAt(0) || 'U'}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. ÁREA CENTRAL (VISUALIZADOR DEL TABLERO / POWER BI)
      ───────────────────────────────────────────────────────────── */}
      <main
        ref={contenedorRef}
        className="flex-1 flex flex-col min-w-0 h-screen bg-[#F8FAFC] overflow-hidden"
      >
        {/* ── CASO A: PANTALLA DE INICIO (HOME / BIENVENIDA COMPACTA Y SOBRIA) ── */}
        {!tableroActivo || !direccionConfig ? (
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
            {/* Cabecera Superior Sobria (Estilo Institucional DGNNA) */}
            <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between gap-4 flex-shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                  <LayoutDashboard className="w-4 h-4 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      Tableros de Información Gerencial por Dirección
                    </h2>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                      DGNNA · MIMP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Monitoreo y seguimiento estratégico de las cuatro Direcciones de Línea
                  </p>
                </div>
              </div>

              {puedeGestionar && (
                <button
                  onClick={() => abrirModalCrear('DSLD')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Tablero</span>
                </button>
              )}
            </header>

            {/* Contenido Principal en 1 Sola Pantalla (Fit to Screen) */}
            <div className="flex-1 p-5 lg:p-6 flex flex-col justify-between max-w-6xl w-full mx-auto overflow-hidden">
              {/* Barra informativa compacta y sobria */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  <p className="text-xs text-slate-600">
                    Selecciona una dirección de línea para consultar sus indicadores oficiales y tableros interactivos.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <strong>{statsDirecciones.enLinea}</strong> En Línea (PBI)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <strong>{statsDirecciones.enModelado}</strong> En Modelado
                  </span>
                </div>
              </div>

              {/* Grid 2x2 de las 4 Direcciones (Alturas calibradas para entrar sin scroll) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
                {(['DSLD', 'DPNNA', 'DPE', 'DA'] as DireccionCodigo[]).map(codigo => {
                  const dir = DIRECCIONES_DATA[codigo]
                  const DirIcon = dir.icono
                  const tableros = tablerosPorDireccion(codigo)
                  const tablerosPbi = tableros.filter(t => t.tipo === 'powerbi')
                  const tienePbi = tablerosPbi.length > 0

                  return (
                    <div
                      key={codigo}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all duration-150 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Cabecera de la Tarjeta */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
                              <DirIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                  {dir.codigo}
                                </h3>
                                {tienePbi ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    En Línea (PBI)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                    En Modelado
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 truncate">
                                {dir.nombreCompleto}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 flex-shrink-0">
                            {tableros.length} {tableros.length === 1 ? 'tablero' : 'tableros'}
                          </span>
                        </div>

                        {/* Descripción breve */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {dir.descripcion}
                        </p>
                      </div>

                      {/* Botón de acción sobrio */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSeccionesAbiertas(prev => ({ ...prev, [codigo]: true }))
                            if (tableros[0]) {
                              seleccionarTablero(tableros[0])
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            tienePbi
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-95'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{tienePbi ? `Ingresar al Tablero ${dir.codigo}` : `Ver Información ${dir.codigo}`}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {puedeGestionar && (
                          <button
                            onClick={() => abrirModalCrear(codigo)}
                            title={`Vincular nuevo tablero a ${codigo}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-slate-100 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pie sobrio de ayuda */}
              <div className="text-center text-[11px] text-slate-400 pt-1">
                Dirección General de Niñas, Niños y Adolescentes · Plataforma Unificada de Información
              </div>
            </div>
          </div>
        ) : (
          /* ── CASO B: VISUALIZADOR DEL TABLERO SELECCIONADO ── */
          <>
            {/* Barra Superior del Tablero */}
            <header className="h-16 border-b border-slate-200/90 bg-white px-5 flex items-center justify-between gap-4 flex-shrink-0 z-10 shadow-xs">
              {/* Título y Breadcrumb */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={irAInicio}
                  title="Volver a la pantalla de inicio del módulo"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    tableroActivo.direccion === 'DSLD'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <direccionConfig.icono className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {direccionConfig.nombreCorto} · {direccionConfig.nombreCompleto}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {tableroActivo.estado === 'activo' ? 'En Línea' : 'Próximamente'}
                    </span>
                  </div>
                  <h2
                    className="text-sm sm:text-base font-extrabold text-slate-900 truncate"
                    title={tableroActivo.nombreCompletoTooltip || tableroActivo.titulo}
                  >
                    {tableroActivo.titulo}
                  </h2>
                  {tableroActivo.subtitulo && (
                    <p
                      className="text-xs text-slate-500 font-medium truncate mt-0.5"
                      title={tableroActivo.subtitulo}
                    >
                      {tableroActivo.subtitulo}
                    </p>
                  )}
                </div>
              </div>

              {/* Botonera de Herramientas Operativas */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {tableroActivo.tipo === 'powerbi' && (
                  <>
                    <button
                      onClick={recargarIframe}
                      title="Recargar visualización"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Recargar</span>
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      title={isFullscreen ? 'Salir de pantalla completa' : 'Ver a pantalla completa'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Salir Fullscreen</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Pantalla Completa</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={compartirEnlace}
                      title="Copiar enlace directo"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                    >
                      {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                      <span className="hidden md:inline">{copiado ? 'Copiado' : 'Compartir'}</span>
                    </button>

                    {tableroActivo.urlEmbed && (
                      <a
                        href={tableroActivo.urlEmbed}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir en Power BI Web (nueva pestaña)"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Abrir en Power BI</span>
                      </a>
                    )}
                  </>
                )}

                {puedeGestionar && (
                  <button
                    onClick={() => abrirModalEditar(tableroActivo)}
                    title="Editar título, subtítulo, URL o estado de este tablero"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                )}
              </div>
            </header>

            {/* Contenido Dinámico: Iframe Power BI o Placeholder de Dirección */}
            <div className="flex-1 w-full relative bg-[#F1F5F9] overflow-hidden p-2 sm:p-3">
              {tableroActivo.tipo === 'powerbi' && tableroActivo.urlEmbed ? (
                <div className="w-full h-full relative bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col">
                  {/* Spinner / Skeleton de Carga */}
                  {cargandoIframe && (
                    <div className="absolute inset-0 z-20 bg-slate-50/95 flex flex-col items-center justify-center gap-3 backdrop-blur-xs">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center">
                        <RotateCw className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-800">Cargando Tablero de Power BI...</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Conectando con Microsoft Power BI Service para {tableroActivo.direccion}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Contenedor del Iframe Oficial */}
                  <iframe
                    key={iframeKey}
                    title={tableroActivo.titulo}
                    src={tableroActivo.urlEmbed}
                    allowFullScreen={true}
                    onLoad={() => setCargandoIframe(false)}
                    className="w-full h-full border-0 rounded-2xl"
                  />
                </div>
              ) : (
                /* Vista para Direcciones con Tablero Próximo (DPNNA, DPE, DA) */
                <div className="w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200/90 flex items-center justify-center p-6 overflow-y-auto">
                  <div className="max-w-xl text-center space-y-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
                      <direccionConfig.icono className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        En Fase de Modelado y Recopilación de Datos
                      </div>
                      <h3
                        className="text-xl font-black text-slate-900"
                        title={tableroActivo.nombreCompletoTooltip || tableroActivo.titulo}
                      >
                        {tableroActivo.titulo}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {tableroActivo.descripcion}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600" />
                        Alcance de la {direccionConfig.nombreCompleto} ({direccionConfig.codigo})
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {direccionConfig.descripcion}
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200">
                        <span>Responsable: <strong className="text-slate-700">{tableroActivo.responsable || 'Dirección de Línea'}</strong></span>
                        <span>Estado: <strong className="text-amber-700 uppercase">{tableroActivo.estado}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setTableroActivoId('dsld-general-v3')
                          setCargandoIframe(true)
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                      >
                        <Building2 className="w-4 h-4" />
                        Ver Tablero Activo de DSLD
                      </button>

                      {puedeGestionar && (
                        <button
                          onClick={() => abrirModalEditar(tableroActivo)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Pegar Enlace Power BI de {direccionConfig.codigo}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. MODAL DE GESTIÓN / REGISTRO DE TABLERO
      ───────────────────────────────────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {tableroEnEdicion ? 'Editar Tablero de Dirección' : 'Nuevo Tablero de Dirección'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configura la URL de Power BI o métrica para la dirección de línea
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={guardarTablero} className="p-5 space-y-4">
              {/* Selector de Dirección de Línea (Botonera 1-clic) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dirección de Línea
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['DSLD', 'DPNNA', 'DPE', 'DA'] as DireccionCodigo[]).map(cod => {
                    const sel = formDireccion === cod
                    return (
                      <button
                        key={cod}
                        type="button"
                        onClick={() => setFormDireccion(cod)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                          sel
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cod}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título del Tablero *
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={e => setFormTitulo(e.target.value)}
                  placeholder="Ej: Tablero de Cobertura UPE 2026"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Subtítulo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo o Temática
                </label>
                <input
                  type="text"
                  value={formSubtitulo}
                  onChange={e => setFormSubtitulo(e.target.value)}
                  placeholder="Ej: Monitoreo mensual de atenciones y medidas"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* URL o Código Iframe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL de Power BI o Código &lt;iframe&gt; completo
                </label>
                <textarea
                  rows={3}
                  value={formIframeInput}
                  onChange={e => setFormIframeInput(e.target.value)}
                  placeholder="Pega aquí la URL https://app.powerbi.com/view?r=... o el código iframe completo"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Si pegas el código HTML del iframe, el sistema extraerá automáticamente el enlace web.
                </p>
              </div>

              {/* Estado y Responsable */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formEstado}
                    onChange={e => setFormEstado(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="activo">🟢 Activo (En Línea)</option>
                    <option value="desarrollo">🟡 En Desarrollo</option>
                    <option value="planificado">⚪ Planificado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Responsable / Equipo
                  </label>
                  <input
                    type="text"
                    value={formResponsable}
                    onChange={e => setFormResponsable(e.target.value)}
                    placeholder="Ej: Equipo Técnico DPE"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{tableroEnEdicion ? 'Guardar Cambios' : 'Registrar Tablero'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
