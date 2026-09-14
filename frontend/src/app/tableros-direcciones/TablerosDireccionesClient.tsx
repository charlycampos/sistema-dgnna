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
  RefreshCw,
  Home,
} from 'lucide-react'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
}

export type DireccionCodigo = 'DSLD' | 'DPNNA' | 'DPE' | 'DA' | 'PREVENIR'

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

interface TableroApiItem {
  id: string
  titulo: string
  nombre_completo_tooltip?: string | null
  subtitulo?: string | null
  codigo_direccion: DireccionCodigo
  tipo?: TableroItem['tipo'] | null
  url_embed?: string | null
  descripcion?: string | null
  responsable?: string | null
  estado?: TableroItem['estado'] | null
  es_personalizado?: boolean | null
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
  PREVENIR: {
    codigo: 'PREVENIR',
    nombreCorto: 'PREVENIR',
    nombreCompleto: 'Estrategia Prevenir para Proteger',
    descripcion: 'Monitoreo multisectorial e intergubernamental para la prevención de la violencia sexual en NNA (D.S. N° 008-2024-MIMP).',
    icono: ShieldAlert,
    color: {
      bg: 'bg-purple-600',
      text: 'text-purple-700',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      border: 'border-purple-500',
      lightBg: 'bg-purple-50/50',
    },
  },
}


export default function TablerosDireccionesClient({ session }: Props) {
  const [tablerosList, setTablerosList] = useState<TableroItem[]>([])
  const [catalogoCargado, setCatalogoCargado] = useState(false)
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null)
  const [tableroActivoId, setTableroActivoId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<DireccionCodigo, boolean>>({
    DSLD: false,
    DPNNA: false,
    DPE: false,
    DA: false,
    PREVENIR: false,
  })
  const [cargandoIframe, setCargandoIframe] = useState(true)
  const [iframeKey, setIframeKey] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorIframe, setErrorIframe] = useState(false)

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
  const modalRef = useRef<HTMLDivElement>(null)
  const cerrarModalRef = useRef<HTMLButtonElement>(null)

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
  const obtenerDetalleError = async (res: Response, accion: string) => {
    try {
      const data = await res.json() as { detail?: string | Array<{ msg?: string; loc?: Array<string | number> }> }
      if (typeof data.detail === 'string') return data.detail
      if (Array.isArray(data.detail)) {
        const detalle = data.detail
          .map(error => `${error.loc?.slice(1).join('.') || 'Dato'}: ${error.msg || 'valor no valido'}`)
          .join('; ')
        if (detalle) return detalle
      }
    } catch {
      // La respuesta no contiene JSON.
    }
    return `${accion} (${res.status})`
  }

  const cargarTablerosDesdeBackend = async (mostrarToast = false) => {
    setErrorCatalogo(null)
    try {
      const res = await fetch('/api/tableros')
      if (!res.ok) throw new Error(await obtenerDetalleError(res, 'No se pudo cargar el catalogo'))
      {
        const data = await res.json()
        if (Array.isArray(data)) {
          const remotos: TableroItem[] = (data as TableroApiItem[]).map(d => {
            return {
              id: d.id,
              titulo: d.titulo,
              nombreCompletoTooltip:
                d.nombre_completo_tooltip || undefined,
              subtitulo: d.subtitulo || '',
              direccion: d.codigo_direccion as DireccionCodigo,
              tipo: d.tipo || 'powerbi',
              urlEmbed: d.url_embed || undefined,
              descripcion: d.descripcion || '',
              responsable: d.responsable || undefined,
              estado: d.estado || 'activo',
              esPersonalizado: d.es_personalizado ?? false,
            }
          })
          setTablerosList(remotos)
          setCatalogoCargado(true)
          if (mostrarToast) {
            toast.success('Tableros sincronizados con el servidor')
          }
          return remotos
        }
        throw new Error('El servidor devolvio un catalogo no valido')
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo sincronizar con el servidor'
      setErrorCatalogo(mensaje)
      setCatalogoCargado(true)
      if (mostrarToast) {
        toast.error(mensaje)
      }
    }
    return null
  }

  // El backend es la única fuente autoritativa del catálogo.
  useEffect(() => {
    void cargarTablerosDesdeBackend()

    // Leer parámetro ?id= de la URL si existe
    if (typeof window !== 'undefined') {
      const sincronizarDesdeUrl = () => setTableroActivoId(new URLSearchParams(window.location.search).get('id'))
      sincronizarDesdeUrl()
      window.addEventListener('popstate', sincronizarDesdeUrl)
      return () => window.removeEventListener('popstate', sincronizarDesdeUrl)
    }
    // Este efecto registra popstate una sola vez; las recargas posteriores son acciones explícitas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tableroActivo = useMemo(() => {
    if (!tableroActivoId) return null
    return tablerosList.find(t => t.id === tableroActivoId) || null
  }, [tablerosList, tableroActivoId])

  useEffect(() => {
    if (catalogoCargado && tableroActivoId && !tablerosList.some(t => t.id === tableroActivoId)) {
      setTableroActivoId(null)
      const url = new URL(window.location.href)
      url.searchParams.delete('id')
      window.history.replaceState(null, '', url)
    }
  }, [catalogoCargado, tableroActivoId, tablerosList])

  useEffect(() => {
    if (!tableroActivo) return
    setSeccionesAbiertas(prev => ({ ...prev, [tableroActivo.direccion]: true }))
  }, [tableroActivo])

  const statsDirecciones = useMemo(() => {
    const codigos: DireccionCodigo[] = ['DSLD', 'DPNNA', 'DPE', 'DA', 'PREVENIR']
    const enLinea = codigos.filter(c =>
      tablerosList.some(t => t.direccion === c && t.tipo === 'powerbi' && t.estado === 'activo' && Boolean(t.urlEmbed))
    ).length
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
    const url = new URL(window.location.href)
    url.searchParams.set('id', item.id)
    window.history.pushState(null, '', url)
    setCargandoIframe(true)
    setErrorIframe(false)
  }

  const irAInicio = () => {
    setTableroActivoId(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('id')
    window.history.pushState(null, '', url)
  }

  const recargarIframe = () => {
    setErrorIframe(false)
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

  const compartirEnlace = async () => {
    if (typeof window !== 'undefined' && tableroActivo) {
      const url = `${window.location.origin}${window.location.pathname}?id=${tableroActivo.id}`
      try {
        await navigator.clipboard.writeText(url)
        setCopiado(true)
        toast.success('Enlace del tablero copiado al portapapeles')
        setTimeout(() => setCopiado(false), 2500)
      } catch {
        toast.error('No se pudo copiar el enlace. Revisa los permisos del navegador.')
      }
    }
  }

  useEffect(() => {
    if (!modalAbierto) return
    const elementoPrevio = document.activeElement as HTMLElement | null
    cerrarModalRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalAbierto(false)
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return
      const focos = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, [href], [tabindex]:not([tabindex="-1"])')
      )
      if (!focos.length) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      elementoPrevio?.focus()
    }
  }, [modalAbierto])

  useEffect(() => {
    if (!cargandoIframe) return
    const timeout = window.setTimeout(() => {
      setCargandoIframe(false)
      setErrorIframe(true)
    }, 20000)
    return () => window.clearTimeout(timeout)
  }, [cargandoIframe, iframeKey, tableroActivoId])

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

  const esUrlPowerBiValida = (url: string): boolean => {
    if (!url) return true
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' &&
        (parsed.hostname === 'app.powerbi.com' || parsed.hostname === 'embedded.powerbi.com')
    } catch {
      return false
    }
  }

  // Guardar Tablero (Nuevo o Editado)
  const guardarTablero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) {
      toast.error('Por favor ingresa un título para el tablero')
      return
    }

    const urlEmbedExtraida = procesarUrlIframe(formIframeInput)
    if (!esUrlPowerBiValida(urlEmbedExtraida)) {
      toast.error('Ingresa una URL HTTPS válida del dominio powerbi.com')
      return
    }
    const esPowerBi = Boolean(urlEmbedExtraida)

    setGuardando(true)
    try {
      if (tableroEnEdicion) {
        // Sincronizar en backend
        const res = await fetch(`/api/tableros/${tableroEnEdicion.id}`, {
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
        if (!res.ok) throw new Error(await obtenerDetalleError(res, 'No se pudo actualizar el tablero'))
        const actualizado = await res.json() as TableroApiItem
        if (!actualizado?.id || actualizado.id !== tableroEnEdicion.id) {
          throw new Error('El servidor no confirmo la actualizacion del tablero')
        }

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
        if (!res.ok) throw new Error(await obtenerDetalleError(res, 'No se pudo registrar el tablero'))

        let idCreado = nuevoId
        try {
          const creado = await res.json()
          if (creado && typeof creado.id === 'string' && creado.id) idCreado = creado.id
          else throw new Error('El servidor no confirmo el registro del tablero')
        } catch {
          throw new Error('El servidor devolvió una respuesta inválida')
        }

        setTableroActivoId(idCreado)
        const url = new URL(window.location.href)
        url.searchParams.set('id', idCreado)
        window.history.pushState(null, '', url)
        toast.success('Nuevo tablero registrado con éxito')
        await cargarTablerosDesdeBackend()
      }
      setModalAbierto(false)
      setCargandoIframe(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hubo un inconveniente al guardar')
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar Tablero
  const eliminarTablero = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este tablero de la lista?')) {
      try {
        const res = await fetch(`/api/tableros/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(await obtenerDetalleError(res, 'No se pudo eliminar el tablero'))
        const eliminado = await res.json() as { id?: string }
        if (eliminado.id !== id) throw new Error('El servidor no confirmo la eliminacion del tablero')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el tablero')
        return
      }

      if (tableroActivoId === id) {
        setTableroActivoId(null)
      }
      toast.success('Tablero eliminado')
      await cargarTablerosDesdeBackend()
    }
  }

  // Filtrado de tableros por búsqueda si existe
  const busquedaNormalizada = busqueda.trim().toLowerCase()
  const tablerosPorDireccion = (dir: DireccionCodigo) => {
    return tablerosList.filter(t => {
      const matchDir = t.direccion === dir
      if (!busquedaNormalizada) return matchDir
      return matchDir && (t.titulo.toLowerCase().includes(busquedaNormalizada) || t.subtitulo.toLowerCase().includes(busquedaNormalizada))
    })
  }
  const hayResultadosBusqueda = !busquedaNormalizada || tablerosList.some(t =>
    t.titulo.toLowerCase().includes(busquedaNormalizada) || t.subtitulo.toLowerCase().includes(busquedaNormalizada)
  )
  const tableroPrioritario = (items: TableroItem[]) =>
    items.find(item => item.tipo === 'powerbi' && item.estado === 'activo' && Boolean(item.urlEmbed)) || items[0]

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. MENÚ LATERAL IZQUIERDO (SIDEBAR POR DIRECCIONES)
      ───────────────────────────────────────────────────────────── */}
      <aside
        className={`bg-white border-r border-slate-200/90 shadow-sm hidden md:flex flex-col flex-shrink-0 transition-all duration-300 z-30 ${
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
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
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
                  aria-label="Buscar tablero o tema"
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
                aria-label="Sincronizar tableros con el servidor central"
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
          {(['DSLD', 'DPNNA', 'DPE', 'DA', 'PREVENIR'] as DireccionCodigo[]).map(codigo => {
            const dir = DIRECCIONES_DATA[codigo]
            const DirIcon = dir.icono
            const tableros = tablerosPorDireccion(codigo)
            const estaAbierta = Boolean(busqueda.trim()) || seccionesAbiertas[codigo]
            const tieneActivo = tableros.some(t => t.id === tableroActivoId)
            const tienePbi = tableros.some(t => t.tipo === 'powerbi' && t.estado === 'activo' && Boolean(t.urlEmbed))

            if (sidebarCollapsed) {
              return (
                <div key={codigo} className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      setSidebarCollapsed(false)
                      setSeccionesAbiertas(prev => ({ ...prev, [codigo]: true }))
                       const prioritario = tableroPrioritario(tableros)
                       if (prioritario) seleccionarTablero(prioritario)
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
                  aria-expanded={estaAbierta}
                  aria-controls={`tableros-${codigo}`}
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
                  <div id={`tableros-${codigo}`} className="px-2 pb-2 pt-1 space-y-1 border-t border-slate-100/80">
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
                            <div className="absolute right-1.5 top-2 flex sm:hidden sm:group-hover:flex sm:group-focus-within:flex items-center gap-1 z-10">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  abrirModalEditar(item)
                                }}
                                title="Editar tablero"
                                aria-label={`Editar ${item.titulo}`}
                                className={`p-1 rounded-md transition-colors ${
                                  isSelected
                                    ? 'bg-blue-700 text-white hover:bg-blue-800'
                                    : 'bg-white text-slate-600 hover:bg-slate-200 shadow-2xs border border-slate-200'
                                }`}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  eliminarTablero(item.id)
                                }}
                                title="Eliminar tablero"
                                aria-label={`Eliminar ${item.titulo}`}
                                className="p-1 rounded-md bg-white text-red-600 hover:bg-red-50 shadow-2xs border border-red-200 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
          {!hayResultadosBusqueda && (
            <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
              <Search className="mx-auto mb-1.5 h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold text-slate-700">No se encontraron tableros</p>
              <button type="button" onClick={() => setBusqueda('')} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">
                Limpiar busqueda
              </button>
            </div>
          )}
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
        <div className="md:hidden flex-shrink-0 border-b border-slate-200 bg-white p-3">
          <label htmlFor="selector-tablero-movil" className="sr-only">Seleccionar tablero</label>
          <select
            id="selector-tablero-movil"
            value={tableroActivoId || ''}
            onChange={event => {
              const seleccionado = tablerosList.find(t => t.id === event.target.value)
              if (seleccionado) seleccionarTablero(seleccionado)
              else irAInicio()
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Inicio / Selecciona un tablero</option>
            {(['DSLD', 'DPNNA', 'DPE', 'DA', 'PREVENIR'] as DireccionCodigo[]).map(codigo => {
              const items = tablerosPorDireccion(codigo)
              return items.length > 0 ? (
                <optgroup key={codigo} label={`${codigo} — ${DIRECCIONES_DATA[codigo].nombreCompleto}`}>
                  {items.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
                </optgroup>
              ) : null
            })}
          </select>
        </div>
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
                    Monitoreo de cuatro Direcciones de Línea y la estrategia Prevenir para Proteger
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

              {errorCatalogo && (
                <div role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                  <p className="text-sm font-bold text-red-800">No se pudo cargar el catalogo de tableros</p>
                  <p className="mt-1 text-xs text-red-700">{errorCatalogo}</p>
                  <button
                    type="button"
                    onClick={() => void cargarTablerosDesdeBackend(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reintentar
                  </button>
                </div>
              )}

              {!errorCatalogo && catalogoCargado && tablerosList.length === 0 && (
                <div role="status" className="my-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
                  <LayoutDashboard className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-bold text-slate-800">No hay tableros registrados</p>
                  <p className="mt-1 text-xs text-slate-500">El catálogo del servidor está vacío.</p>
                  {puedeGestionar && (
                    <button type="button" onClick={() => abrirModalCrear()} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                      Registrar primer tablero
                    </button>
                  )}
                </div>
              )}

              {/* Grid de las 5 Direcciones y Estrategias */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 my-auto max-h-full overflow-y-auto pr-1">
                {(['DSLD', 'DPNNA', 'DPE', 'DA', 'PREVENIR'] as DireccionCodigo[]).map(codigo => {
                  const dir = DIRECCIONES_DATA[codigo]
                  const DirIcon = dir.icono
                  const tableros = tablerosPorDireccion(codigo)
                  const tablerosPbi = tableros.filter(t => t.tipo === 'powerbi')
                  const tienePbi = tablerosPbi.some(t => t.estado === 'activo' && Boolean(t.urlEmbed))

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
                            const prioritario = tableroPrioritario(tableros)
                            if (prioritario) seleccionarTablero(prioritario)
                          }}
                          disabled={tableros.length === 0}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            tienePbi
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-95'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
                          }`}
                        >
                          <span>{tableros.length === 0 ? 'Sin tableros registrados' : tienePbi ? `Ingresar al Tablero ${dir.codigo}` : `Ver Información ${dir.codigo}`}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {puedeGestionar && (
                          <button
                            onClick={() => abrirModalCrear(codigo)}
                            title={`Vincular nuevo tablero a ${codigo}`}
                            aria-label={`Vincular nuevo tablero a ${codigo}`}
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
                  aria-label="Volver a la pantalla de inicio del módulo"
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
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                      tableroActivo.tipo === 'powerbi' && tableroActivo.estado === 'activo' && tableroActivo.urlEmbed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : tableroActivo.estado === 'desarrollo'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tableroActivo.tipo === 'powerbi' && tableroActivo.estado === 'activo' && tableroActivo.urlEmbed
                          ? 'bg-emerald-500 animate-pulse'
                          : tableroActivo.estado === 'desarrollo' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      {tableroActivo.tipo === 'powerbi' && tableroActivo.estado === 'activo' && tableroActivo.urlEmbed
                        ? 'En Línea'
                        : tableroActivo.estado === 'desarrollo' ? 'En Desarrollo' : 'Planificado'}
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
                  {cargandoIframe && !errorIframe && (
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

                  {errorIframe && (
                    <div role="alert" className="absolute inset-0 z-20 bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <Info className="w-8 h-8 text-amber-600" />
                      <p className="text-sm font-bold text-slate-800">El tablero está tardando demasiado en responder</p>
                      <p className="text-xs text-slate-600">Comprueba tu conexión o intenta cargar nuevamente.</p>
                      <button type="button" onClick={recargarIframe} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                        Reintentar
                      </button>
                    </div>
                  )}

                  {/* Contenedor del Iframe Oficial */}
                  <iframe
                    key={iframeKey}
                    title={tableroActivo.titulo}
                    src={tableroActivo.urlEmbed}
                    allowFullScreen={true}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={() => {
                      setCargandoIframe(false)
                      setErrorIframe(false)
                    }}
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
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-tablero-titulo"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Cabecera del Modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="modal-tablero-titulo" className="text-sm font-bold text-slate-900">
                    {tableroEnEdicion ? 'Editar Tablero de Dirección' : 'Nuevo Tablero de Dirección'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configura la URL de Power BI o métrica para la dirección de línea
                  </p>
                </div>
              </div>
              <button
                ref={cerrarModalRef}
                type="button"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar formulario de tablero"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={guardarTablero} className="p-5 space-y-4">
              {/* Selector de Dirección de Línea (Botonera 1-clic) */}
              <div>
                <span id="direccion-label" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dirección de Línea
                </span>
                <div role="group" aria-labelledby="direccion-label" className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(['DSLD', 'DPNNA', 'DPE', 'DA', 'PREVENIR'] as DireccionCodigo[]).map(cod => {
                    const sel = formDireccion === cod
                    return (
                      <button
                        key={cod}
                        type="button"
                        onClick={() => setFormDireccion(cod)}
                        aria-pressed={sel}
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
                <label htmlFor="tablero-titulo" className="block text-xs font-bold text-slate-700 mb-1">
                  Título del Tablero *
                </label>
                <input
                  id="tablero-titulo"
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
                <label htmlFor="tablero-subtitulo" className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo o Temática
                </label>
                <input
                  id="tablero-subtitulo"
                  type="text"
                  value={formSubtitulo}
                  onChange={e => setFormSubtitulo(e.target.value)}
                  placeholder="Ej: Monitoreo mensual de atenciones y medidas"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* URL o Código Iframe */}
              <div>
                <label htmlFor="tablero-url" className="block text-xs font-bold text-slate-700 mb-1">
                  URL de Power BI o Código &lt;iframe&gt; completo
                </label>
                <textarea
                  id="tablero-url"
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
                  <label htmlFor="tablero-estado" className="block text-xs font-bold text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    id="tablero-estado"
                    value={formEstado}
                    onChange={e => setFormEstado(e.target.value as 'activo' | 'desarrollo' | 'planificado')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="activo">🟢 Activo (En Línea)</option>
                    <option value="desarrollo">🟡 En Desarrollo</option>
                    <option value="planificado">⚪ Planificado</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tablero-responsable" className="block text-xs font-bold text-slate-700 mb-1">
                    Responsable / Equipo
                  </label>
                  <input
                    id="tablero-responsable"
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
                  disabled={guardando}
                  aria-busy={guardando}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{guardando ? 'Guardando…' : tableroEnEdicion ? 'Guardar Cambios' : 'Registrar Tablero'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
