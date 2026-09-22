'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Building2,
  Award,
  AlertTriangle,
  Cog,
  Users,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  X,
  ShieldCheck,
  Phone,
  Mail,
  Upload,
  RefreshCw,
  Smile,
  Ship,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  FolderSync,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE ORÍGENES DE DATOS Y RUTAS
// ─────────────────────────────────────────────────────────────────────────────

interface OrigenDato {
  id: string
  nombre: string
  tablas: string
  tipo: string
  ruta: string
  ultimaSinc: string
  registros: number
  estado: 'Sincronizado' | 'Pendiente' | 'Sincronizando' | 'Error'
}

interface OrigenApi {
  id: string
  nombre: string
  tablas: string
  tipo: string
  rutaDefault?: string
  ultimaSincronizacion?: string | null
  registros?: number | null
}

type SyncResult = { ok: boolean; verificado: boolean; mensaje: string }

/** Extrae un mensaje legible de las respuestas de error del backend (detail puede ser texto u objeto). */
function mensajeDeError(data: unknown, porDefecto: string): string {
  if (!data || typeof data !== 'object') return porDefecto
  const d = data as Record<string, unknown>
  const detalle = d.detail
  if (typeof detalle === 'string') return detalle
  if (detalle && typeof detalle === 'object') {
    const m = (detalle as Record<string, unknown>).mensaje
    if (typeof m === 'string') return m
  }
  if (typeof d.mensaje === 'string') return d.mensaje
  if (typeof d.error === 'string') return d.error
  return porDefecto
}

// ─────────────────────────────────────────────────────────────────────────────
// DATOS REALES (Oracle · esquema DSLD v2 cargado desde DNA.mdb)
// ─────────────────────────────────────────────────────────────────────────────

interface KpisDsld {
  totalMunicipalidades: number
  acreditadas: number
  noAcreditadas: number
  noOperativas: number
  operativas: number
  pctAcreditadas: number
  pctNoAcreditadas: number
  pctNoOperativas: number
  pctOperativas: number
  provinciales: number
  distritales: number
  poblacionNna: number
}

interface CorteComparativo {
  anio: number
  mesCorte: number | null
  actual: number
  anterior: number
  variacionPct: number | null
}

interface SupervisionAnio {
  anio: number
  supervisiones: number
  demunas: number
  virtual: number
  presencial: number
  sinModalidad: number
}

interface CargaInfo {
  id: number
  archivo: string
  usuario: string | null
  estado: string
  fechaFin: string | null
  registrosCargados: number | null
}

interface RankingDepto {
  departamento: string
  ccddAnalitico: string
  total: number
  acreditadas: number
  noAcreditadas: number
  noOperativas: number
  operativas: number
  provinciales: number
  distritales: number
  supervisadas: number
  pctAcreditacion: number
}

interface ModoNinezAnio {
  anio: number
  regional: number
  provincial: number
  distrital: number
  total: number
  acumulado: number
}

interface ModoNinezResumen {
  migrado: boolean
  gobiernosAdheridos: number
  regionales: number
  provinciales: number
  distritales: number
  presentaronReporte: number
  presentaronPorNivel: { regional: number; provincial: number; distrital: number }
  pctPresentaron: number
  anioPresentacion: number | null
  ultimaPresentacion: string | null
  sinAnioAdhesion: number
  porAnio: ModoNinezAnio[]
  porMacroregion: { macroregion: string; total: number }[]
  porEstadoDemuna: Record<string, number>
  ultimaCarga: CargaInfo | null
}

interface ModoNinezDepto {
  departamento: string
  total: number
  regional: number
  provincial: number
  distrital: number
  presentaron: number
}

interface ModoNinezGobierno {
  ubigeo: string
  nivel: string
  gobierno: string
  macroregion: string | null
  departamento: string | null
  provincia: string | null
  distrito: string | null
  anioAdhesion: number | null
  fechaPresentacion: string | null
  fechaActa: string | null
  codigoDemuna: string | null
  estadoDemuna: string | null
}

interface PiasPorTipo {
  total: number
  nna: number
  padres: number
  autoridades: number
}

interface SexoConteo {
  mujeres: number
  hombres: number
  sinDato: number
}

interface PiasResumen {
  migrado: boolean
  totalAtendidos: number
  nna: number
  padres: number
  autoridades: number
  pctNna: number
  pctPadres: number
  pctAutoridades: number
  mujeres: number
  hombres: number
  pctMujeres: number
  pctHombres: number
  distritos: number
  comunidades: number
  primeraFecha: string | null
  ultimaActualizacion: string | null
  anios: number[]
  porCuenca: (PiasPorTipo & { cuenca: string })[]
  porMes: (PiasPorTipo & { anio: number; mes: number })[]
  sexoPorTipo: { nna: SexoConteo; padres: SexoConteo; autoridades: SexoConteo }
  porModalidad: Record<string, number>
  ultimaCarga: CargaInfo | null
}

interface PiasDistrito extends PiasPorTipo {
  departamento: string | null
  provincia: string | null
  distrito: string | null
  ubigeo: string
  cuenca: string
  mujeres: number
  hombres: number
  comunidades: number
  ultimaFecha: string | null
}

interface CapacitacionBase {
  participaciones: number
  personas: number
  personasDistintas: number
  virtual: number
  presencial: number
  demunas: number
}

interface CapacitacionResumen extends CapacitacionBase {
  migrado: boolean
  pctVirtual: number
  pctPresencial: number
  mujeres: number
  hombres: number
  pctMujeres: number
  pctHombres: number
  tasaAprobacion: number
  desaprobados: number
  cobertura: {
    distritos: number; totalDistritos: number; pctDistritos: number
    provincias: number; totalProvincias: number; pctProvincias: number
    departamentos: number; totalDepartamentos: number; pctDepartamentos: number
    demunas: number; totalDemunas: number; pctDemunas: number
  }
  primeraFecha: string | null
  ultimaActualizacion: string | null
  anios: number[]
  porAnio: (CapacitacionBase & { anio: number })[]
  comparativoCorte: CorteComparativo | null
  porCurso: (CapacitacionBase & { curso: string; siglas: string | null })[]
  porTipoAsistente: Record<string, number>
  ultimaCarga: CargaInfo | null
}

interface CapacitacionDepto extends CapacitacionBase {
  departamento: string
  totalDemunas: number
  pctDemunas: number | null
}

interface CconnaResumen {
  migrado: boolean
  totalConformados: number
  distritales: number
  provinciales: number
  regionales: number
  registradosMimp: number
  pctRegistrados: number
  totalNnaIntegrantes: number
  mujeres: number
  hombres: number
  pctMujeres: number
  pctHombres: number
  exIntegrantes: number
  integrantesPorNivel: Record<string, number>
  cobertura: {
    distritos: number; totalDistritos: number; pctDistritos: number
    provincias: number; totalProvincias: number; pctProvincias: number
    departamentos: number; totalDepartamentos: number; pctDepartamentos: number
  }
  documentos: { conOrdenanza: number; conResolucion: number; conActa: number; conPlan: number; conBaseNominal: number }
  porAnio: { anio: number; total: number; acumulado: number }[]
  ultimoRegistro: string | null
  ultimaCarga: CargaInfo | null
}

interface CconnaDepto {
  departamento: string
  total: number
  distrital: number
  provincial: number
  regional: number
  registradosMimp: number
  integrantes: number
}

interface CconnaItem {
  ubigeo: string
  nivel: string
  nombre: string
  departamento: string | null
  provincia: string | null
  distrito: string | null
  anioConformacion: number | null
  numeroOrdenanza: string | null
  fechaOrdenanza: string | null
  fechaActa: string | null
  fechaPlan: string | null
  baseNominal: string | null
  registroMimp: string | null
  oficioDsld: string | null
  fechaRegistro: string | null
}

interface ResumenDsld {
  cconna?: CconnaResumen
  capacitacion?: CapacitacionResumen
  modoNinez?: ModoNinezResumen
  pias?: PiasResumen
  kpis: KpisDsld
  acreditacion: {
    porAnio: Record<string, number>
    comparativoCorte: CorteComparativo
    ultimaFecha: string | null
  }
  supervision: {
    demunasSupervisadas: number
    demunasNoSupervisadas: number
    pctCobertura: number
    porAnio: SupervisionAnio[]
    historico: Record<string, number>
    comparativoCorte: CorteComparativo
    periodoUltimaSupervision: Record<string, number>
    ultimaFecha: string | null
  }
  ultimaCarga: CargaInfo | null
  rankingDepartamental: RankingDepto[]
}

interface DemunaItem {
  codigo: string
  nombre: string
  nombreCorto: string | null
  ubigeo: string
  departamento: string
  departamentoMod: string
  provincia: string
  distrito: string
  tipoGobierno: string
  estadoCodigo: string
  estado: string
  fechaAcreditacion: string | null
  resolucionAcreditacion: string | null
  direccion: string | null
  telefono: string | null
  telefono2: string | null
  email: string | null
  horario: string | null
  poblacionNna: number | null
  ultimaSupervision: string | null
  estadoSupervision: string
}

interface CatalogoGeo {
  departamentos: { departamento: string; provincias: string[] }[]
}

interface SupDeptosResp {
  anios: number[]
  departamentos: Array<Record<string, string | number>>
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const COLORES_ANIOS = ['#94A3B8', '#3B82F6', '#D91B24']
const DIR_POR_PAGINA = 50
const ESTADO_FILTRO_API: Record<string, string> = {
  Acreditadas: 'ACREDITADA',
  'No Acreditadas': 'NO ACREDITADA',
  'No Operativas': 'NO OPERATIVA',
}

// Orígenes ya migrados a Oracle: al cargarlos se recarga el tablero
const ORIGENES_MIGRADOS = new Set(['access_dsld', 'modo_ninez', 'pias', 'capacitacion', 'cconna'])
const COLORES_PIAS = { nna: '#0284C7', padres: '#059669', autoridades: '#D97706' } as const
const COLORES_NIVEL = { REGIONAL: '#92400E', PROVINCIAL: '#D97706', DISTRITAL: '#FBBF24' } as const
const ESTILO_ESTADO: Record<string, string> = {
  ACREDITADA: 'bg-[#DCFCE7] text-[#16A34A]',
  'NO ACREDITADA': 'bg-[#FEF3C7] text-[#D97706]',
  'NO OPERATIVA': 'bg-[#FEE2E2] text-[#DC2626]',
  'SIN DATO': 'bg-[#F1F5F9] text-[#64748B]',
}

const fmtNum = (n?: number | null) => (n ?? 0).toLocaleString('es-PE')

const fmtFecha = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtFechaHora = (iso?: string | null) => {
  if (!iso) return 'Sin registro'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : `${d.toLocaleDateString('es-PE')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
}

const textoVariacion = (c?: CorteComparativo | null) => {
  if (!c || c.mesCorte == null) return 'Sin datos del año en curso'
  const pct = c.variacionPct == null ? 's/v' : `${c.variacionPct > 0 ? '+' : ''}${c.variacionPct}%`
  return `${pct} vs ${c.anio - 1} (${fmtNum(c.anterior)} → ${fmtNum(c.actual)}, a ${MESES[c.mesCorte - 1]})`
}

async function obtenerJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(mensajeDeError(data, `Error HTTP ${res.status}`))
  return data as T
}

const ORÍGENES_INICIALES: OrigenDato[] = [
  {
    id: 'access_dsld',
    nombre: 'Base de Datos Principal DSLD (Microsoft Access)',
    tablas: 'dna, supervisadas, ubigeo, estadodna, modelodna, supervisores, población INEI',
    tipo: 'Access (.mdb / .accdb)',
    ruta: 'Z:\\Base de Datos\\DNA.mdb',
    ultimaSinc: 'Sin registro',
    registros: 0,
    estado: 'Pendiente',
  },
  {
    id: 'capacitacion',
    nombre: 'Capacitación a Defensores y Operadores',
    tablas: 'TB_CAPA_DEMUNA (CAPACITACION_20214-2026 NOMINAL.xlsx)',
    tipo: 'Excel (.xlsx)',
    ruta: 'W:\\DEMUNA\\CAPACITACION_20214-2026 NOMINAL.xlsx',
    ultimaSinc: 'Sin registro',
    registros: 0,
    estado: 'Pendiente',
  },
  {
    id: 'cconna',
    nombre: 'Consejos Consultivos NNA (CCONNA)',
    tablas: "BD ORGANIZACIONAL (Tabla1) y BD NOMINAL (Tabla5) del Excel 'CCONNA nominal'",
    tipo: 'Excel (.xlsx)',
    ruta: 'X:\\CCONNA',
    ultimaSinc: 'Sin registro',
    registros: 0,
    estado: 'Pendiente',
  },
  {
    id: 'modo_ninez',
    nombre: 'Ponte en Modo Niñez (Adhesión)',
    tablas: 'TB_MODO_NINEZ_2026 (MATRIZ DE REPORTE PBI 2026.xlsx)',
    tipo: 'Excel (.xlsx)',
    ruta: 'X:\\MODO_NIÑEZ\\MATRIZ DE REPORTE PBI 2026.xlsx',
    ultimaSinc: 'Sin registro',
    registros: 0,
    estado: 'Pendiente',
  },
  {
    id: 'pias',
    nombre: 'PIAS (Atenciones en Cuencas Fluviales)',
    tablas: 'TB_PIAS_AUTORIDADES, TB_PIAS_PADRES, TB_PIAS_NNA (PIAS_PBI_AUTORIDADES_PADRES.xlsx)',
    tipo: 'Excel (.xlsx)',
    ruta: 'X:\\PIAS\\PIAS_PBI_AUTORIDADES_PADRES.xlsx',
    ultimaSinc: 'Sin registro',
    registros: 0,
    estado: 'Pendiente',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCIA POWER BI (DSLD_GENERAL_V3.pbix) · SOLO PARA EJES AÚN NO MIGRADOS
// (referencia histórica del ranking DEMUNA). DEMUNA y Supervisión usan Oracle.

export default function DemunaDashboardClient() {
  // Pestañas separadas e independientes
  const [activeTab, setActiveTab] = useState<'demuna' | 'supervision' | 'capacitacion' | 'cconna' | 'modo_ninez' | 'pias' | 'directorio'>('demuna')

  // Filtros Globales
  const [selectedDepto, setSelectedDepto] = useState('Todas')
  const [selectedProv, setSelectedProv] = useState('Todas')
  const [estadoAcreditacion, setEstadoAcreditacion] = useState('Todas')

  // Modal del Gestor de Orígenes de Datos (Rutas y Sincronización)
  const [origenesModalOpen, setOrigenesModalOpen] = useState(false)
  const [origenesList, setOrigenesList] = useState<OrigenDato[]>(ORÍGENES_INICIALES)
  const [syncLoadingId, setSyncLoadingId] = useState<string | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<{ id: string; mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    if (!origenesModalOpen) return
    let activo = true
    const cargarOrigenes = async () => {
      try {
        const res = await fetch('/api/gestion-datos/dsld/origenes')
        if (!res.ok) return
        const data: { origenes?: OrigenApi[] } = await res.json()
        if (!activo || !Array.isArray(data.origenes)) return
        setOrigenesList(prev => data.origenes!.map(origen => {
          const local = prev.find(item => item.id === origen.id)
          return {
            id: origen.id,
            nombre: origen.nombre,
            tablas: origen.tablas,
            tipo: origen.tipo,
            ruta: local?.ruta || origen.rutaDefault || '',
            ultimaSinc: origen.ultimaSincronizacion ? fmtFechaHora(origen.ultimaSincronizacion) : local?.ultimaSinc || 'Sin registro',
            registros: origen.registros ?? local?.registros ?? 0,
            estado: local?.estado === 'Error' ? 'Error' : origen.ultimaSincronizacion ? 'Sincronizado' : local?.estado || 'Pendiente',
          }
        }))
      } catch {
        // Conserva el catálogo local si el servicio no está disponible.
      }
    }
    cargarOrigenes()
    return () => { activo = false }
  }, [origenesModalOpen])

  // Búsqueda en Directorio
  const [searchDirectorio, setSearchDirectorio] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')

  // Datos reales desde la API (Oracle)
  const [recarga, setRecarga] = useState(0)
  const [resumen, setResumen] = useState<ResumenDsld | null>(null)
  const [cargandoResumen, setCargandoResumen] = useState(true)
  const [errorResumen, setErrorResumen] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoGeo | null>(null)
  const [supDeptos, setSupDeptos] = useState<SupDeptosResp | null>(null)
  const [dirItems, setDirItems] = useState<DemunaItem[]>([])
  const [dirTotal, setDirTotal] = useState(0)
  const [dirPagina, setDirPagina] = useState(0)
  const [dirCargando, setDirCargando] = useState(false)
  const [dirError, setDirError] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  const parametrosFiltro = (extra: Record<string, string | number> = {}) => {
    const p = new URLSearchParams()
    if (selectedDepto !== 'Todas') p.set('departamento', selectedDepto)
    if (selectedProv !== 'Todas') p.set('provincia', selectedProv)
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)))
    return p
  }

  // Catálogo geográfico y supervisiones por departamento (no dependen de filtros)
  useEffect(() => {
    let activo = true
    obtenerJson<CatalogoGeo>('/api/gestion-datos/dsld/catalogo-geografico')
      .then(d => { if (activo) setCatalogo(d) })
      .catch(() => { if (activo) setCatalogo({ departamentos: [] }) })
    obtenerJson<SupDeptosResp>('/api/gestion-datos/dsld/supervision/departamentos')
      .then(d => { if (activo) setSupDeptos(d) })
      .catch(() => { if (activo) setSupDeptos(null) })
    return () => { activo = false }
  }, [recarga])

  // Resumen (KPIs, supervisión, ranking) según departamento / provincia
  useEffect(() => {
    let activo = true
    setCargandoResumen(true)
    setErrorResumen(null)
    const p = new URLSearchParams()
    if (selectedDepto !== 'Todas') p.set('departamento', selectedDepto)
    if (selectedProv !== 'Todas') p.set('provincia', selectedProv)
    obtenerJson<ResumenDsld>(`/api/gestion-datos/dsld/resumen?${p.toString()}`)
      .then(d => { if (activo) setResumen(d) })
      .catch((e: unknown) => { if (activo) setErrorResumen(e instanceof Error ? e.message : 'No se pudo cargar el resumen.') })
      .finally(() => { if (activo) setCargandoResumen(false) })
    return () => { activo = false }
  }, [selectedDepto, selectedProv, recarga])

  // Búsqueda con espera (evita una consulta por cada tecla)
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(searchDirectorio.trim()), 400)
    return () => clearTimeout(t)
  }, [searchDirectorio])

  // Cambiar filtros vuelve a la primera página del directorio
  useEffect(() => {
    setDirPagina(0)
  }, [selectedDepto, selectedProv, estadoAcreditacion, busquedaAplicada])

  // Directorio paginado (solo cuando la pestaña está abierta)
  useEffect(() => {
    if (activeTab !== 'directorio') return
    let activo = true
    setDirCargando(true)
    setDirError(null)
    const p = new URLSearchParams()
    if (selectedDepto !== 'Todas') p.set('departamento', selectedDepto)
    if (selectedProv !== 'Todas') p.set('provincia', selectedProv)
    if (ESTADO_FILTRO_API[estadoAcreditacion]) p.set('estadoAcreditacion', ESTADO_FILTRO_API[estadoAcreditacion])
    if (busquedaAplicada) p.set('busqueda', busquedaAplicada)
    p.set('limit', String(DIR_POR_PAGINA))
    p.set('offset', String(dirPagina * DIR_POR_PAGINA))
    obtenerJson<{ total: number; items: DemunaItem[] }>(`/api/gestion-datos/dsld/demunas?${p.toString()}`)
      .then(d => {
        if (!activo) return
        setDirItems(d.items || [])
        setDirTotal(d.total || 0)
      })
      .catch((e: unknown) => { if (activo) setDirError(e instanceof Error ? e.message : 'No se pudo cargar el directorio.') })
      .finally(() => { if (activo) setDirCargando(false) })
    return () => { activo = false }
  }, [activeTab, selectedDepto, selectedProv, estadoAcreditacion, busquedaAplicada, dirPagina, recarga])

  // Ponte en Modo Niñez (Oracle)
  const [mnDeptos, setMnDeptos] = useState<ModoNinezDepto[]>([])
  const [mnItems, setMnItems] = useState<ModoNinezGobierno[]>([])
  const [mnTotal, setMnTotal] = useState(0)
  const [mnPagina, setMnPagina] = useState(0)
  const [mnNivel, setMnNivel] = useState('')
  const [mnPresento, setMnPresento] = useState('')
  const [mnBusqueda, setMnBusqueda] = useState('')
  const [mnBusquedaAplicada, setMnBusquedaAplicada] = useState('')
  const [mnCargando, setMnCargando] = useState(false)
  const [mnError, setMnError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    obtenerJson<{ departamentos: ModoNinezDepto[] }>('/api/gestion-datos/dsld/modo-ninez/departamentos')
      .then(d => { if (activo) setMnDeptos(d.departamentos || []) })
      .catch(() => { if (activo) setMnDeptos([]) })
    return () => { activo = false }
  }, [recarga])

  useEffect(() => {
    const t = setTimeout(() => setMnBusquedaAplicada(mnBusqueda.trim()), 400)
    return () => clearTimeout(t)
  }, [mnBusqueda])

  useEffect(() => {
    setMnPagina(0)
  }, [selectedDepto, selectedProv, mnNivel, mnPresento, mnBusquedaAplicada])

  const parametrosModoNinez = (extra: Record<string, string | number>) => {
    const p = parametrosFiltro(extra)
    if (mnNivel) p.set('nivel', mnNivel)
    if (mnPresento) p.set('presento', mnPresento)
    if (mnBusquedaAplicada) p.set('busqueda', mnBusquedaAplicada)
    return p
  }

  useEffect(() => {
    if (activeTab !== 'modo_ninez') return
    let activo = true
    setMnCargando(true)
    setMnError(null)
    const p = parametrosModoNinez({ limit: DIR_POR_PAGINA, offset: mnPagina * DIR_POR_PAGINA })
    obtenerJson<{ total: number; items: ModoNinezGobierno[] }>(`/api/gestion-datos/dsld/modo-ninez/gobiernos?${p.toString()}`)
      .then(d => {
        if (!activo) return
        setMnItems(d.items || [])
        setMnTotal(d.total || 0)
      })
      .catch((e: unknown) => { if (activo) setMnError(e instanceof Error ? e.message : 'No se pudo cargar la lista de gobiernos.') })
      .finally(() => { if (activo) setMnCargando(false) })
    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDepto, selectedProv, mnNivel, mnPresento, mnBusquedaAplicada, mnPagina, recarga])

  const mnDeptosFiltrados = useMemo(
    () => (selectedDepto === 'Todas' ? mnDeptos : mnDeptos.filter(d => d.departamento === selectedDepto)),
    [mnDeptos, selectedDepto]
  )

  // CCONNA (Oracle)
  const [cconnaDeptos, setCconnaDeptos] = useState<CconnaDepto[]>([])
  const [cconnaItems, setCconnaItems] = useState<CconnaItem[]>([])
  const [cconnaTotal, setCconnaTotal] = useState(0)
  const [cconnaPagina, setCconnaPagina] = useState(0)
  const [cconnaNivel, setCconnaNivel] = useState('')
  const [cconnaRegistro, setCconnaRegistro] = useState('')
  const [cconnaBusqueda, setCconnaBusqueda] = useState('')
  const [cconnaBusquedaAplicada, setCconnaBusquedaAplicada] = useState('')
  const [cconnaCargando, setCconnaCargando] = useState(false)
  const [cconnaError, setCconnaError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setCconnaBusquedaAplicada(cconnaBusqueda.trim()), 400)
    return () => clearTimeout(t)
  }, [cconnaBusqueda])

  useEffect(() => {
    setCconnaPagina(0)
  }, [selectedDepto, selectedProv, cconnaNivel, cconnaRegistro, cconnaBusquedaAplicada])

  const parametrosCconna = (extra: Record<string, string | number>) => {
    const p = parametrosFiltro(extra)
    if (cconnaNivel) p.set('nivel', cconnaNivel)
    if (cconnaRegistro) p.set('registroMimp', cconnaRegistro)
    if (cconnaBusquedaAplicada) p.set('busqueda', cconnaBusquedaAplicada)
    return p
  }

  useEffect(() => {
    if (activeTab !== 'cconna') return
    let activo = true
    setCconnaCargando(true)
    setCconnaError(null)
    obtenerJson<{ departamentos: CconnaDepto[] }>('/api/gestion-datos/dsld/cconna/departamentos')
      .then(d => { if (activo) setCconnaDeptos(d.departamentos || []) })
      .catch(() => { if (activo) setCconnaDeptos([]) })
    const p = parametrosCconna({ limit: DIR_POR_PAGINA, offset: cconnaPagina * DIR_POR_PAGINA })
    obtenerJson<{ total: number; items: CconnaItem[] }>(`/api/gestion-datos/dsld/cconna/consejos?${p.toString()}`)
      .then(d => {
        if (!activo) return
        setCconnaItems(d.items || [])
        setCconnaTotal(d.total || 0)
      })
      .catch((e: unknown) => { if (activo) setCconnaError(e instanceof Error ? e.message : 'No se pudo cargar la lista de CCONNA.') })
      .finally(() => { if (activo) setCconnaCargando(false) })
    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDepto, selectedProv, cconnaNivel, cconnaRegistro, cconnaBusquedaAplicada, cconnaPagina, recarga])

  // Capacitación (Oracle): ranking por departamento
  const [capaDeptos, setCapaDeptos] = useState<CapacitacionDepto[]>([])
  const [capaError, setCapaError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== 'capacitacion') return
    let activo = true
    setCapaError(null)
    obtenerJson<{ departamentos: CapacitacionDepto[] }>('/api/gestion-datos/dsld/capacitacion/departamentos')
      .then(d => { if (activo) setCapaDeptos(d.departamentos || []) })
      .catch((e: unknown) => { if (activo) setCapaError(e instanceof Error ? e.message : 'No se pudo cargar el detalle por departamento.') })
    return () => { activo = false }
  }, [activeTab, recarga])

  // PIAS (Oracle): tabla por distrito y cuenca según los filtros globales
  const [piasDistritos, setPiasDistritos] = useState<PiasDistrito[]>([])
  const [piasError, setPiasError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== 'pias') return
    let activo = true
    setPiasError(null)
    obtenerJson<{ distritos: PiasDistrito[] }>(`/api/gestion-datos/dsld/pias/distritos?${parametrosFiltro().toString()}`)
      .then(d => { if (activo) setPiasDistritos(d.distritos || []) })
      .catch((e: unknown) => { if (activo) setPiasError(e instanceof Error ? e.message : 'No se pudo cargar la tabla PIAS.') })
    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDepto, selectedProv, recarga])

  // Listas de filtros (desde el catálogo geográfico real)
  const deptosList = useMemo(() => {
    return ['Todas', ...(catalogo?.departamentos.map(d => d.departamento) ?? [])]
  }, [catalogo])

  const provList = useMemo(() => {
    if (selectedDepto === 'Todas') return ['Todas']
    const dep = catalogo?.departamentos.find(d => d.departamento === selectedDepto)
    return ['Todas', ...(dep?.provincias ?? [])]
  }, [catalogo, selectedDepto])

  // Gráfico de acreditación por departamento (ranking real)
  const acreditacionPorDepto = useMemo(() => {
    let lista = resumen?.rankingDepartamental ?? []
    if (selectedDepto !== 'Todas') lista = lista.filter(r => r.departamento === selectedDepto)
    return lista.map(r => ({
      depto: r.departamento,
      acreditada: estadoAcreditacion === 'Todas' || estadoAcreditacion === 'Acreditadas' ? r.acreditadas : 0,
      noAcreditada: estadoAcreditacion === 'Todas' || estadoAcreditacion === 'No Acreditadas' ? r.noAcreditadas : 0,
      noOperativa: estadoAcreditacion === 'Todas' || estadoAcreditacion === 'No Operativas' ? r.noOperativas : 0,
    }))
  }, [resumen, selectedDepto, estadoAcreditacion])

  // Gráfico de supervisiones por departamento y año
  const aniosSupervision = useMemo(() => (supDeptos?.anios ?? []).map(String), [supDeptos])
  const supervisionPorDepto = useMemo(() => {
    let lista = supDeptos?.departamentos ?? []
    if (selectedDepto !== 'Todas') lista = lista.filter(r => r.departamento === selectedDepto)
    return lista
  }, [supDeptos, selectedDepto])

  const kpis = resumen?.kpis
  const mn = resumen?.modoNinez
  const capa = resumen?.capacitacion
  const cconna = resumen?.cconna
  const pias = resumen?.pias
  const piasMeses = (pias?.porMes ?? []).map(m => ({
    ...m,
    etiqueta: `${MESES[m.mes - 1].slice(0, 3)}${(pias?.anios.length ?? 0) > 1 ? ` ${m.anio}` : ''}`,
  }))
  const sup = resumen?.supervision
  const sinDatos = !cargandoResumen && !errorResumen && (kpis?.totalMunicipalidades ?? 0) === 0 && selectedDepto === 'Todas'
  const valor = (n?: number | null) => (cargandoResumen && !resumen ? '…' : fmtNum(n))

  // Exportar Excel
  const handleExportExcel = async (type: 'Directorio' | 'Consolidado_DSLD') => {
    const fileName = `DSLD_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
    const wb = XLSX.utils.book_new()
    setExportando(true)
    try {
      if (type === 'Directorio') {
        const extra: Record<string, string | number> = { limit: 2000, offset: 0 }
        if (ESTADO_FILTRO_API[estadoAcreditacion]) extra.estadoAcreditacion = ESTADO_FILTRO_API[estadoAcreditacion]
        if (busquedaAplicada) extra.busqueda = busquedaAplicada
        const d = await obtenerJson<{ total: number; items: DemunaItem[] }>(
          `/api/gestion-datos/dsld/demunas?${parametrosFiltro(extra).toString()}`
        )
        const filas = d.items.map(x => ({
          'Código': x.codigo,
          'DEMUNA': x.nombre,
          'Ubigeo': x.ubigeo,
          'Departamento': x.departamento,
          'Ámbito analítico': x.departamentoMod,
          'Provincia': x.provincia,
          'Distrito': x.distrito,
          'Tipo de gobierno': x.tipoGobierno,
          'Estado': x.estado,
          'Fecha de acreditación': x.fechaAcreditacion ?? '',
          'Resolución de acreditación': x.resolucionAcreditacion ?? '',
          'Última supervisión': x.ultimaSupervision ?? '',
          'Población NNA': x.poblacionNna ?? '',
          'Dirección': x.direccion ?? '',
          'Teléfono': x.telefono ?? '',
          'Teléfono 2': x.telefono2 ?? '',
          'Correo': x.email ?? '',
          'Horario': x.horario ?? '',
        }))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Directorio')
      } else {
        const anios = supDeptos?.anios ?? []
        const supMap = new Map((supDeptos?.departamentos ?? []).map(r => [String(r.departamento), r]))
        const filas = (resumen?.rankingDepartamental ?? []).map(r => {
          const fila: Record<string, string | number> = {
            'Departamento (ámbito analítico)': r.departamento,
            'Total municipalidades': r.total,
            'Acreditadas': r.acreditadas,
            'No acreditadas': r.noAcreditadas,
            'No operativas': r.noOperativas,
            'Operativas': r.operativas,
            '% Acreditación': r.pctAcreditacion,
            'Provinciales': r.provinciales,
            'Distritales': r.distritales,
            'DEMUNA con alguna supervisión': r.supervisadas,
          }
          anios.forEach(a => { fila[`Supervisiones ${a}`] = Number(supMap.get(r.departamento)?.[String(a)] ?? 0) })
          return fila
        })
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Consolidado DEMUNA')
        const meta = [
          { Campo: 'Fuente', Valor: 'Oracle · DNA.mdb (DSLD)' },
          { Campo: 'Última carga', Valor: fmtFechaHora(resumen?.ultimaCarga?.fechaFin) },
          { Campo: 'Archivo', Valor: resumen?.ultimaCarga?.archivo ?? '' },
          { Campo: 'Corte de acreditación', Valor: resumen?.acreditacion.ultimaFecha ?? '' },
          { Campo: 'Corte de supervisión', Valor: resumen?.supervision.ultimaFecha ?? '' },
          { Campo: 'Filtro', Valor: 'Nacional (ranking por departamento)' },
          { Campo: 'Generado', Valor: new Date().toLocaleString('es-PE') },
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), 'Metadatos')
      }
      XLSX.writeFile(wb, fileName)
    } catch (e: unknown) {
      window.alert(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    } finally {
      setExportando(false)
    }
  }

  const handleExportModoNinez = async () => {
    setExportando(true)
    try {
      const d = await obtenerJson<{ total: number; items: ModoNinezGobierno[] }>(
        `/api/gestion-datos/dsld/modo-ninez/gobiernos?${parametrosModoNinez({ limit: 2000, offset: 0 }).toString()}`
      )
      const wb = XLSX.utils.book_new()
      const filas = d.items.map(g => ({
        'Ubigeo': g.ubigeo,
        'Gobierno': g.gobierno,
        'Nivel': g.nivel,
        'Macrorregión': g.macroregion ?? '',
        'Departamento (ámbito analítico)': g.departamento ?? '',
        'Provincia': g.provincia ?? '',
        'Distrito': g.distrito ?? '',
        'Año que se sumó': g.anioAdhesion ?? '',
        'Fecha de presentación': g.fechaPresentacion ?? '',
        'Fecha de acta de compromiso': g.fechaActa ?? '',
        'Código DEMUNA': g.codigoDemuna ?? '',
        'Estado DEMUNA': g.estadoDemuna ?? '',
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Modo Niñez')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mnDeptos.map(x => ({
        'Departamento (ámbito analítico)': x.departamento,
        'Total': x.total,
        'Regional': x.regional,
        'Provincial': x.provincial,
        'Distrital': x.distrital,
        'Presentaron reporte': x.presentaron,
      }))), 'Por departamento')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Campo: 'Fuente', Valor: mn?.ultimaCarga?.archivo ?? '' },
        { Campo: 'Última carga', Valor: fmtFechaHora(mn?.ultimaCarga?.fechaFin) },
        { Campo: 'Departamento', Valor: selectedDepto },
        { Campo: 'Provincia', Valor: selectedProv },
        { Campo: 'Nivel', Valor: mnNivel || 'Todos' },
        { Campo: 'Reporte', Valor: mnPresento === 'true' ? 'Presentaron' : mnPresento === 'false' ? 'Aún no presentan' : 'Todos' },
        { Campo: 'Búsqueda', Valor: mnBusquedaAplicada },
        { Campo: 'Generado', Valor: new Date().toLocaleString('es-PE') },
      ]), 'Metadatos')
      XLSX.writeFile(wb, `DSLD_ModoNinez_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: unknown) {
      window.alert(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    } finally {
      setExportando(false)
    }
  }

  const handleExportCconna = async () => {
    setExportando(true)
    try {
      const d = await obtenerJson<{ total: number; items: CconnaItem[] }>(
        `/api/gestion-datos/dsld/cconna/consejos?${parametrosCconna({ limit: 2000, offset: 0 }).toString()}`
      )
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.items.map(x => ({
        'Ubigeo': x.ubigeo,
        'CCONNA': x.nombre,
        'Nivel': x.nivel,
        'Departamento (ámbito analítico)': x.departamento ?? '',
        'Provincia': x.provincia ?? '',
        'Distrito': x.distrito ?? '',
        'Año de conformación': x.anioConformacion ?? '',
        'Nº de ordenanza': x.numeroOrdenanza ?? '',
        'Fecha de ordenanza': x.fechaOrdenanza ?? '',
        'Fecha de acta': x.fechaActa ?? '',
        'Fecha del plan de trabajo': x.fechaPlan ?? '',
        'Base nominal': x.baseNominal ?? '',
        'Registro MIMP': x.registroMimp ?? '',
        'Oficio DSLD': x.oficioDsld ?? '',
        'Fecha de registro': x.fechaRegistro ?? '',
      }))), 'CCONNA')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cconnaDeptos.map(x => ({
        'Departamento (ámbito analítico)': x.departamento, 'Total': x.total, 'Distrital': x.distrital,
        'Provincial': x.provincial, 'Regional': x.regional, 'Registrados MIMP': x.registradosMimp,
        'Integrantes NNA': x.integrantes,
      }))), 'Por departamento')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Campo: 'Fuente', Valor: cconna?.ultimaCarga?.archivo ?? '' },
        { Campo: 'Última carga', Valor: fmtFechaHora(cconna?.ultimaCarga?.fechaFin) },
        { Campo: 'Integrantes NNA', Valor: cconna?.totalNnaIntegrantes ?? '' },
        { Campo: 'Nota', Valor: 'Las niñas, niños y adolescentes se guardan solo como conteos' },
        { Campo: 'Generado', Valor: new Date().toLocaleString('es-PE') },
      ]), 'Metadatos')
      XLSX.writeFile(wb, `DSLD_CCONNA_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: unknown) {
      window.alert(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    } finally {
      setExportando(false)
    }
  }

  const handleExportCapacitacion = () => {
    try {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(capaDeptos.map(d => ({
        'Departamento (ámbito analítico)': d.departamento,
        'Participaciones aprobadas': d.participaciones,
        'Registros con DNI': d.personas,
        'Personas distintas': d.personasDistintas,
        'Virtual': d.virtual,
        'Presencial': d.presencial,
        'DEMUNA capacitadas': d.demunas,
        'DEMUNA del padrón': d.totalDemunas,
        '% DEMUNA': d.pctDemunas ?? '',
      }))), 'Por departamento')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((capa?.porAnio ?? []).map(a => ({
        'Año': a.anio, 'Participaciones': a.participaciones, 'Personas distintas': a.personasDistintas,
        'Virtual': a.virtual, 'Presencial': a.presencial, 'DEMUNA': a.demunas,
      }))), 'Por año')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((capa?.porCurso ?? []).map(c => ({
        'Curso': c.curso, 'Siglas': c.siglas ?? '', 'Participaciones': c.participaciones,
        'Personas distintas': c.personasDistintas, 'Virtual': c.virtual, 'Presencial': c.presencial,
      }))), 'Por curso')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Campo: 'Fuente', Valor: capa?.ultimaCarga?.archivo ?? '' },
        { Campo: 'Última carga', Valor: fmtFechaHora(capa?.ultimaCarga?.fechaFin) },
        { Campo: 'Último curso', Valor: capa?.ultimaActualizacion ?? '' },
        { Campo: 'Filtro', Valor: 'Solo participaciones aprobadas' },
        { Campo: 'Nota', Valor: 'El DNI no se almacena; las personas se cuentan con un código irreversible' },
        { Campo: 'Generado', Valor: new Date().toLocaleString('es-PE') },
      ]), 'Metadatos')
      XLSX.writeFile(wb, `DSLD_Capacitacion_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: unknown) {
      window.alert(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    }
  }

  const handleExportPias = () => {
    try {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(piasDistritos.map(d => ({
        'Ubigeo': d.ubigeo,
        'Departamento (ámbito analítico)': d.departamento ?? '',
        'Provincia': d.provincia ?? '',
        'Distrito': d.distrito ?? '',
        'Cuenca': d.cuenca,
        'Personas atendidas': d.total,
        'NNA': d.nna,
        'Madres/padres': d.padres,
        'Autoridades': d.autoridades,
        'Mujeres': d.mujeres,
        'Hombres': d.hombres,
        'Comunidades': d.comunidades,
        'Última atención': d.ultimaFecha ?? '',
      }))), 'PIAS por distrito')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((pias?.porCuenca ?? []).map(c => ({
        'Cuenca': c.cuenca, 'Personas atendidas': c.total, 'NNA': c.nna, 'Madres/padres': c.padres, 'Autoridades': c.autoridades,
      }))), 'Por cuenca')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Campo: 'Fuente', Valor: pias?.ultimaCarga?.archivo ?? '' },
        { Campo: 'Última carga', Valor: fmtFechaHora(pias?.ultimaCarga?.fechaFin) },
        { Campo: 'Última atención', Valor: pias?.ultimaActualizacion ?? '' },
        { Campo: 'Departamento', Valor: selectedDepto },
        { Campo: 'Provincia', Valor: selectedProv },
        { Campo: 'Nota', Valor: 'Conteos sin datos personales' },
        { Campo: 'Generado', Valor: new Date().toLocaleString('es-PE') },
      ]), 'Metadatos')
      XLSX.writeFile(wb, `DSLD_PIAS_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: unknown) {
      window.alert(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`)
    }
  }

  // Sincronizar Fila Individual desde Ruta Asignada
  const handleSincronizarRuta = async (origen: OrigenDato, enLote = false): Promise<SyncResult> => {
    if (!enLote) setSyncLoadingId(origen.id)
    setSyncFeedback(null)
    setOrigenesList(prev => prev.map(item => item.id === origen.id ? { ...item, estado: 'Sincronizando' } : item))

    try {
      const res = await fetch('/api/gestion-datos/dsld/sincronizar-ruta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origenId: origen.id, ruta: origen.ruta }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        const soloVerificado = data.modo === 'verificado'
        setOrigenesList(prev =>
          prev.map(item =>
            item.id === origen.id
              ? {
                  ...item,
                  ultimaSinc: soloVerificado ? item.ultimaSinc : new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                  estado: soloVerificado ? 'Pendiente' : 'Sincronizado',
                  registros: data.registrosProcesados || item.registros,
                }
              : item
          )
        )
        if (!soloVerificado && ORIGENES_MIGRADOS.has(origen.id)) setRecarga(r => r + 1)
        const mensaje = data.mensaje || (soloVerificado ? `Ruta verificada, sin datos procesados: '${origen.ruta}'.` : `Sincronización completada desde '${origen.ruta}'.`)
        if (!enLote) setSyncFeedback({ id: origen.id, tipo: soloVerificado ? 'info' : 'success', mensaje })
        return { ok: !soloVerificado, verificado: soloVerificado, mensaje }
      } else {
        throw new Error(mensajeDeError(data, 'Error al sincronizar ruta.'))
      }
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo sincronizar la ruta.'
      setOrigenesList(prev => prev.map(item => item.id === origen.id ? { ...item, estado: 'Error' } : item))
      if (!enLote) setSyncFeedback({ id: origen.id, tipo: 'error', mensaje: `Error al sincronizar: ${mensaje}` })
      return { ok: false, verificado: false, mensaje }
    } finally {
      if (!enLote) setSyncLoadingId(null)
    }
  }

  // Carga Manual de Archivo para una Fila Específica
  const handleCargarArchivoFila = async (origenId: string, file: File) => {
    if (!window.confirm(`La carga de "${file.name}" reemplazará los datos actuales de este origen. ¿Deseas continuar?`)) return
    setSyncLoadingId(origenId)
    setSyncFeedback(null)
    setOrigenesList(prev => prev.map(item => item.id === origenId ? { ...item, estado: 'Sincronizando' } : item))

    const formData = new FormData()
    formData.append('archivo', file)
    formData.append('tipoEje', origenId)

    try {
      const res = await fetch('/api/gestion-datos/dsld/importar', {
        method: 'POST',
        body: formData,
      })
      const text = await res.text()
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = { detail: text || `Error HTTP ${res.status}` }
      }

      if (res.ok) {
        if (ORIGENES_MIGRADOS.has(origenId)) setRecarga(r => r + 1)
        setOrigenesList(prev =>
          prev.map(item =>
            item.id === origenId
              ? {
                  ...item,
                  ultimaSinc: new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                  estado: 'Sincronizado',
                  registros: data.registrosProcesados || item.registros,
                }
              : item
          )
        )
        setSyncFeedback({
          id: origenId,
          tipo: 'success',
          mensaje: data.mensaje || `Archivo procesado y limpiado con éxito en Python.`,
        })
      } else {
        throw new Error(mensajeDeError(data, `Error en la importación (HTTP ${res.status}).`))
      }
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido.'
      setOrigenesList(prev => prev.map(item => item.id === origenId ? { ...item, estado: 'Error' } : item))
      setSyncFeedback({
        id: origenId,
        tipo: 'error',
        mensaje: `Error procesando archivo: ${mensaje}`,
      })
    } finally {
      setSyncLoadingId(null)
    }
  }

  // Sincronizar Todos los Orígenes (1-Clic)
  const handleSincronizarTodo = async () => {
    if (!window.confirm('Se sincronizarán todos los orígenes configurados. ¿Deseas continuar?')) return
    setSyncLoadingId('ALL')
    setSyncFeedback(null)

    const resultados: SyncResult[] = []
    for (const origen of origenesList) {
      resultados.push(await handleSincronizarRuta(origen, true))
    }
    setSyncLoadingId(null)
    const exitosos = resultados.filter(resultado => resultado.ok).length
    const verificados = resultados.filter(resultado => resultado.verificado).length
    const errores = resultados.length - exitosos - verificados
    setSyncFeedback({
      id: 'ALL',
      tipo: errores > 0 ? 'error' : verificados > 0 ? 'info' : 'success',
      mensaje: `Resultado: ${exitosos} sincronizado(s), ${verificados} ruta(s) verificada(s) sin datos procesados y ${errores} error(es).`,
    })
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 md:p-6 space-y-5">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER INSTITUCIONAL & GESTOR DE RUTAS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <div className="bg-[#D91B24] text-white font-black px-2.5 py-1 rounded-md text-xs tracking-wider shadow-sm">
              PERÚ
            </div>
            <div className="text-[11px] leading-tight font-medium text-slate-700 max-w-[130px]">
              Ministerio de la Mujer y Poblaciones Vulnerables
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#D91B24] border border-red-200">
                DSLD · Dirección de Sistemas Locales y Defensorías
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Suite Analítica y Situación <span className="text-[#D91B24]">DSLD</span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {resumen?.ultimaCarga
                ? <>Fuente: DNA.mdb · última carga {fmtFechaHora(resumen.ultimaCarga.fechaFin)} · acreditaciones al {fmtFecha(resumen.acreditacion.ultimaFecha)} · supervisiones al {fmtFecha(resumen.supervision.ultimaFecha)}</>
                : 'Fuente: DNA.mdb (sin cargas registradas)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            onClick={() => handleExportExcel('Consolidado_DSLD')}
            disabled={exportando || !resumen || (kpis?.totalMunicipalidades ?? 0) === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
          >
            {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar Consolidado
          </button>

          <button
            onClick={() => setOrigenesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            <FolderSync className="w-3.5 h-3.5 text-red-400" /> Sincronizar Orígenes & Rutas
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. NAVEGACIÓN INDEPENDIENTE POR PESTAÑAS (7 EJES)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('demuna')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'demuna'
              ? 'bg-[#D91B24] text-white shadow-md shadow-red-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Situación de las DEMUNA</span>
        </button>

        <button
          onClick={() => setActiveTab('supervision')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'supervision'
              ? 'bg-red-700 text-white shadow-md shadow-red-700/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Supervisión DEMUNA</span>
        </button>

        <button
          onClick={() => setActiveTab('capacitacion')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'capacitacion'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Capacitación a Defensores</span>
        </button>

        <button
          onClick={() => setActiveTab('cconna')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'cconna'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>CCONNA</span>
        </button>

        <button
          onClick={() => setActiveTab('modo_ninez')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'modo_ninez'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>Ponte en Modo Niñez</span>
        </button>

        <button
          onClick={() => setActiveTab('pias')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'pias'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>PIAS (Cuencas)</span>
        </button>

        <button
          onClick={() => setActiveTab('directorio')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
            activeTab === 'directorio'
              ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Directorio & Padrón</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTENIDO INDIVIDUAL POR PESTAÑA
      ───────────────────────────────────────────────────────────── */}

      {errorResumen && (
        <div role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-medium flex items-center justify-between gap-3">
          <span>No se pudieron cargar los datos de la DSLD: {errorResumen}</span>
          <button onClick={() => setRecarga(r => r + 1)} className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shrink-0">
            Reintentar
          </button>
        </div>
      )}
      {sinDatos && (
        <div role="status" className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium flex items-center justify-between gap-3">
          <span>Aún no hay datos de DEMUNA en el sistema. Cargue la base <strong>DNA.mdb</strong> desde el gestor de orígenes.</span>
          <button onClick={() => setOrigenesModalOpen(true)} className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0">
            Cargar DNA.mdb
          </button>
        </div>
      )}

      {/* TAB 1: SITUACIÓN DE LAS DEMUNA */}
      {activeTab === 'demuna' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border-2 border-[#D91B24] p-3.5 shadow-sm flex items-center justify-between">
              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[#D91B24] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-700 uppercase">Total Gobiernos Locales</p>
                <p className="text-2xl font-black text-[#D91B24]">{valor(kpis?.totalMunicipalidades)}</p>
                <p className="text-[10px] font-bold text-slate-500">Pobl. NNA: {valor(kpis?.poblacionNna)}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-emerald-500 p-3.5 shadow-sm flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-700 uppercase">Acreditadas</p>
                <p className="text-2xl font-black text-emerald-600">{valor(kpis?.acreditadas)}</p>
                <p className="text-[10px] font-bold text-emerald-700">{kpis?.pctAcreditadas ?? 0}% del total</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-blue-500 p-3.5 shadow-sm flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-700 uppercase">No Acreditadas</p>
                <p className="text-2xl font-black text-blue-600">{valor(kpis?.noAcreditadas)}</p>
                <p className="text-[10px] font-bold text-blue-700">{kpis?.pctNoAcreditadas ?? 0}% del total</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-amber-500 p-3.5 shadow-sm flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-700 uppercase">No Operativas</p>
                <p className="text-2xl font-black text-amber-600">{valor(kpis?.noOperativas)}</p>
                <p className="text-[10px] font-bold text-amber-700">{kpis?.pctNoOperativas ?? 0}% del total</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                <Cog className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-700 uppercase">Operativas</p>
                <p className="text-2xl font-black text-purple-700">{valor(kpis?.operativas)}</p>
                <p className="text-[10px] font-bold text-purple-800">{kpis?.pctOperativas ?? 0}% (acreditadas + no acreditadas)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  Filtro Geográfico Territorial
                </h3>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">DEPARTAMENTO</label>
                    <select
                      value={selectedDepto}
                      onChange={e => {
                        setSelectedDepto(e.target.value)
                        setSelectedProv('Todas')
                      }}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    >
                      {deptosList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">PROVINCIA</label>
                    <select
                      value={selectedProv}
                      onChange={e => setSelectedProv(e.target.value)}
                      disabled={selectedDepto === 'Todas'}
                      title={selectedDepto === 'Todas' ? 'Seleccione primero un departamento' : undefined}
                      className="disabled:opacity-60 w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    >
                      {provList.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">ESTADO ACREDITACIÓN</label>
                    <select
                      value={estadoAcreditacion}
                      onChange={e => setEstadoAcreditacion(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="Todas">Todas</option>
                      <option value="Acreditadas">Acreditadas</option>
                      <option value="No Acreditadas">No Acreditadas</option>
                      <option value="No Operativas">No Operativas</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Lima se muestra como <strong>LIMA METROPOLITANA</strong> y <strong>GORE LIMA</strong>, igual que en el Power BI.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Tipología de Gobiernos</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-xl font-black text-slate-900">{valor(kpis?.distritales)}</p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Distritales</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-xl font-black text-[#D91B24]">{valor(kpis?.provinciales)}</p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Provinciales</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Estado de Acreditación por Departamento</h3>
                  <p className="text-xs text-slate-500">
                    Distribución de acreditadas, no acreditadas y no operativas{selectedProv !== 'Todas' ? ' (nivel departamento; las tarjetas sí aplican la provincia)' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Acreditadas
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> No Acreditadas
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> No Operativas
                  </span>
                </div>
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acreditacionPorDepto} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="depto" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                    />
                    <Bar dataKey="acreditada" name="Acreditada" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="noAcreditada" name="No Acreditada" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="noOperativa" name="No Operativa" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPERVISIÓN DE DEMUNA */}
      {activeTab === 'supervision' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...(sup?.porAnio ?? [])].reverse().map((a, idx) => (
              <div
                key={a.anio}
                className={`bg-white rounded-xl border-2 p-4 shadow-sm ${idx === 0 ? 'border-red-600' : idx === 1 ? 'border-blue-500' : 'border-slate-300'}`}
              >
                <p className={`text-xs font-bold uppercase ${idx === 0 ? 'text-red-700' : idx === 1 ? 'text-blue-700' : 'text-slate-600'}`}>
                  Supervisiones {a.anio}{idx === 0 ? ' (último año con datos)' : ''}
                </p>
                <p className={`text-3xl font-black mt-1 ${idx === 0 ? 'text-red-600' : idx === 1 ? 'text-blue-600' : 'text-slate-800'}`}>
                  {fmtNum(a.supervisiones)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {fmtNum(a.demunas)} DEMUNA · Virtual {fmtNum(a.virtual)} · Presencial {fmtNum(a.presencial)}
                </p>
              </div>
            ))}
            {!cargandoResumen && (sup?.porAnio.length ?? 0) === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
                No hay supervisiones registradas para el filtro seleccionado.
              </div>
            )}

            <div className="bg-white rounded-xl border-2 border-emerald-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase">DEMUNA supervisadas (alguna vez)</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{valor(sup?.demunasSupervisadas)}</p>
              <p className="text-[11px] font-bold text-emerald-700 mt-1">
                {sup?.pctCobertura ?? 0}% de cobertura · {fmtNum(sup?.demunasNoSupervisadas)} sin supervisión
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Comparativo al mismo corte</h3>
              <p className="text-sm font-bold text-slate-900">{textoVariacion(sup?.comparativoCorte)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Última supervisión registrada: {fmtFecha(sup?.ultimaFecha)}</p>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Antigüedad de la última supervisión por DEMUNA</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { k: 'SUPERVISADAS ESTE AÑO', c: 'bg-green-100 text-green-700 border-green-200' },
                  { k: 'SUPERVISADAS EL AÑO ANTERIOR', c: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { k: 'MÁS DE 1 AÑO SIN SUPERVISIÓN', c: 'bg-amber-100 text-amber-700 border-amber-200' },
                  { k: 'SIN SUPERVISIÓN', c: 'bg-red-100 text-red-700 border-red-200' },
                ].map(({ k, c }) => (
                  <div key={k} className={`rounded-lg border p-2 text-center ${c}`}>
                    <p className="text-lg font-black">{valor(sup?.periodoUltimaSupervision?.[k])}</p>
                    <p className="text-[9px] font-bold leading-tight">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evolución Comparativa de Supervisiones por Departamento</h3>
              <p className="text-xs text-slate-500">
                Supervisiones registradas por año (Fuente: Access DNA.mdb · tabla supervisadas){selectedProv !== 'Todas' ? ' · nivel departamento' : ''}
              </p>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supervisionPorDepto} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="departamento" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '11px' }} />
                  {aniosSupervision.map((a, i) => (
                    <Bar key={a} dataKey={a} name={a} fill={COLORES_ANIOS[i % COLORES_ANIOS.length]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAPACITACIÓN A DEFENSORES (Oracle · TB_CAPA_DEMUNA) */}
      {activeTab === 'capacitacion' && (
        <div className="space-y-4">
          {capa && !capa.ultimaCarga && !cargandoResumen && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Aún no se ha cargado el Excel de capacitación.</strong> Use “Sincronizar Orígenes &amp; Rutas”
                y cargue <em>CAPACITACION … NOMINAL.xlsx</em> (tabla TB_CAPA_DEMUNA).
              </span>
            </div>
          )}
          {capa?.ultimaCarga && (
            <p className="text-[11px] text-slate-500">
              Fuente: {capa.ultimaCarga.archivo.split(/[\\/]/).pop()} · última carga {fmtFechaHora(capa.ultimaCarga.fechaFin)}
              {capa.ultimaActualizacion ? <> · cursos hasta el {fmtFecha(capa.ultimaActualizacion)}</> : null}
              {' '}· solo participaciones aprobadas · el DNI no se almacena
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-emerald-600 p-4 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase">Participaciones aprobadas</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{valor(capa?.participaciones)}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {capa ? `${fmtNum(capa.personasDistintas)} personas distintas` : '—'}
              </p>
            </div>

            <div className="bg-white rounded-xl border-2 border-indigo-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-indigo-700 uppercase">Modalidad virtual</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">{valor(capa?.virtual)}</p>
              <p className="text-[11px] font-bold text-indigo-700 mt-1">{capa ? `${capa.pctVirtual}% del total` : '—'}</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-sky-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-sky-700 uppercase">Modalidad presencial</p>
              <p className="text-3xl font-black text-sky-600 mt-1">{valor(capa?.presencial)}</p>
              <p className="text-[11px] font-bold text-sky-700 mt-1">{capa ? `${capa.pctPresencial}% del total` : '—'}</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-purple-700 uppercase">Tasa de aprobación</p>
              <p className="text-3xl font-black text-purple-600 mt-1">{capa ? `${capa.tasaAprobacion}%` : '…'}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {capa ? `${fmtNum(capa.desaprobados)} desaprobados` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {capa && ([
              ['DEMUNA capacitadas', capa.cobertura.demunas, capa.cobertura.totalDemunas, capa.cobertura.pctDemunas],
              ['Distritos', capa.cobertura.distritos, capa.cobertura.totalDistritos, capa.cobertura.pctDistritos],
              ['Provincias', capa.cobertura.provincias, capa.cobertura.totalProvincias, capa.cobertura.pctProvincias],
              ['Departamentos', capa.cobertura.departamentos, capa.cobertura.totalDepartamentos, capa.cobertura.pctDepartamentos],
            ] as const).map(([titulo, n, total, pct]) => (
              <div key={titulo} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-600 uppercase">{titulo}</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{fmtNum(n)} <span className="text-xs font-bold text-slate-400">/ {fmtNum(total)}</span></p>
                <div className="h-1.5 rounded-full bg-slate-100 mt-1.5">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] font-bold text-emerald-700 mt-1">{pct}% de cobertura</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Participaciones por año y modalidad</h3>
              <p className="text-xs text-slate-500 mb-4">
                Según el año de inicio del curso
                {capa?.comparativoCorte ? ` · ${textoVariacion(capa.comparativoCorte)}` : ''}
              </p>
              <div className="h-[300px] w-full">
                {capa && capa.porAnio.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capa.porAnio} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} formatter={(v, n) => [fmtNum(Number(v)), n]} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="virtual" name="Virtual" stackId="c" fill="#6366F1" />
                      <Bar dataKey="presencial" name="Presencial" stackId="c" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Cursos dictados</h3>
              <p className="text-xs text-slate-500 mb-3">Participaciones aprobadas por curso</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(capa?.porCurso ?? []).map(c => (
                  <div key={c.curso} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="font-bold text-slate-800 text-xs">{c.curso}{c.siglas ? ` (${c.siglas})` : ''}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {fmtNum(c.participaciones)} participaciones ·{' '}
                      {capa && capa.participaciones ? ((c.participaciones / capa.participaciones) * 100).toFixed(1) : '0'}% ·{' '}
                      {fmtNum(c.personasDistintas)} personas
                    </p>
                  </div>
                ))}
                {capa && capa.porCurso.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Capacitación por departamento</h3>
                <p className="text-xs text-slate-500">
                  {fmtNum(capaDeptos.length)} departamentos
                  {capa ? ` · ${fmtNum(capa.mujeres)} mujeres (${capa.pctMujeres}%) y ${fmtNum(capa.hombres)} hombres (${capa.pctHombres}%)` : ''}
                </p>
              </div>
              <button
                onClick={handleExportCapacitacion}
                disabled={exportando || capaDeptos.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold self-start"
              >
                {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar
              </button>
            </div>
            {capaError && <p className="p-3 text-xs text-red-700 bg-red-50">{capaError}</p>}
            <div className="h-[320px] w-full p-4">
              {capaDeptos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capaDeptos} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="departamento" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} formatter={(v, n) => [fmtNum(Number(v)), n]} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="virtual" name="Virtual" stackId="d" fill="#6366F1" />
                    <Bar dataKey="presencial" name="Presencial" stackId="d" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
              )}
            </div>
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto border-t border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Departamento</th>
                    <th className="px-3 py-2 text-right">Participaciones</th>
                    <th className="px-3 py-2 text-right">Personas</th>
                    <th className="px-3 py-2 text-right">Virtual</th>
                    <th className="px-3 py-2 text-right">Presencial</th>
                    <th className="px-3 py-2 text-right">DEMUNA capacitadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {capaDeptos.map(d => (
                    <tr key={d.departamento} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">{d.departamento}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmtNum(d.participaciones)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.personasDistintas)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.virtual)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.presencial)}</td>
                      <td className="px-3 py-2 text-right">
                        {fmtNum(d.demunas)}{d.totalDemunas ? ` / ${fmtNum(d.totalDemunas)}` : ''}
                        {d.pctDemunas != null && <span className="text-[10px] text-slate-400 ml-1">{d.pctDemunas}%</span>}
                      </td>
                    </tr>
                  ))}
                  {capaDeptos.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CCONNA (Oracle · CCONNA nominal) */}
      {activeTab === 'cconna' && (
        <div className="space-y-4">
          {cconna && !cconna.ultimaCarga && !cargandoResumen && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Aún no se ha cargado el Excel de CCONNA.</strong> Use “Sincronizar Orígenes &amp; Rutas” y
                cargue <em>CCONNA nominal …xlsx</em> (hojas “BD ORGANIZACIONAL” y “BD NOMINAL”).
              </span>
            </div>
          )}
          {cconna?.ultimaCarga && (
            <p className="text-[11px] text-slate-500">
              Fuente: {cconna.ultimaCarga.archivo.split(/[\\/]/).pop()} · última carga {fmtFechaHora(cconna.ultimaCarga.fechaFin)}
              {cconna.ultimoRegistro ? <> · último registro MIMP {fmtFecha(cconna.ultimoRegistro)}</> : null}
              {' '}· las niñas, niños y adolescentes se guardan solo como conteos
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-indigo-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">CCONNA conformados</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">{valor(cconna?.totalConformados)}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {cconna ? `${cconna.distritales} distritales · ${cconna.provinciales} provinciales · ${cconna.regionales} regionales` : '—'}
              </p>
            </div>

            <div className="bg-white rounded-xl border-2 border-emerald-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">Integrantes NNA</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{valor(cconna?.totalNnaIntegrantes)}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {cconna ? `${fmtNum(cconna.exIntegrantes)} ex integrantes registrados` : '—'}
              </p>
            </div>

            <div className="bg-white rounded-xl border-2 border-pink-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">Niñas y adolescentes mujeres</p>
              <p className="text-3xl font-black text-pink-600 mt-1">{valor(cconna?.mujeres)}</p>
              <p className="text-[11px] font-bold text-pink-600 mt-1">{cconna ? `${cconna.pctMujeres}% del total` : '—'}</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-blue-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">Niños y adolescentes hombres</p>
              <p className="text-3xl font-black text-blue-600 mt-1">{valor(cconna?.hombres)}</p>
              <p className="text-[11px] font-bold text-blue-600 mt-1">{cconna ? `${cconna.pctHombres}% del total` : '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cconna && ([
              ['Distritos con CCONNA', cconna.cobertura.distritos, cconna.cobertura.totalDistritos, cconna.cobertura.pctDistritos],
              ['Provincias con CCONNA', cconna.cobertura.provincias, cconna.cobertura.totalProvincias, cconna.cobertura.pctProvincias],
              ['Departamentos con CCONNA', cconna.cobertura.departamentos, cconna.cobertura.totalDepartamentos, cconna.cobertura.pctDepartamentos],
              ['Registrados en el MIMP', cconna.registradosMimp, cconna.totalConformados, cconna.pctRegistrados],
            ] as const).map(([titulo, n, total, pct]) => (
              <div key={titulo} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <p className="text-[11px] font-bold text-slate-600 uppercase">{titulo}</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{fmtNum(n)} <span className="text-xs font-bold text-slate-400">/ {fmtNum(total)}</span></p>
                <div className="h-1.5 rounded-full bg-slate-100 mt-1.5">
                  <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] font-bold text-indigo-700 mt-1">{pct}%</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">CCONNA conformados por año</h3>
              <p className="text-xs text-slate-500 mb-4">Según el acta de conformación o, si no la tiene, la ordenanza</p>
              <div className="h-[280px] w-full">
                {cconna && cconna.porAnio.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cconna.porAnio} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(v, n) => [fmtNum(Number(v)), n]}
                        labelFormatter={(a, p) => {
                          const f = p?.[0]?.payload as { acumulado: number } | undefined
                          return f ? `${a} · acumulado ${fmtNum(f.acumulado)}` : String(a)
                        }}
                      />
                      <Bar dataKey="total" name="Conformados" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Documentación registrada</h3>
              <p className="text-xs text-slate-500 mb-3">De los {fmtNum(cconna?.totalConformados)} CCONNA conformados</p>
              <div className="space-y-2.5">
                {cconna && ([
                  ['Con ordenanza', cconna.documentos.conOrdenanza],
                  ['Con resolución', cconna.documentos.conResolucion],
                  ['Con acta de conformación', cconna.documentos.conActa],
                  ['Con plan de trabajo', cconna.documentos.conPlan],
                  ['Con base nominal de NNA', cconna.documentos.conBaseNominal],
                ] as const).map(([titulo, n]) => (
                  <div key={titulo}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{titulo}</span>
                      <span>{fmtNum(n)} <span className="text-slate-400">({cconna.totalConformados ? ((n / cconna.totalConformados) * 100).toFixed(0) : 0}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 mt-1">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${cconna.totalConformados ? (n / cconna.totalConformados) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {cconna && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 mb-2">Participación de NNA por nivel</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(cconna.integrantesPorNivel).map(([nivel, n]) => (
                      <span key={nivel} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#64748B]">
                        {nivel.charAt(0) + nivel.slice(1).toLowerCase()}: {fmtNum(n)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">CCONNA por departamento</h3>
            <p className="text-xs text-slate-500 mb-4">Lima se separa en Lima Metropolitana y GORE Lima</p>
            <div className="h-[320px] w-full">
              {cconnaDeptos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cconnaDeptos} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="departamento" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} formatter={(v, n) => [fmtNum(Number(v)), n]} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="regional" name="Regional" stackId="c" fill="#4338CA" />
                    <Bar dataKey="provincial" name="Provincial" stackId="c" fill="#6366F1" />
                    <Bar dataKey="distrital" name="Distrital" stackId="c" fill="#A5B4FC" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Consejos conformados</h3>
                <p className="text-xs text-slate-500">{fmtNum(cconnaTotal)} registros con los filtros actuales</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={cconnaBusqueda}
                    onChange={e => setCconnaBusqueda(e.target.value)}
                    placeholder="Buscar CCONNA o ubigeo…"
                    aria-label="Buscar CCONNA"
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-52"
                  />
                </div>
                <select value={cconnaNivel} onChange={e => setCconnaNivel(e.target.value)} aria-label="Nivel del CCONNA" className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs">
                  <option value="">Todos los niveles</option>
                  <option value="DISTRITAL">Distrital</option>
                  <option value="PROVINCIAL">Provincial</option>
                  <option value="REGIONAL">Regional</option>
                </select>
                <select value={cconnaRegistro} onChange={e => setCconnaRegistro(e.target.value)} aria-label="Registro MIMP" className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs">
                  <option value="">Registro MIMP: todos</option>
                  <option value="SI">Registrados</option>
                  <option value="NO">No registrados</option>
                  <option value="OBSERVADO">Observados</option>
                </select>
                <button
                  onClick={handleExportCconna}
                  disabled={exportando || cconnaTotal === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
                >
                  {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar
                </button>
              </div>
            </div>
            {cconnaError && <p className="p-3 text-xs text-red-700 bg-red-50">{cconnaError}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-left">CCONNA</th>
                    <th className="px-3 py-2 text-left">Nivel</th>
                    <th className="px-3 py-2 text-left">Departamento</th>
                    <th className="px-3 py-2 text-left">Provincia / Distrito</th>
                    <th className="px-3 py-2 text-center">Año</th>
                    <th className="px-3 py-2 text-center">Acta</th>
                    <th className="px-3 py-2 text-center">Plan</th>
                    <th className="px-3 py-2 text-center">Registro MIMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cconnaCargando && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Cargando…</td></tr>
                  )}
                  {!cconnaCargando && cconnaItems.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Sin CCONNA con estos filtros</td></tr>
                  )}
                  {!cconnaCargando && cconnaItems.map(x => (
                    <tr key={x.ubigeo} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{x.nombre}</p>
                        <p className="text-[10px] text-slate-400">Ubigeo {x.ubigeo}{x.numeroOrdenanza ? ` · ${x.numeroOrdenanza}` : ''}</p>
                      </td>
                      <td className="px-3 py-2">{x.nivel.charAt(0) + x.nivel.slice(1).toLowerCase()}</td>
                      <td className="px-3 py-2">{x.departamento ?? '—'}</td>
                      <td className="px-3 py-2">{[x.provincia, x.distrito].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="px-3 py-2 text-center">{x.anioConformacion ?? '—'}</td>
                      <td className="px-3 py-2 text-center">{fmtFecha(x.fechaActa)}</td>
                      <td className="px-3 py-2 text-center">{fmtFecha(x.fechaPlan)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          x.registroMimp === 'SI' ? 'bg-[#DCFCE7] text-[#16A34A]'
                            : x.registroMimp === 'OBSERVADO' ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}>
                          {x.registroMimp === 'SI' ? 'Registrado' : x.registroMimp === 'OBSERVADO' ? 'Observado' : 'No registrado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cconnaTotal > DIR_POR_PAGINA && (
              <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  {fmtNum(cconnaPagina * DIR_POR_PAGINA + 1)}–{fmtNum(Math.min((cconnaPagina + 1) * DIR_POR_PAGINA, cconnaTotal))} de {fmtNum(cconnaTotal)}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setCconnaPagina(p => Math.max(0, p - 1))} disabled={cconnaPagina === 0} aria-label="Página anterior CCONNA" className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setCconnaPagina(p => p + 1)} disabled={(cconnaPagina + 1) * DIR_POR_PAGINA >= cconnaTotal} aria-label="Página siguiente CCONNA" className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PONTE EN MODO NIÑEZ (Oracle · MATRIZ DE REPORTE PBI) */}
      {activeTab === 'modo_ninez' && (
        <div className="space-y-4">
          {mn && !mn.ultimaCarga && !cargandoResumen && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Aún no se ha cargado la matriz de Modo Niñez.</strong> Use “Sincronizar Orígenes &amp; Rutas” y cargue
                el Excel <em>MATRIZ DE REPORTE PBI</em> (tabla TB_MODO_NINEZ_2026).
              </span>
            </div>
          )}
          {mn?.ultimaCarga && (
            <p className="text-[11px] text-slate-500">
              Fuente: {mn.ultimaCarga.archivo.split(/[\\/]/).pop()} · última carga {fmtFechaHora(mn.ultimaCarga.fechaFin)}
              {mn.ultimaPresentacion ? <> · reportes al {fmtFecha(mn.ultimaPresentacion)}</> : null}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border-2 border-amber-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">Gobiernos en Modo Niñez</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{valor(mn?.gobiernosAdheridos)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Acumulado desde 2019</p>
            </div>
            {([
              ['Gobiernos regionales', mn?.regionales, COLORES_NIVEL.REGIONAL],
              ['Gobiernos provinciales', mn?.provinciales, COLORES_NIVEL.PROVINCIAL],
              ['Gobiernos distritales', mn?.distritales, COLORES_NIVEL.DISTRITAL],
            ] as const).map(([titulo, n, color]) => (
              <div key={titulo} className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />{titulo}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{valor(n)}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {mn?.gobiernosAdheridos ? `${((Number(n ?? 0) / mn.gobiernosAdheridos) * 100).toFixed(1)}% del total` : '—'}
                </p>
              </div>
            ))}
            <div className="bg-white rounded-xl border-2 border-emerald-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">Presentaron reporte {mn?.anioPresentacion ?? ''}</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{valor(mn?.presentaronReporte)}</p>
              <p className="text-[11px] font-bold text-emerald-600 mt-1">
                {mn ? `${mn.pctPresentaron}% · R ${mn.presentaronPorNivel.regional} · P ${mn.presentaronPorNivel.provincial} · D ${mn.presentaronPorNivel.distrital}` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Gobiernos que se sumaron a la estrategia por año</h3>
              <p className="text-xs text-slate-500 mb-4">
                Según “Año que se sumó a la estrategia”
                {mn && mn.sinAnioAdhesion > 0 ? ` · ${mn.sinAnioAdhesion} gobierno(s) sin año registrado` : ''}
              </p>
              <div className="h-[260px] w-full">
                {mn && mn.porAnio.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mn.porAnio} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(v, nombre) => [fmtNum(Number(v)), nombre]}
                        labelFormatter={(a, p) => {
                          const f = p?.[0]?.payload as ModoNinezAnio | undefined
                          return f ? `${a} · ${fmtNum(f.total)} nuevos · acumulado ${fmtNum(f.acumulado)}` : String(a)
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="regional" name="Regional" stackId="n" fill={COLORES_NIVEL.REGIONAL} />
                      <Bar dataKey="provincial" name="Provincial" stackId="n" fill={COLORES_NIVEL.PROVINCIAL} />
                      <Bar dataKey="distrital" name="Distrital" stackId="n" fill={COLORES_NIVEL.DISTRITAL} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Por macrorregión</h3>
              <p className="text-xs text-slate-500 mb-3">Gobiernos en la estrategia</p>
              <div className="space-y-2.5">
                {(mn?.porMacroregion ?? []).map(m => (
                  <div key={m.macroregion}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{m.macroregion}</span><span>{fmtNum(m.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 mt-1">
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: `${mn?.gobiernosAdheridos ? (m.total / mn.gobiernosAdheridos) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                {mn && mn.porMacroregion.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
              </div>
              {mn && Object.keys(mn.porEstadoDemuna).length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 mb-2">Estado de la DEMUNA (provinciales y distritales)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(mn.porEstadoDemuna).map(([estado, n]) => (
                      <span key={estado} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTILO_ESTADO[estado] ?? 'bg-slate-100 text-slate-500'}`}>
                        {estado}: {fmtNum(n)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Gobiernos en Modo Niñez por departamento</h3>
            <p className="text-xs text-slate-500 mb-4">Lima se separa en Lima Metropolitana y GORE Lima, igual que el padrón DEMUNA</p>
            <div className="h-[320px] w-full">
              {mnDeptosFiltrados.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mnDeptosFiltrados} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="departamento" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="regional" name="Regional" stackId="n" fill={COLORES_NIVEL.REGIONAL} />
                    <Bar dataKey="provincial" name="Provincial" stackId="n" fill={COLORES_NIVEL.PROVINCIAL} />
                    <Bar dataKey="distrital" name="Distrital" stackId="n" fill={COLORES_NIVEL.DISTRITAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gobiernos en la estrategia</h3>
                <p className="text-xs text-slate-500">{fmtNum(mnTotal)} registros con los filtros actuales</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={mnBusqueda}
                    onChange={e => setMnBusqueda(e.target.value)}
                    placeholder="Buscar gobierno o ubigeo…"
                    aria-label="Buscar gobierno"
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-52"
                  />
                </div>
                <select value={mnNivel} onChange={e => setMnNivel(e.target.value)} aria-label="Nivel de gobierno" className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs">
                  <option value="">Todos los niveles</option>
                  <option value="REGIONAL">Regional</option>
                  <option value="PROVINCIAL">Provincial</option>
                  <option value="DISTRITAL">Distrital</option>
                </select>
                <select value={mnPresento} onChange={e => setMnPresento(e.target.value)} aria-label="Reporte presentado" className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs">
                  <option value="">Reporte: todos</option>
                  <option value="true">Presentaron</option>
                  <option value="false">Aún no presentan</option>
                </select>
                <button
                  onClick={handleExportModoNinez}
                  disabled={exportando || mnTotal === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
                >
                  {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar
                </button>
              </div>
            </div>
            {mnError && <p className="p-3 text-xs text-red-700 bg-red-50">{mnError}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-left">Gobierno</th>
                    <th className="px-3 py-2 text-left">Nivel</th>
                    <th className="px-3 py-2 text-left">Departamento</th>
                    <th className="px-3 py-2 text-left">Provincia</th>
                    <th className="px-3 py-2 text-center">Año adhesión</th>
                    <th className="px-3 py-2 text-center">Reporte</th>
                    <th className="px-3 py-2 text-center">Acta de compromiso</th>
                    <th className="px-3 py-2 text-left">DEMUNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mnCargando && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Cargando…</td></tr>
                  )}
                  {!mnCargando && mnItems.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Sin gobiernos con estos filtros</td></tr>
                  )}
                  {!mnCargando && mnItems.map(g => (
                    <tr key={g.ubigeo} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{g.gobierno}</p>
                        <p className="text-[10px] text-slate-400">Ubigeo {g.ubigeo}</p>
                      </td>
                      <td className="px-3 py-2">{g.nivel.charAt(0) + g.nivel.slice(1).toLowerCase()}</td>
                      <td className="px-3 py-2">{g.departamento ?? '—'}</td>
                      <td className="px-3 py-2">{g.provincia ?? '—'}</td>
                      <td className="px-3 py-2 text-center">{g.anioAdhesion ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {g.fechaPresentacion
                          ? <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] font-bold text-[10px]">{fmtFecha(g.fechaPresentacion)}</span>
                          : <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-bold text-[10px]">Pendiente</span>}
                      </td>
                      <td className="px-3 py-2 text-center">{fmtFecha(g.fechaActa)}</td>
                      <td className="px-3 py-2">
                        {g.estadoDemuna
                          ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTILO_ESTADO[g.estadoDemuna] ?? 'bg-slate-100 text-slate-500'}`}>{g.estadoDemuna}</span>
                          : <span className="text-slate-400">—</span>}
                        {g.codigoDemuna && <span className="text-[10px] text-slate-400 ml-1">{g.codigoDemuna}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mnTotal > DIR_POR_PAGINA && (
              <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  {fmtNum(mnPagina * DIR_POR_PAGINA + 1)}–{fmtNum(Math.min((mnPagina + 1) * DIR_POR_PAGINA, mnTotal))} de {fmtNum(mnTotal)}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setMnPagina(p => Math.max(0, p - 1))} disabled={mnPagina === 0} aria-label="Página anterior" className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setMnPagina(p => p + 1)} disabled={(mnPagina + 1) * DIR_POR_PAGINA >= mnTotal} aria-label="Página siguiente" className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PIAS (Oracle · PIAS_PBI_AUTORIDADES_PADRES) */}
      {activeTab === 'pias' && (
        <div className="space-y-4">
          {pias && !pias.ultimaCarga && !cargandoResumen && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Aún no se ha cargado el archivo PIAS.</strong> Use “Sincronizar Orígenes &amp; Rutas” y cargue
                <em> PIAS_PBI_AUTORIDADES_PADRES.xlsx</em>.
              </span>
            </div>
          )}
          {pias?.ultimaCarga && (
            <p className="text-[11px] text-slate-500">
              Fuente: {pias.ultimaCarga.archivo.split(/[\\/]/).pop()} · última carga {fmtFechaHora(pias.ultimaCarga.fechaFin)}
              {pias.ultimaActualizacion ? <> · atenciones del {fmtFecha(pias.primeraFecha)} al {fmtFecha(pias.ultimaActualizacion)}</> : null}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-sky-500 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">Personas atendidas</p>
              <p className="text-3xl font-black text-sky-600 mt-1">{valor(pias?.totalAtendidos)}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {pias ? `${fmtNum(pias.distritos)} distritos · ${fmtNum(pias.comunidades)} comunidades` : '—'}
              </p>
            </div>
            {([
              ['Niñas, niños y adolescentes', pias?.nna, pias?.pctNna, COLORES_PIAS.nna],
              ['Madres y padres', pias?.padres, pias?.pctPadres, COLORES_PIAS.padres],
              ['Autoridades y líderes', pias?.autoridades, pias?.pctAutoridades, COLORES_PIAS.autoridades],
            ] as const).map(([titulo, n, pct, color]) => (
              <div key={titulo} className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />{titulo}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{valor(n)}</p>
                <p className="text-[11px] font-bold mt-1" style={{ color }}>{pias ? `${pct}% del total` : '—'}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Personas atendidas por cuenca</h3>
              <p className="text-xs text-slate-500 mb-4">Plataforma o cuenca donde se realizó la atención</p>
              <div className="h-[300px] w-full">
                {pias && pias.porCuenca.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pias.porCuenca} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="cuenca" width={140} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} formatter={(v, n) => [fmtNum(Number(v)), n]} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="nna" name="NNA" stackId="p" fill={COLORES_PIAS.nna} />
                      <Bar dataKey="padres" name="Madres/padres" stackId="p" fill={COLORES_PIAS.padres} />
                      <Bar dataKey="autoridades" name="Autoridades" stackId="p" fill={COLORES_PIAS.autoridades} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Mujeres y hombres</h3>
              <p className="text-xs text-slate-500 mb-3">
                {pias ? `${fmtNum(pias.mujeres)} mujeres (${pias.pctMujeres}%) · ${fmtNum(pias.hombres)} hombres (${pias.pctHombres}%)` : '—'}
              </p>
              <div className="space-y-3">
                {pias && ([
                  ['NNA', pias.sexoPorTipo.nna],
                  ['Madres y padres', pias.sexoPorTipo.padres],
                  ['Autoridades', pias.sexoPorTipo.autoridades],
                ] as const).map(([titulo, s]) => {
                  const tot = s.mujeres + s.hombres + s.sinDato
                  return (
                    <div key={titulo}>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{titulo}</span><span>{fmtNum(tot)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 mt-1 flex overflow-hidden">
                        <div className="h-full bg-[#DB2777]" style={{ width: `${tot ? (s.mujeres / tot) * 100 : 0}%` }} />
                        <div className="h-full bg-[#2563EB]" style={{ width: `${tot ? (s.hombres / tot) * 100 : 0}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-0.5">
                        <span className="text-[#DB2777] font-bold">M {fmtNum(s.mujeres)}</span>
                        <span className="text-[#2563EB] font-bold">H {fmtNum(s.hombres)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {pias && Object.keys(pias.porModalidad).length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 mb-2">Modalidad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(pias.porModalidad).map(([m, n]) => (
                      <span key={m} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#64748B]">
                        {m.charAt(0) + m.slice(1).toLowerCase()}: {fmtNum(n)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Personas atendidas por mes</h3>
            <p className="text-xs text-slate-500 mb-4">Según el periodo de reporte</p>
            <div className="h-[240px] w-full">
              {pias && pias.porMes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={piasMeses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '11px' }} formatter={(v, n) => [fmtNum(Number(v)), n]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="nna" name="NNA" stackId="m" fill={COLORES_PIAS.nna} />
                    <Bar dataKey="padres" name="Madres/padres" stackId="m" fill={COLORES_PIAS.padres} />
                    <Bar dataKey="autoridades" name="Autoridades" stackId="m" fill={COLORES_PIAS.autoridades} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 h-full flex items-center justify-center">Sin datos</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Atenciones por distrito y cuenca</h3>
                <p className="text-xs text-slate-500">{fmtNum(piasDistritos.length)} distritos/cuencas con los filtros actuales · solo conteos</p>
              </div>
              <button
                onClick={handleExportPias}
                disabled={exportando || piasDistritos.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold self-start"
              >
                {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar
              </button>
            </div>
            {piasError && <p className="p-3 text-xs text-red-700 bg-red-50">{piasError}</p>}
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Distrito</th>
                    <th className="px-3 py-2 text-left">Provincia / Departamento</th>
                    <th className="px-3 py-2 text-left">Cuenca</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">NNA</th>
                    <th className="px-3 py-2 text-right">Madres/padres</th>
                    <th className="px-3 py-2 text-right">Autoridades</th>
                    <th className="px-3 py-2 text-right">M / H</th>
                    <th className="px-3 py-2 text-right">Comunidades</th>
                    <th className="px-3 py-2 text-center">Última atención</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {piasDistritos.length === 0 && (
                    <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">Sin atenciones con estos filtros</td></tr>
                  )}
                  {piasDistritos.map(d => (
                    <tr key={`${d.ubigeo}-${d.cuenca}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{d.distrito ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">Ubigeo {d.ubigeo}</p>
                      </td>
                      <td className="px-3 py-2">{d.provincia ?? '—'}<p className="text-[10px] text-slate-400">{d.departamento ?? ''}</p></td>
                      <td className="px-3 py-2">{d.cuenca}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmtNum(d.total)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.nna)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.padres)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.autoridades)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.mujeres)} / {fmtNum(d.hombres)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(d.comunidades)}</td>
                      <td className="px-3 py-2 text-center">{fmtFecha(d.ultimaFecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DIRECTORIO & PADRÓN OFICIAL */}
      {activeTab === 'directorio' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, distrito, provincia, código o ubigeo..."
                  value={searchDirectorio}
                  onChange={e => setSearchDirectorio(e.target.value)}
                  aria-label="Buscar DEMUNA"
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={selectedDepto}
                onChange={e => { setSelectedDepto(e.target.value); setSelectedProv('Todas') }}
                aria-label="Departamento"
                className="text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-2 py-2"
              >
                {deptosList.map(d => <option key={d} value={d}>{d === 'Todas' ? 'Todos los departamentos' : d}</option>)}
              </select>
              <select
                value={estadoAcreditacion}
                onChange={e => setEstadoAcreditacion(e.target.value)}
                aria-label="Estado"
                className="text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-2 py-2"
              >
                <option value="Todas">Todos los estados</option>
                <option value="Acreditadas">Acreditadas</option>
                <option value="No Acreditadas">No Acreditadas</option>
                <option value="No Operativas">No Operativas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {dirCargando ? 'Cargando…' : `${fmtNum(dirTotal)} DEMUNA`}
              </span>
              <button
                onClick={() => handleExportExcel('Directorio')}
                disabled={exportando || dirTotal === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar Excel
              </button>
            </div>
          </div>

          {dirError && (
            <div role="alert" className="m-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs">{dirError}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">DEMUNA</th>
                  <th className="py-3 px-3">Ubicación</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Última supervisión</th>
                  <th className="py-3 px-3">Contacto</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${dirCargando ? 'opacity-50' : ''}`}>
                {dirItems.map(d => (
                  <tr key={d.codigo} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 max-w-xs">
                      {d.nombreCorto || d.nombre}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Cód. {d.codigo}{d.resolucionAcreditacion ? ` · ${d.resolucionAcreditacion}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-800 font-bold">{d.departamentoMod}</span>
                      <div className="text-[10px] text-slate-400">{d.provincia} - {d.distrito} · {d.ubigeo}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {d.tipoGobierno}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          d.estadoCodigo === 'b'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : d.estadoCodigo === 'c'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {d.estado}
                      </span>
                      {d.fechaAcreditacion && (
                        <div className="text-[10px] text-slate-400 mt-0.5">desde {fmtFecha(d.fechaAcreditacion)}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {d.ultimaSupervision ? (
                        <span className="text-slate-700">{fmtFecha(d.ultimaSupervision)}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Sin supervisión</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {d.telefono && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" /> {d.telefono}
                        </div>
                      )}
                      {d.email && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 break-all">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {d.email}
                        </div>
                      )}
                      {!d.telefono && !d.email && <span className="text-[10px] text-slate-400">Sin datos de contacto</span>}
                    </td>
                  </tr>
                ))}
                {!dirCargando && dirItems.length === 0 && !dirError && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron DEMUNA con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {dirTotal > DIR_POR_PAGINA && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {fmtNum(dirPagina * DIR_POR_PAGINA + 1)}–{fmtNum(Math.min((dirPagina + 1) * DIR_POR_PAGINA, dirTotal))} de {fmtNum(dirTotal)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDirPagina(pg => Math.max(0, pg - 1))}
                  disabled={dirPagina === 0 || dirCargando}
                  aria-label="Página anterior"
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-700">
                  Página {dirPagina + 1} de {Math.ceil(dirTotal / DIR_POR_PAGINA)}
                </span>
                <button
                  onClick={() => setDirPagina(pg => pg + 1)}
                  disabled={(dirPagina + 1) * DIR_POR_PAGINA >= dirTotal || dirCargando}
                  aria-label="Página siguiente"
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#D91B24] rounded-xl px-6 py-2.5 text-white flex items-center justify-between shadow-md">
        <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-red-200" />
          <span>Sistema Integrado DGNNA</span>
        </div>
        <div className="text-xs font-bold tracking-tight">
          Dirección de Sistemas Locales y Defensorías (DSLD) · MIMP
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: GESTOR DE ORÍGENES DE DATOS Y SINCRONIZACIÓN POR FILA
      ───────────────────────────────────────────────────────────── */}
      {origenesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="origenes-modal-title" className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                  <FolderSync className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 id="origenes-modal-title" className="text-base font-bold">Gestor de Orígenes de Datos & Rutas DSLD</h3>
                  <p className="text-xs text-slate-400">
                    Sincronización directa y limpieza automatizada en Python por archivo o carpeta de red
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOrigenesModalOpen(false)}
                disabled={syncLoadingId !== null}
                aria-label="Cerrar gestor de orígenes"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{origenesList.length} fuentes de datos institucionales configuradas.</p>
                <p className="text-[11px] text-slate-500">
                  El Access <strong>DNA.mdb</strong> carga padrón de DEMUNA, supervisiones, ubigeo y población en un solo paso (use <strong>Cargar</strong>).
                </p>
              </div>

              <button
                onClick={handleSincronizarTodo}
                disabled={syncLoadingId !== null}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D91B24] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm shrink-0"
              >
                {syncLoadingId === 'ALL' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sincronizando todo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Sincronizar Todos los Orígenes (1-Clic)
                  </>
                )}
              </button>
            </div>

            {syncFeedback && (
              <div
                role={syncFeedback.tipo === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`mx-4 mt-3 p-3 rounded-xl border text-xs font-medium ${
                  syncFeedback.tipo === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : syncFeedback.tipo === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                {syncFeedback.mensaje}
              </div>
            )}

            <div className="p-4 overflow-auto flex-1">
              <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">Eje / Dataset</th>
                      <th className="py-3 px-3.5">Tablas & Formato</th>
                      <th className="py-3 px-3.5">Ruta Asignada (Red o Local)</th>
                      <th className="py-3 px-3.5 text-center">Última Sinc.</th>
                      <th className="py-3 px-3.5 text-right">Acciones Directas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {origenesList.map(origen => (
                      <tr key={origen.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5 font-bold text-slate-900 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              origen.estado === 'Sincronizado' ? 'bg-emerald-500' :
                              origen.estado === 'Error' ? 'bg-red-600' :
                              origen.estado === 'Sincronizando' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                            }`}></div>
                            <span>{origen.nombre}</span>
                          </div>
                          <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${
                            origen.estado === 'Sincronizado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            origen.estado === 'Error' ? 'bg-red-50 border-red-200 text-red-700' :
                            origen.estado === 'Sincronizando' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>{origen.estado}</span>
                        </td>

                        <td className="py-3 px-3.5">
                          <span className="font-mono text-[11px] font-semibold text-slate-700 block">
                            {origen.tablas}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{origen.tipo}</span>
                        </td>

                        <td className="py-3 px-3.5">
                          <input
                            type="text"
                            value={origen.ruta}
                            aria-label={`Ruta asignada para ${origen.nombre}`}
                            disabled={syncLoadingId !== null}
                            onChange={e => {
                              const nuevaRuta = e.target.value
                              setOrigenesList(prev =>
                                prev.map(item => (item.id === origen.id ? { ...item, ruta: nuevaRuta } : item))
                              )
                            }}
                            className="w-full text-xs font-mono text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                            title="Haz clic para modificar la ruta si cambia la letra de unidad"
                          />
                        </td>

                        <td className="py-3 px-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block">
                            {origen.registros.toLocaleString()} reg.
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{origen.ultimaSinc}</span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSincronizarRuta(origen)}
                              disabled={syncLoadingId === origen.id || syncLoadingId === 'ALL'}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-bold transition shadow-xs"
                              title="Sincronizar directamente desde la ruta configurada"
                            >
                              {syncLoadingId === origen.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-red-400" />
                              ) : (
                                <RefreshCw className="w-3 h-3 text-red-400" />
                              )}
                              <span>Actualizar</span>
                            </button>

                            <label className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold transition border border-slate-200 ${syncLoadingId !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 cursor-pointer'}`}>
                              <Upload className="w-3 h-3 text-slate-500" />
                              <span>Cargar</span>
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.accdb,.mdb"
                                className="hidden"
                                disabled={syncLoadingId !== null}
                                aria-label={`Cargar archivo para ${origen.nombre}`}
                                onChange={e => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleCargarArchivoFila(origen.id, e.target.files[0])
                                    e.target.value = ''
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Cada carga se valida antes de reemplazar datos y queda registrada (usuario, fecha y registros).
              </span>
              <button
                onClick={() => setOrigenesModalOpen(false)}
                disabled={syncLoadingId !== null}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
