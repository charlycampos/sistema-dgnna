'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Heart,
  RotateCcw,
  Download,
  Building2,
  FileSpreadsheet,
  MapPin,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  UploadCloud,
  X,
  RefreshCw,
  Info,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import * as XLSX from 'xlsx'
import { useMe } from '@/lib/use-me'

// Paleta institucional oficial DGNNA / MIMP
const COLORS = {
  blue: '#2563EB',
  indigo: '#4F46E5',
  purple: '#7C3AED',
  emerald: '#16A34A',
  teal: '#0D9488',
  amber: '#D97706',
  rose: '#E11D48',
  red: '#DC2626',
  slate: '#64748B',
}

// Tipos de datos de la API
interface ResumenKPIs {
  totalExpedientes: number
  adoptables: number
  adopcionEspecial: number
  porcentajeAdopcionEspecial: number
  adoptados: number
  archivoDefinitivo: number
  enEvaluacion: number
  designados: number
  enAcogimiento: number
  postadopcionActiva: number
  postadopcionFinalizada: number
  adopcionesFallidas: number
  tasaFallidaPct: number
}

interface FunnelItem {
  etapa: string
  cantidad: number
  color: string
}

interface SedeDistItem {
  sede: string
  cantidad: number
}

interface ResumenResponse {
  kpis: ResumenKPIs
  sedes: SedeDistItem[]
  funnel: FunnelItem[]
}

interface DemografiaAdoptabilidad {
  mujeres: number
  hombres: number
  gruposEtarios: { grupo: string; cantidad: number }[]
}

interface TopCarItem {
  car: string
  cantidad: number
  departamento?: string
}

interface AdoptabilidadResponse {
  totalAdoptables: number
  adopcionEspecial: number
  porcentajeAdopcionEspecial: number
  edadPromedio: number | null
  demografia: DemografiaAdoptabilidad
  tiposAdopcion: { tipo: string; cantidad: number }[]
  gruposReferencia: { grupo: string; cantidad: number }[]
  condicionUltima: { condicion: string; cantidad: number }[]
  topCars: TopCarItem[]
}

interface SedeRpadoItem {
  sede: string
  total: number
  enProceso: number
  finalizados: number
  fallidos: number
}

interface PostadopcionResponse {
  resumen: {
    total: number
    enProceso: number
    finalizados: number
    fallidos: number
    tasaFallida: number
  }
  pendientesPorHito: { hito: string; cantidad: number }[]
  cargaPorSede: SedeRpadoItem[]
}

interface CargaItem {
  id: number
  tipoArchivo: string
  nombreArchivo: string
  periodoCorte: string
  usuario: string
  fechaCarga: string
  totalRegistros: number
  estado: string
  mensaje?: string
}

interface FiltrosCatalogos {
  sedes: string[]
  periodos: string[]
  tiposAdopcion: string[]
  gruposReferencia: string[]
  sexos: string[]
}

export default function AdopcionesDashboardClient() {
  const { canWrite } = useMe()
  const puedeCargar = canWrite('gestion-datos')
  // Pestaña activa: RESUMEN | ADOPTABILIDAD | POSTADOPCION | CARGAS
  const [activeTab, setActiveTab] = useState<'RESUMEN' | 'ADOPTABILIDAD' | 'POSTADOPCION' | 'CARGAS'>('RESUMEN')

  // Filtros globales
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('TODOS')
  const [selectedSede, setSelectedSede] = useState<string>('TODOS')

  // Estados de datos API
  const [filtrosCatalogos, setFiltrosCatalogos] = useState<FiltrosCatalogos>({
    sedes: [],
    periodos: [],
    tiposAdopcion: [],
    gruposReferencia: [],
    sexos: ['HOMBRE', 'MUJER'],
  })

  const [resumenData, setResumenData] = useState<ResumenResponse | null>(null)
  const [adoptabilidadData, setAdoptabilidadData] = useState<AdoptabilidadResponse | null>(null)
  const [postadopcionData, setPostadopcionData] = useState<PostadopcionResponse | null>(null)
  const [cargasData, setCargasData] = useState<CargaItem[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filtro de búsqueda en tablas secundarias
  const [searchFilter, setSearchFilter] = useState('')

  // Modal de carga periódica
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTipo, setUploadTipo] = useState<'ADOPCIONES' | 'RPADO'>('ADOPCIONES')
  const [uploadPeriodo, setUploadPeriodo] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{ success: boolean; msg: string } | null>(null)

  // Cargar Catálogos Iniciales
  const cargarCatalogos = useCallback(async () => {
    try {
      const res = await fetch('/api/gestion-datos/adopciones/filtros')
      if (res.ok) {
        const data = await res.json()
        setFiltrosCatalogos(data)
      }
    } catch (err) {
      console.error('Error al cargar catálogos de adopciones:', err)
    }
  }, [])

  // Cargar Datos según pestaña y filtros
  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    const params = new URLSearchParams()
    if (selectedPeriodo !== 'TODOS') params.set('periodo', selectedPeriodo)
    if (selectedSede !== 'TODOS') params.set('sede', selectedSede)

    try {
      if (activeTab === 'RESUMEN') {
        const res = await fetch(`/api/gestion-datos/adopciones/resumen?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}: Error al obtener resumen de adopciones`)
        const data: ResumenResponse = await res.json()
        setResumenData(data)
      } else if (activeTab === 'ADOPTABILIDAD') {
        const res = await fetch(`/api/gestion-datos/adopciones/adoptabilidad?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}: Error al obtener datos de adoptabilidad`)
        const data: AdoptabilidadResponse = await res.json()
        setAdoptabilidadData(data)
      } else if (activeTab === 'POSTADOPCION') {
        const res = await fetch(`/api/gestion-datos/adopciones/postadopcion?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}: Error al obtener datos de postadopción`)
        const data: PostadopcionResponse = await res.json()
        setPostadopcionData(data)
      } else if (activeTab === 'CARGAS') {
        const res = await fetch('/api/gestion-datos/adopciones/cargas')
        if (!res.ok) throw new Error(`HTTP ${res.status}: Error al obtener historial de cargas`)
        const data: CargaItem[] = await res.json()
        setCargasData(data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al consultar el servidor'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedPeriodo, selectedSede])

  useEffect(() => {
    cargarCatalogos()
  }, [cargarCatalogos])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const handleResetFilters = () => {
    setSelectedPeriodo('TODOS')
    setSelectedSede('TODOS')
    setSearchFilter('')
  }

  // Exportar matriz a Excel según la pestaña activa
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const fechaStr = new Date().toISOString().slice(0, 10)

    if (activeTab === 'RESUMEN' && resumenData) {
      const kpisRow = [
        { Métrica: 'Total Expedientes Registrados', Cantidad: resumenData.kpis.totalExpedientes },
        { Métrica: 'Adoptables (En Espera de Familia)', Cantidad: resumenData.kpis.adoptables },
        { Métrica: 'Adopciones Concluidas', Cantidad: resumenData.kpis.adoptados },
        { Métrica: 'En Evaluación Psicosocial', Cantidad: resumenData.kpis.enEvaluacion },
        { Métrica: 'Designados', Cantidad: resumenData.kpis.designados },
        { Métrica: 'En Acogimiento Preadoptivo', Cantidad: resumenData.kpis.enAcogimiento },
        { Métrica: 'Archivo Definitivo', Cantidad: resumenData.kpis.archivoDefinitivo },
        { Métrica: 'Seguimiento Postadopción Activo', Cantidad: resumenData.kpis.postadopcionActiva },
        { Métrica: 'Postadopción Finalizada', Cantidad: resumenData.kpis.postadopcionFinalizada },
        { Métrica: 'Adopciones Fallidas', Cantidad: resumenData.kpis.adopcionesFallidas },
        { Métrica: 'Tasa de Ruptura Postadopción (%)', Cantidad: resumenData.kpis.tasaFallidaPct },
      ]
      const wsKpis = XLSX.utils.json_to_sheet(kpisRow)
      const wsSedes = XLSX.utils.json_to_sheet(resumenData.sedes)
      XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs Generales')
      XLSX.utils.book_append_sheet(wb, wsSedes, 'Distribución Sedes UA')
      XLSX.writeFile(wb, `Reporte_Adopciones_Resumen_${fechaStr}.xlsx`)
    } else if (activeTab === 'ADOPTABILIDAD' && adoptabilidadData) {
      const wsTipos = XLSX.utils.json_to_sheet(adoptabilidadData.tiposAdopcion)
      const wsGrupos = XLSX.utils.json_to_sheet(adoptabilidadData.gruposReferencia)
      const wsEtarios = XLSX.utils.json_to_sheet(adoptabilidadData.demografia.gruposEtarios)
      const wsCars = XLSX.utils.json_to_sheet(adoptabilidadData.topCars)
      XLSX.utils.book_append_sheet(wb, wsTipos, 'Tipos Adopción')
      XLSX.utils.book_append_sheet(wb, wsGrupos, 'Adopción Especial')
      XLSX.utils.book_append_sheet(wb, wsEtarios, 'Grupos Etarios')
      XLSX.utils.book_append_sheet(wb, wsCars, 'Top CARs')
      XLSX.writeFile(wb, `Reporte_NNA_Adoptables_${fechaStr}.xlsx`)
    } else if (activeTab === 'POSTADOPCION' && postadopcionData) {
      const wsSedes = XLSX.utils.json_to_sheet(postadopcionData.cargaPorSede)
      const wsHitos = XLSX.utils.json_to_sheet(postadopcionData.pendientesPorHito)
      XLSX.utils.book_append_sheet(wb, wsSedes, 'Carga por Sede')
      XLSX.utils.book_append_sheet(wb, wsHitos, 'Hitos Pendientes')
      XLSX.writeFile(wb, `Reporte_Postadopcion_RPADO_${fechaStr}.xlsx`)
    } else if (activeTab === 'CARGAS') {
      const wsCargas = XLSX.utils.json_to_sheet(cargasData)
      XLSX.utils.book_append_sheet(wb, wsCargas, 'Historial Cargas')
      XLSX.writeFile(wb, `Historial_Cargas_DA_${fechaStr}.xlsx`)
    }
  }

  // Manejo de carga de archivo
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    setUploadFeedback(null)

    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('tipo', uploadTipo)
    if (uploadPeriodo.trim()) {
      formData.append('periodoCorte', uploadPeriodo.trim())
    }
    try {
      const res = await fetch('/api/gestion-datos/adopciones/importar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Error al procesar el archivo Excel')
      }
      setUploadFeedback({
        success: true,
        msg: `Carga exitosa: ${data.resultado?.registros_cargados ?? 0} registros procesados correctamente.`,
      })
      setUploadFile(null)
      cargarCatalogos()
      cargarDatos()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir archivo'
      setUploadFeedback({ success: false, msg })
    } finally {
      setUploading(false)
    }
  }

  // Filtrado reactivo en tablas
  const filteredSedesResumen = useMemo(() => {
    if (!resumenData?.sedes) return []
    if (!searchFilter.trim()) return resumenData.sedes
    return resumenData.sedes.filter((s) => s.sede.toLowerCase().includes(searchFilter.toLowerCase()))
  }, [resumenData?.sedes, searchFilter])

  const filteredCarsAdoptables = useMemo(() => {
    if (!adoptabilidadData?.topCars) return []
    if (!searchFilter.trim()) return adoptabilidadData.topCars
    return adoptabilidadData.topCars.filter(
      (c) =>
        c.car.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (c.departamento && c.departamento.toLowerCase().includes(searchFilter.toLowerCase()))
    )
  }, [adoptabilidadData?.topCars, searchFilter])

  const filteredSedesRpado = useMemo(() => {
    if (!postadopcionData?.cargaPorSede) return []
    if (!searchFilter.trim()) return postadopcionData.cargaPorSede
    return postadopcionData.cargaPorSede.filter((s) => s.sede.toLowerCase().includes(searchFilter.toLowerCase()))
  }, [postadopcionData?.cargaPorSede, searchFilter])

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 space-y-4 text-slate-800">
      {/* ─────────────────────────────────────────────────────────────
          1. CABECERA INSTITUCIONAL OFICIAL MIMP
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <div className="bg-[#D91B24] text-white font-bold px-2.5 py-1 rounded text-xs tracking-wider shadow-sm">
              PERÚ
            </div>
            <div className="text-[11px] leading-tight font-medium text-slate-700 max-w-[140px]">
              Ministerio de la Mujer y Poblaciones Vulnerables
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                DA • DIRECCIÓN DE ADOPCIONES
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-semibold text-slate-500">Mando Estratégico DGNNA</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 mt-0.5">
              Panel Gerencial de Adopciones y Postadopción
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Trazabilidad integral del proceso de adoptabilidad (RENE) y monitoreo de integración familiar (RPADO)
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {puedeCargar && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Cargar archivo
            </button>
          )}
          <button
            onClick={cargarDatos}
            disabled={loading}
            aria-label="Actualizar datos de Adopciones"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition shadow-xs disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Exportar (.xlsx)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BOTONERA DE PESTAÑAS PRINCIPALES
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveTab('RESUMEN')
            setSearchFilter('')
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'RESUMEN'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Resumen General y Funnel
        </button>

        <button
          onClick={() => {
            setActiveTab('ADOPTABILIDAD')
            setSearchFilter('')
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'ADOPTABILIDAD'
              ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Heart className="w-4 h-4" />
          Adoptabilidad y Adopción Especial
          {(adoptabilidadData?.totalAdoptables ?? resumenData?.kpis.adoptables) != null
            ? ` (${adoptabilidadData?.totalAdoptables ?? resumenData?.kpis.adoptables})`
            : ''}
        </button>

        <button
          onClick={() => {
            setActiveTab('POSTADOPCION')
            setSearchFilter('')
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'POSTADOPCION'
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Seguimiento Postadopción (RPADO)
        </button>

        <button
          onClick={() => {
            setActiveTab('CARGAS')
            setSearchFilter('')
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'CARGAS'
              ? 'bg-slate-800 text-white shadow-sm ring-2 ring-slate-800/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Auditoría de Cargas Excel
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BARRA DE FILTROS GLOBALES
      ───────────────────────────────────────────────────────────── */}
      {activeTab !== 'CARGAS' && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtros Estratégicos:</span>
            </div>

            {/* Selector Sede UA */}
            <div className="flex items-center gap-1">
              <label htmlFor="select-sede" className="text-[11px] font-semibold text-slate-500">Sede UA:</label>
              <select
                id="select-sede"
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todas las Sedes UA ({filtrosCatalogos.sedes.length})</option>
                {filtrosCatalogos.sedes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Período de Corte */}
            {filtrosCatalogos.periodos.length > 0 && (
              <div className="flex items-center gap-1">
                <label htmlFor="select-corte" className="text-[11px] font-semibold text-slate-500">Corte:</label>
                <select
                  id="select-corte"
                  value={selectedPeriodo}
                  onChange={(e) => setSelectedPeriodo(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Último Corte Oficial Vigente</option>
                  {filtrosCatalogos.periodos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Limpiar Filtros
          </button>
        </div>
      )}

      {activeTab !== 'CARGAS' && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-900">
          <span><strong>Corte:</strong> {selectedPeriodo === 'TODOS' ? 'último corte disponible' : selectedPeriodo}</span>
          <span><strong>Sede:</strong> {selectedSede === 'TODOS' ? 'todas las sedes' : selectedSede}</span>
          <span><strong>Fuente:</strong> RENE Adopciones y RPADO</span>
        </div>
      )}

      {/* Alerta de Error */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-xs text-red-700 font-medium">{errorMsg}</span>
          </div>
          <button
            onClick={cargarDatos}
            className="text-xs font-bold text-red-800 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Estado Cargando */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-xs font-medium">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>Consultando registros oficiales en Oracle Database...</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. CONTENIDO SEGÚN PESTAÑA ACTIVA
      ───────────────────────────────────────────────────────────── */}
      {!loading && (
        <>
          {/* =========================================================
              PESTAÑA 1: RESUMEN GENERAL & FUNNEL
          ========================================================= */}
          {activeTab === 'RESUMEN' && resumenData && (
            <div className="space-y-4">
              {/* Tarjetas KPI Macro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                      Adoptables en Espera
                    </span>
                    <Heart className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {resumenData.kpis.adoptables}
                  </div>
                  <p className="text-[10px] text-amber-700 font-semibold mt-1">
                    {resumenData.kpis.porcentajeAdopcionEspecial}% corresponde a adopción especial
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                      Adopciones Concluidas
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {resumenData.kpis.adoptados}
                  </div>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                    Integración familiar definitiva lograda
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                      Postadopción Activa (RPADO)
                    </span>
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {resumenData.kpis.postadopcionActiva}
                  </div>
                  <p className="text-[10px] text-blue-700 font-semibold mt-1">
                    Familias en ciclo de 3 años de acompañamiento
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-rose-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                      Tasa de Ruptura (Fallidas)
                    </span>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {resumenData.kpis.tasaFallidaPct}%
                  </div>
                  <p className="text-[10px] text-rose-700 font-semibold mt-1">
                    {resumenData.kpis.adopcionesFallidas} casos reportados en RPADO
                  </p>
                </div>
              </div>

              {/* Fila Central: Funnel del Proceso & Distribución Sedes */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Funnel Visual del Proceso de Adopción */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Distribución actual por etapa del proceso
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Existencias por estado registradas en RENE; no representa conversión entre etapas
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Total Exp.: {resumenData.kpis.totalExpedientes}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {resumenData.funnel.map((etapa, idx) => {
                        const maxVal = Math.max(...resumenData.funnel.map((f) => f.cantidad), 1)
                        const pct = Math.round((etapa.cantidad / maxVal) * 100)
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: etapa.color }}
                                />
                                {etapa.etapa}
                              </span>
                              <span className="font-bold text-slate-900">{etapa.cantidad}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(pct, 2)}%`,
                                  backgroundColor: etapa.color,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <span className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      Expedientes en Archivo Definitivo (mayoría de edad / revocaciones):
                    </span>
                    <span className="font-bold text-slate-700">
                      {resumenData.kpis.archivoDefinitivo}
                    </span>
                  </div>
                </div>

                {/* Distribución por Sedes UA */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Carga Operativa por Sede UA
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Unidades de Adopción descentralizadas con mayor volumen
                        </p>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar sede..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-28 focus:w-36 transition-all focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[300px] rounded-lg border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Sede UA</th>
                            <th className="py-2 px-3 text-right">Expedientes</th>
                            <th className="py-2 px-3 text-right">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {filteredSedesResumen.map((s, i) => {
                            const pct =
                              resumenData.kpis.totalExpedientes > 0
                                ? ((s.cantidad / resumenData.kpis.totalExpedientes) * 100).toFixed(1)
                                : '0'
                            return (
                              <tr key={i} className="hover:bg-slate-50 transition">
                                <td className="py-1.5 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {s.sede}
                                </td>
                                <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                                  {s.cantidad}
                                </td>
                                <td className="py-1.5 px-3 text-right text-slate-500">{pct}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-slate-400 text-right">
                    Total Sedes activas: {resumenData.sedes.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              PESTAÑA 2: ADOPTABILIDAD Y ADOPCIÓN ESPECIAL
          ========================================================= */}
          {activeTab === 'ADOPTABILIDAD' && adoptabilidadData && (
            <div className="space-y-4">
              {/* Alerta Directora: Radiografía de la Adoptabilidad */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-600 text-white rounded-xl mt-0.5">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-950">
                      Radiografía de NNA con Declaración de Adoptabilidad ({adoptabilidadData.totalAdoptables} Casos)
                    </h3>
                    <p className="text-xs text-purple-800 font-medium">
                      El {adoptabilidadData.porcentajeAdopcionEspecial}% de los NNA adoptables está clasificado como{' '}
                      <strong>Adopción Especial</strong> en el corte consultado ({adoptabilidadData.adopcionEspecial} casos).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-purple-200 pt-2 md:pt-0 md:pl-4 text-xs shrink-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-600 block">
                      Mujeres
                    </span>
                    <span className="text-xl font-black text-purple-950">
                      {adoptabilidadData.demografia.mujeres}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-600 block">
                      Hombres
                    </span>
                    <span className="text-xl font-black text-purple-950">
                      {adoptabilidadData.demografia.hombres}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gráficos de Adopción Especial y Grupos Etarios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Grupos de Referencia (Hermanos, Discapacidad, etc.) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-900 mb-1">
                    Criterios de Adopción Especial
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3">
                    Desglose por factores de vulnerabilidad o necesidad prioritaria
                  </p>
                  <div className="space-y-2">
                    {adoptabilidadData.gruposReferencia.map((g, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-medium text-slate-700 truncate mr-2">{g.grupo}</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {g.cantidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pirámide Etaria de Adoptables */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-900 mb-1">
                    Distribución por Grupos de Edad
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3">
                    {adoptabilidadData.edadPromedio == null
                      ? 'Sin edades registradas para el corte consultado'
                      : `Edad promedio: ${adoptabilidadData.edadPromedio} años`}
                  </p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adoptabilidadData.demografia.gruposEtarios}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="grupo" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="cantidad" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Condición Última del NNA */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-900 mb-1">
                    Condición Actual en CAR
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3">
                    Situación o resultado de la evaluación psicosocial
                  </p>
                  <div className="space-y-1.5">
                    {adoptabilidadData.condicionUltima.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-slate-700 truncate mr-2">{c.condicion}</span>
                        <span className="font-bold text-slate-900">{c.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cruce con CAR de Procedencia / Acogimiento */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Centros de Acogimiento Residencial (CAR) con Mayor Población Adoptable
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Identificación de los CAR donde residen actualmente los NNA a la espera de designación familiar
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrar CAR..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2 px-3">Centro CAR</th>
                        <th className="py-2 px-3">Departamento</th>
                        <th className="py-2 px-3 text-right">NNA Adoptables</th>
                        <th className="py-2 px-3 text-right">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {filteredCarsAdoptables.map((car, i) => {
                        const pct =
                          adoptabilidadData.totalAdoptables > 0
                            ? ((car.cantidad / adoptabilidadData.totalAdoptables) * 100).toFixed(1)
                            : '0'
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {car.car}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{car.departamento || 'NO ESPECIFICADO'}</td>
                            <td className="py-2 px-3 text-right font-black text-purple-900">
                              {car.cantidad}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">{pct}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              PESTAÑA 3: SEGUIMIENTO POSTADOPCIÓN (RPADO)
          ========================================================= */}
          {activeTab === 'POSTADOPCION' && postadopcionData && (
            <div className="space-y-4">
              {/* Tarjetas de Estado RPADO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
                    Total Familias en RPADO
                  </span>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {postadopcionData.resumen.total}
                  </div>
                  <span className="text-[10px] text-slate-500">Histórico de expedientes</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-blue-500">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight block">
                    Acompañamiento Activo (En Proceso)
                  </span>
                  <div className="text-3xl font-black text-blue-950 mt-1">
                    {postadopcionData.resumen.enProceso}
                  </div>
                  <span className="text-[10px] text-blue-600 font-medium">Bajo visitas semestrales</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-emerald-500">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight block">
                    Ciclo de 3 Años Concluido
                  </span>
                  <div className="text-3xl font-black text-emerald-950 mt-1">
                    {postadopcionData.resumen.finalizados}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Finalizado satisfactorio</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs border-l-4 border-l-red-500">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight block">
                    Adopciones Fallidas (Ruptura)
                  </span>
                  <div className="text-3xl font-black text-red-950 mt-1">
                    {postadopcionData.resumen.fallidos}
                  </div>
                  <span className="text-[10px] text-red-600 font-medium">
                    Tasa de falla: {postadopcionData.resumen.tasaFallida}%
                  </span>
                </div>
              </div>

              {/* Hitos e Informes Pendientes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semáforo de Informes Faltantes */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Semáforo de Informes Postadopción Pendientes
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Familias activas según el hito de informe semestral que adeudan entregar
                      </p>
                    </div>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>

                  <div className="space-y-2">
                    {postadopcionData.pendientesPorHito.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{h.hito}</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          {h.cantidad} familias
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monitoreo por Sede UA de Postadopción */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Carga de Supervisión Postadopción por Sede
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Balance entre familias activas, finalizadas y fallidas
                      </p>
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[300px] rounded-lg border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Sede UA</th>
                          <th className="py-2 px-3 text-right">Activas</th>
                          <th className="py-2 px-3 text-right">Finalizadas</th>
                          <th className="py-2 px-3 text-right text-red-600">Fallidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {filteredSedesRpado.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="py-1.5 px-3 font-semibold text-slate-800">{s.sede}</td>
                            <td className="py-1.5 px-3 text-right font-bold text-blue-700">
                              {s.enProceso}
                            </td>
                            <td className="py-1.5 px-3 text-right font-semibold text-emerald-700">
                              {s.finalizados}
                            </td>
                            <td className="py-1.5 px-3 text-right font-black text-red-600">
                              {s.fallidos}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              PESTAÑA 4: GESTIÓN Y AUDITORÍA DE CARGAS
          ========================================================= */}
          {activeTab === 'CARGAS' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Historial de Importaciones Periódicas de Archivos Oficiales
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Auditoría de lotes procesados desde archivos Excel de la DA y Postadopción en Oracle
                  </p>
                </div>
                {puedeCargar && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Nueva Carga Oficial
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Tipo Archivo</th>
                      <th className="py-3 px-4">Nombre Archivo</th>
                      <th className="py-3 px-4">Período Corte</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Fecha Carga</th>
                      <th className="py-3 px-4 text-right">Registros</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {cargasData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No hay registros de cargas aún.
                        </td>
                      </tr>
                    ) : (
                      cargasData.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-500">#{c.id}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{c.tipoArchivo}</td>
                          <td className="py-2.5 px-4 text-slate-700 font-medium">{c.nombreArchivo}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {c.periodoCorte}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{c.usuario}</td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {c.fechaCarga ? c.fechaCarga.replace('T', ' ').slice(0, 19) : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            {c.totalRegistros.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.estado === 'EXITOSA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.estado === 'PROCESANDO' || c.estado === 'OBSERVADA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {c.estado}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL DE CARGA PERIÓDICA DE ARCHIVOS EXCEL
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && puedeCargar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="carga-da-title" className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400" />
                <h3 id="carga-da-title" className="font-bold text-sm">Carga Oficial de Datos — DA</h3>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false)
                  setUploadFeedback(null)
                }}
                aria-label="Cerrar ventana de carga"
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              {uploadFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 ${
                    uploadFeedback.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {uploadFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <span>{uploadFeedback.msg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tipo de Registro Oficial:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadTipo('ADOPCIONES')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                      uploadTipo === 'ADOPCIONES'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    RENE ADOPCIONES
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTipo('RPADO')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                      uploadTipo === 'RPADO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    RPADO POSTADOPCIÓN
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="periodo-carga-da" className="font-bold text-slate-700 block">Período de Corte:</label>
                <input
                  id="periodo-carga-da"
                  type="month"
                  value={uploadPeriodo}
                  onChange={(e) => setUploadPeriodo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="archivo-carga-da" className="font-bold text-slate-700 block">Archivo Excel (.xlsx o .xlsm):</label>
                <input
                  id="archivo-carga-da"
                  type="file"
                  accept=".xlsx,.xlsm"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0])
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Garantía de Seguridad y Privacidad
                </div>
                <p>
                  Los nombres de NNA y adoptantes serán cifrados mediante <strong>AES-256-GCM</strong> y Blind Index en Oracle Database. Ningún dato nominal se expondrá en dashboards gerenciales.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando Lote...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" /> Iniciar Ingestión
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. FOOTER INSTITUCIONAL OFICIAL
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 bg-white p-3 rounded-xl shadow-2xs">
        <div>
          <strong className="text-slate-700">Elaborado:</strong> Dirección de Adopciones (DA) — DGNNA | MIMP
        </div>
        <div>
          <strong className="text-slate-700">Fuente:</strong> RENE (Registro Nacional de Adopciones) y RPADO (Registro de Postadopción)
        </div>
      </div>
    </div>
  )
}
