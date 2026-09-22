'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  Award,
  AlertTriangle,
  Users,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Layers,
  HeartPulse,
  Activity,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  TrendingUp,
  FileCheck,
  AlertOctagon,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  UploadCloud,
  X
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts'
import * as XLSX from 'xlsx'

// Tipado del Centro CAR para el Directorio
export interface CarCentroItem {
  id: number
  codigo: string
  codigoDgnna: string
  nombre: string
  tipo: string
  tipoEspecifico: string
  departamento: string
  provincia: string
  distrito: string
  ubigeo: string
  unidadLinea: string
  capacidadInstalada: number
  capacidadReal: number
  poblacionActual: number
  tasaOcupacion: number | null
  estadoSaturacion: 'SOBREDEMANDA' | 'ALERTA' | 'DISPONIBLE' | 'SIN_DATO'
  acreditado: string
  nroConstancia: string
  resolucion: string
  vigencia: string
  latitud: string
  longitud: string
}

export interface ResumenGlobal {
  totalCentros: number
  capacidadInstalada: number
  capacidadReal: number
  centrosAcreditados: number
  centrosNoAcreditados: number
  totalNna: number
  tasaOcupacion: number
  mayor18Meses: number
  menor18Meses: number
  pctMayor18Meses: number
  periodosCorte: string[]
  distribucionTipoCar: {
    basico: number
    especializado: number
    urgencia: number
  }
}

export interface MetricasBasico {
  totalNna: number
  permanencia: {
    mayor18Meses: number
    menor18Meses: number
    pctMayor18: number
  }
  pti: {
    aprobado: number
    pendiente: number
    sinDato: number
    pctAprobado: number
  }
  demografia: {
    mujeres: number
    hombres: number
    gruposEtarios: { grupo: string; cantidad: number }[]
  }
  saludEducacion: {
    conSeguro: number
    sinSeguro: number
    conDiscapacidad: number
  }
  topSituacionLegal: { nombre: string; cantidad: number }[]
}

export interface MetricasEspecializado {
  totalNna: number
  conDiscapacidad: number
  pctDiscapacidad: number
  mayor18Meses: number
  pctMayor18: number
  demografia: {
    mujeres: number
    hombres: number
  }
  topCentros: { centro: string; cantidad: number }[]
}

export interface MetricasUrgencia {
  totalNna: number
  diasPromedioEstancia: number
  estanciaProlongadaUrgencia: number
  pctProlongada: number
  demografia: {
    mujeres: number
    hombres: number
  }
  topCentros: { centro: string; cantidad: number }[]
}

export interface CarCargaItem {
  id: number
  tipoCar: string
  nombreArchivo: string
  periodoCorte: string
  usuario: string | null
  fechaCarga: string | null
  totalRegistros: number
  estado: string
  mensaje: string | null
}

export interface CarBandejaItem {
  centro: string
  codigoCentro: string | null
  departamento: string | null
  poblacionActiva: number
  capacidadReal: number | null
  ocupacion: number | null
  mayor18: number
  ptiPendiente: number
  sinSeguro: number
  estanciaPromedio: number | null
  permanenciaSobreUmbral: number
}

export default function DpnnaDashboardClient() {
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'resumen' | 'centros' | 'basico' | 'especializado' | 'urgencia' | 'cargas'>('resumen')

  // Estados de datos
  const [resumen, setResumen] = useState<ResumenGlobal | null>(null)
  const [centros, setCentros] = useState<CarCentroItem[]>([])
  const [metricasBasico, setMetricasBasico] = useState<MetricasBasico | null>(null)
  const [metricasEsp, setMetricasEsp] = useState<MetricasEspecializado | null>(null)
  const [metricasUrg, setMetricasUrg] = useState<MetricasUrgencia | null>(null)
  const [cargas, setCargas] = useState<CarCargaItem[]>([])
  const [bandejas, setBandejas] = useState<Record<'BASICO' | 'ESPECIALIZADO' | 'URGENCIA', CarBandejaItem[]>>({ BASICO: [], ESPECIALIZADO: [], URGENCIA: [] })
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Filtros del Directorio de Centros
  const [busquedaCentro, setBusquedaCentro] = useState('')
  const [filtroDep, setFiltroDep] = useState('TODOS')
  const [filtroAcreditado, setFiltroAcreditado] = useState('TODOS')
  const [filtroSaturacion, setFiltroSaturacion] = useState('TODOS')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('TODOS')
  const [filtroSexo, setFiltroSexo] = useState('TODOS')
  const [filtroGrupoEtario, setFiltroGrupoEtario] = useState('TODOS')

  // Modal de Importación Periódica
  const [modalImportar, setModalImportar] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [tipoImportacion, setTipoImportacion] = useState<'CENTROS' | 'BASICO' | 'ESPECIALIZADO' | 'URGENCIA'>('CENTROS')
  const [periodoImportacion, setPeriodoImportacion] = useState(() => new Date().toISOString().slice(0, 7))
  const [importando, setImportando] = useState(false)
  const [mensajeImportacion, setMensajeImportacion] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true)
    setErrorCarga(null)
    try {
      const fetchJson = async (url: string) => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`No se pudo consultar ${url} (${response.status})`)
        return response.json()
      }
      const params = new URLSearchParams()
      if (filtroPeriodo) params.set('periodo', filtroPeriodo)
      if (filtroDep !== 'TODOS') params.set('departamento', filtroDep)
      if (filtroCentro !== 'TODOS') params.set('codCen', filtroCentro)
      if (filtroSexo !== 'TODOS') params.set('sexo', filtroSexo)
      if (filtroGrupoEtario !== 'TODOS') params.set('grupoEtario', filtroGrupoEtario)
      const withFilters = (path: string) => `${path}${params.size ? `?${params.toString()}` : ''}`
      const [resResumen, resCentros, resBas, resEsp, resUrg, resCargas, bandejaBas, bandejaEsp, bandejaUrg] = await Promise.all([
        fetchJson(withFilters('/api/gestion-datos/dpnna/resumen')),
        fetchJson(withFilters('/api/gestion-datos/dpnna/centros')),
        fetchJson(withFilters('/api/gestion-datos/dpnna/metricas/basico')),
        fetchJson(withFilters('/api/gestion-datos/dpnna/metricas/especializado')),
        fetchJson(withFilters('/api/gestion-datos/dpnna/metricas/urgencia')),
        fetchJson('/api/gestion-datos/dpnna/cargas').catch(() => []),
        fetchJson(withFilters('/api/gestion-datos/dpnna/bandeja/BASICO')).catch(() => []),
        fetchJson(withFilters('/api/gestion-datos/dpnna/bandeja/ESPECIALIZADO')).catch(() => []),
        fetchJson(withFilters('/api/gestion-datos/dpnna/bandeja/URGENCIA')).catch(() => [])
      ])

      setResumen(resResumen)
      setCentros(Array.isArray(resCentros) ? resCentros : [])
      setMetricasBasico(resBas)
      setMetricasEsp(resEsp)
      setMetricasUrg(resUrg)
      setCargas(Array.isArray(resCargas) ? resCargas : [])
      setBandejas({
        BASICO: Array.isArray(bandejaBas) ? bandejaBas : [],
        ESPECIALIZADO: Array.isArray(bandejaEsp) ? bandejaEsp : [],
        URGENCIA: Array.isArray(bandejaUrg) ? bandejaUrg : [],
      })
    } catch (err) {
      console.error('Error cargando métricas DPNNA:', err)
      setErrorCarga(err instanceof Error ? err.message : 'No fue posible cargar el tablero')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Departamentos únicos para el filtro
  const departamentos = useMemo(() => {
    const set = new Set<string>()
    centros.forEach(c => {
      if (c.departamento) set.add(c.departamento)
    })
    return Array.from(set).sort()
  }, [centros])

  // Centros filtrados
  const centrosFiltrados = useMemo(() => {
    return centros.filter(c => {
      const matchBusqueda =
        !busquedaCentro ||
        c.nombre.toLowerCase().includes(busquedaCentro.toLowerCase()) ||
        c.codigo.toLowerCase().includes(busquedaCentro.toLowerCase()) ||
        (c.distrito && c.distrito.toLowerCase().includes(busquedaCentro.toLowerCase()))

      const matchDep = filtroDep === 'TODOS' || c.departamento === filtroDep
      const matchCentro = filtroCentro === 'TODOS' || c.codigo === filtroCentro
      const matchAcred = filtroAcreditado === 'TODOS' || c.acreditado === filtroAcreditado
      const matchSat = filtroSaturacion === 'TODOS' || c.estadoSaturacion === filtroSaturacion

      return matchBusqueda && matchDep && matchCentro && matchAcred && matchSat
    })
  }, [centros, busquedaCentro, filtroDep, filtroCentro, filtroAcreditado, filtroSaturacion])

  const resumenCentros = useMemo(() => {
    const capacidad = centrosFiltrados.reduce((sum, c) => sum + (c.capacidadReal || 0), 0)
    const poblacion = centrosFiltrados.reduce((sum, c) => sum + (c.poblacionActual || 0), 0)
    return {
      total: centrosFiltrados.length,
      acreditados: centrosFiltrados.filter(c => c.acreditado === 'SI').length,
      sobreocupados: centrosFiltrados.filter(c => c.estadoSaturacion === 'SOBREDEMANDA').length,
      sinCapacidad: centrosFiltrados.filter(c => c.estadoSaturacion === 'SIN_DATO').length,
      capacidad,
      disponibles: Math.max(capacidad - poblacion, 0),
    }
  }, [centrosFiltrados])

  // Exportar a Excel el Directorio
  const handleExportarExcel = () => {
    const rows = centrosFiltrados.map(c => ({
      'Código Centro': c.codigo,
      'Código DGNNA': c.codigoDgnna,
      'Nombre del Centro': c.nombre,
      'Tipo Centro': c.tipo,
      'Perfil Específico': c.tipoEspecifico,
      'Departamento': c.departamento,
      'Provincia': c.provincia,
      'Distrito': c.distrito,
      'Ubigeo': c.ubigeo,
      'Capacidad Instalada': c.capacidadInstalada,
      'Capacidad Real': c.capacidadReal,
      'Población Albergada Actual': c.poblacionActual,
      '% Ocupación': c.tasaOcupacion === null ? 'SIN DATO' : `${c.tasaOcupacion}%`,
      'Estado Saturación': c.estadoSaturacion,
      'Acreditado': c.acreditado,
      'R.D.': c.resolucion,
      'Constancia': c.nroConstancia,
      'Vigencia': c.vigencia
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Directorio Centros CAR')
    XLSX.writeFile(wb, `DPNNA_Directorio_Centros_CAR_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Manejar importación periódica
  const handleEjecutarImportacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileToUpload) return

    setImportando(true)
    setMensajeImportacion(null)

    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('tipo', tipoImportacion)
    formData.append('periodoCorte', periodoImportacion)
    formData.append('usuario', 'DIRECTORA_DGNNA')

    try {
      const res = await fetch('/api/gestion-datos/dpnna/importar', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Error al procesar el archivo')
      }

      setMensajeImportacion({
        tipo: 'ok',
        texto: `¡Importación completada con éxito! Se procesaron los registros de ${tipoImportacion}.`
      })
      setFileToUpload(null)
      cargarDatos()
    } catch (err: any) {
      setMensajeImportacion({
        tipo: 'error',
        texto: err.message || 'Ocurrió un error inesperado.'
      })
    } finally {
      setImportando(false)
    }
  }

  // Paleta de colores normativos
  const COLORS = {
    verde: '#16A34A',
    rojo: '#DC2626',
    ambar: '#D97706',
    azul: '#2563EB',
    morado: '#7C3AED',
    gris: '#64748B'
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 space-y-6">

      {/* ─── CABECERA DE ALTO MANDO ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-6 shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">
            <ShieldAlert className="w-4 h-4" />
            Dirección General de Niñas, Niños y Adolescentes (DGNNA) · MIMP
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Situación de los Centros de Acogida Residencial (CAR)
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Monitoreo del último corte disponible, alertas de seguimiento y directorio oficial de centros.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('cargas')}
            className="flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-900 text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            Gestionar cargas
          </button>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-sm font-semibold px-3 py-2.5 rounded-lg shadow-sm transition"
            title="Recargar datos de Oracle"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorCarga && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>No se pudieron actualizar los indicadores.</strong> {errorCarga}
        </div>
      )}

      {/* Navegación independiente por pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'resumen'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Resumen general
        </button>
        <button
          onClick={() => setActiveTab('centros')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'centros'
              ? 'bg-cyan-700 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Directorio de Centros ({centros.length})
        </button>

        <button
          onClick={() => setActiveTab('basico')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'basico'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          CAR Básico ({resumen?.distribucionTipoCar.basico || 0})
        </button>

        <button
          onClick={() => setActiveTab('especializado')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'especializado'
              ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          CAR Especializado ({resumen?.distribucionTipoCar.especializado || 0})
        </button>

        <button
          onClick={() => setActiveTab('urgencia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'urgencia'
              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          CAR de Urgencia ({resumen?.distribucionTipoCar.urgencia || 0})
        </button>

        <button
          onClick={() => setActiveTab('cargas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'cargas'
              ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Gestión de cargas
        </button>
      </div>

      {/* Barra de Filtros analíticos */}
      {activeTab !== 'cargas' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <label className="text-xs font-semibold text-slate-600">Periodo
              <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="">Último corte</option>{resumen?.periodosCorte?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Departamento
              <select value={filtroDep} onChange={e => setFiltroDep(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="TODOS">Todos</option>{departamentos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Centro
              <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="TODOS">Todos</option>{centros.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Sexo
              <select value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="TODOS">Todos</option><option value="MUJER">Mujer</option><option value="HOMBRE">Hombre</option></select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Grupo etario
              <select value={filtroGrupoEtario} onChange={e => setFiltroGrupoEtario(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="TODOS">Todos</option><option value="0 - 11 meses">0–11 meses</option><option value="1 - 5 años">1–5 años</option><option value="6 - 11 años">6–11 años</option><option value="12 - 17 años">12–17 años</option><option value="18 - 25 años">18–25 años</option></select>
            </label>
            <div className="flex gap-2">
              <button onClick={cargarDatos} className="h-10 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 text-sm font-bold">Aplicar</button>
              <button onClick={() => { setFiltroPeriodo(''); setFiltroDep('TODOS'); setFiltroCentro('TODOS'); setFiltroSexo('TODOS'); setFiltroGrupoEtario('TODOS') }} className="h-10 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 text-sm font-semibold text-slate-700">Limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 0: RESUMEN GENERAL EJECUTIVO ─────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Centros */}
            <div className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 border-l-4 border-l-indigo-600 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Directorio de Centros</span>
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {resumen ? resumen.totalCentros : '...'}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {resumen ? resumen.centrosAcreditados : 0} Acreditados (RD)
                </span>
                <span className="text-slate-400">
                  {resumen ? resumen.centrosNoAcreditados : 0} sin acreditación
                </span>
              </div>
            </div>

            {/* Población vs Capacidad */}
            <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 border-l-4 border-l-blue-600 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tasa de Ocupación Global</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {resumen ? `${resumen.tasaOcupacion}%` : '...'}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({resumen ? resumen.totalNna.toLocaleString() : 0} NNA)
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span>Cap. Instalada: <strong>{resumen ? resumen.capacidadInstalada.toLocaleString() : 0}</strong></span>
                <span>Cap. Real: <strong>{resumen ? resumen.capacidadReal.toLocaleString() : 0}</strong></span>
              </div>
            </div>

            {/* ALERTA CRÍTICA SLA: > 18 MESES */}
            <div className="bg-gradient-to-br from-white to-amber-50 border border-amber-300 border-l-4 border-l-amber-500 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Seguimiento: &gt; 18 Meses
                </span>
                <span className="text-xs font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {resumen ? `${resumen.pctMayor18Meses}%` : '...'}
                </span>
              </div>
              <div className="text-3xl font-black text-amber-900">
                {resumen ? resumen.mayor18Meses.toLocaleString() : '...'}
                <span className="text-xs font-normal text-slate-500 ml-2">NNA para revisión</span>
              </div>
              <div className="mt-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
                Indicador de seguimiento; su aplicación depende de la medida y situación individual.
              </div>
            </div>

            {/* Distribución por Tipo de CAR */}
            <div className="bg-gradient-to-br from-white to-violet-50 border border-violet-200 border-l-4 border-l-violet-600 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Distribución por Servicio</span>
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> CAR Básico:
                  </span>
                  <strong className="text-slate-900">{resumen ? resumen.distribucionTipoCar.basico : 0} ({resumen ? roundPct(resumen.distribucionTipoCar.basico, resumen.totalNna) : 0}%)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> CAR Especializado:
                  </span>
                  <strong className="text-slate-900">{resumen ? resumen.distribucionTipoCar.especializado : 0} ({resumen ? roundPct(resumen.distribucionTipoCar.especializado, resumen.totalNna) : 0}%)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> CAR Urgencia:
                  </span>
                  <strong className="text-slate-900">{resumen ? resumen.distribucionTipoCar.urgencia : 0} ({resumen ? roundPct(resumen.distribucionTipoCar.urgencia, resumen.totalNna) : 0}%)</strong>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 text-right">
                Total corte: {resumen ? resumen.totalNna.toLocaleString() : 0} NNA
              </div>
            </div>

            <div className="bg-white border border-slate-200 border-l-4 border-l-cyan-600 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacidad instalada</div>
              <div className="text-3xl font-bold tabular-nums text-slate-900 mt-2">{resumen?.capacidadInstalada?.toLocaleString() || 0}</div>
              <div className="text-xs text-slate-500 mt-2">Plazas declaradas en el directorio</div>
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacidad real</div>
              <div className="text-3xl font-bold tabular-nums text-slate-900 mt-2">{resumen?.capacidadReal?.toLocaleString() || 0}</div>
              <div className="text-xs text-slate-500 mt-2">Denominador de ocupación</div>
            </div>
            <div className="bg-white border border-red-300 border-l-4 border-l-red-600 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Centros sobreocupados</div>
              <div className="text-3xl font-bold tabular-nums text-red-700 mt-2">{resumenCentros.sobreocupados}</div>
              <div className="text-xs text-slate-500 mt-2">Población activa sobre capacidad real</div>
            </div>
            <div className="bg-white border border-green-200 border-l-4 border-l-green-600 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plazas disponibles</div>
              <div className="text-3xl font-bold tabular-nums text-green-700 mt-2">{resumenCentros.disponibles.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-2">Estimación con capacidad real</div>
            </div>
          </div>

          {/* Gráficos Ejecutivos y Acceso Rápido para Dirección DGNNA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico 1: Población por Tipo de CAR */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                Población por Tipo de Acogimiento
              </h3>
              <p className="text-xs text-slate-500 mb-4">Corte activo en los 54 centros</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Básico', value: resumen?.distribucionTipoCar.basico || 0, color: '#2563EB' },
                        { name: 'Especializado', value: resumen?.distribucionTipoCar.especializado || 0, color: '#7C3AED' },
                        { name: 'Urgencia', value: resumen?.distribucionTipoCar.urgencia || 0, color: '#D97706' },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {[
                        { name: 'Básico', color: '#2563EB' },
                        { name: 'Especializado', color: '#7C3AED' },
                        { name: 'Urgencia', color: '#D97706' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Situación de Saturación de Centros */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                Estado de Capacidad de Centros
              </h3>
              <p className="text-xs text-slate-500 mb-4">Nivel de demanda sobre capacidad real</p>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Disponibles (&lt;85%)</span>
                    <span>{centros.filter(c => c.estadoSaturacion === 'DISPONIBLE').length} centros</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${roundPct(centros.filter(c => c.estadoSaturacion === 'DISPONIBLE').length, centros.length)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> En Alerta (85% - 100%)</span>
                    <span>{centros.filter(c => c.estadoSaturacion === 'ALERTA').length} centros</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${roundPct(centros.filter(c => c.estadoSaturacion === 'ALERTA').length, centros.length)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-red-700 flex items-center gap-1.5"><AlertOctagon className="w-3.5 h-3.5" /> Sobredemanda (&gt;100%)</span>
                    <span>{centros.filter(c => c.estadoSaturacion === 'SOBREDEMANDA').length} centros</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-red-500 h-3 rounded-full" style={{ width: `${roundPct(centros.filter(c => c.estadoSaturacion === 'SOBREDEMANDA').length, centros.length)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Sin Capacidad Informada</span>
                    <span>{centros.filter(c => c.estadoSaturacion === 'SIN_DATO').length} centros</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-slate-400 h-3 rounded-full" style={{ width: `${roundPct(centros.filter(c => c.estadoSaturacion === 'SIN_DATO').length, centros.length)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Resumen de Decisiones de Alto Mando */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" /> Enfoque de Dirección General
                </div>
                <h3 className="font-bold text-base text-white">
                  Monitoreo Integral de Medidas
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  El sistema consolida la información de <strong>{centros.length} Centros CAR</strong> a nivel nacional con <strong>{resumen?.totalNna.toLocaleString() || 0} NNA</strong> albergados, garantizando la anonimización de datos y el monitoreo estricto de permanencia.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-700/60 flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('centros')}
                  className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                >
                  <span>Ver Directorio Oficial de Centros</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTab('basico')}
                  className="w-full flex items-center justify-between bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-xs font-semibold px-3 py-2 rounded-lg transition"
                >
                  <span>Revisar Alertas de Permanencia (&gt;18m)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 1: DIRECTORIO DE CENTROS CAR (NOMINAL DE CENTROS) ────── */}
      {activeTab === 'centros' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Centros visibles', resumenCentros.total, 'text-slate-900'],
              ['Acreditados', resumenCentros.acreditados, 'text-emerald-700'],
              ['Capacidad real', resumenCentros.capacidad, 'text-blue-700'],
              ['Plazas disponibles', resumenCentros.disponibles, 'text-emerald-700'],
              ['Sobreocupados', resumenCentros.sobreocupados, 'text-red-700'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500">{label}</div>
                <div className={`text-2xl font-black mt-1 ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          {resumenCentros.sinCapacidad > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {resumenCentros.sinCapacidad} centro(s) no tienen capacidad real informada; no se clasifican como disponibles.
            </div>
          )}
          {/* Filtros de Centros */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 w-full md:w-auto items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar centro por nombre, código o distrito..."
                value={busquedaCentro}
                onChange={e => setBusquedaCentro(e.target.value)}
                className="bg-transparent border-none text-sm w-full outline-none text-slate-800 placeholder-slate-400"
              />
              {busquedaCentro && (
                <button onClick={() => setBusquedaCentro('')}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Filtro Departamento */}
              <select
                value={filtroDep}
                onChange={e => setFiltroDep(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2.5 rounded-lg outline-none"
              >
                <option value="TODOS">Todos los Departamentos</option>
                {departamentos.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Filtro Acreditación */}
              <select
                value={filtroAcreditado}
                onChange={e => setFiltroAcreditado(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2.5 rounded-lg outline-none"
              >
                <option value="TODOS">Acreditación: Todos</option>
                <option value="SI">Acreditados (SI)</option>
                <option value="NO">No Acreditados (NO)</option>
              </select>

              {/* Filtro Saturación */}
              <select
                value={filtroSaturacion}
                onChange={e => setFiltroSaturacion(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2.5 rounded-lg outline-none"
              >
                <option value="TODOS">Saturación: Todas</option>
                <option value="SOBREDEMANDA">Sobredemanda (&gt;100%)</option>
                <option value="ALERTA">Alerta (85% - 100%)</option>
                <option value="DISPONIBLE">Disponible (&lt;85%)</option>
              </select>

              {/* Exportar Excel */}
              <button
                onClick={handleExportarExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2.5 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Tabla de Centros */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">
                Directorio Oficial ({centrosFiltrados.length} centros encontrados)
              </h3>
              <span className="text-xs text-slate-500">
                Fuente: Registro Nacional de CAR (New Report 2026) · Oracle GESTION_DATOS_DB
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Cód.</th>
                    <th className="py-3 px-4">Centro de Acogida Residencial</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4 text-center">Capacidad</th>
                    <th className="py-3 px-4 text-center">Población Activa</th>
                    <th className="py-3 px-4 text-center">% Ocupación</th>
                    <th className="py-3 px-4 text-center">Acreditado</th>
                    <th className="py-3 px-4">Resolución / Vigencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {centrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No se encontraron centros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    centrosFiltrados.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-500">{c.codigo}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{c.nombre}</div>
                          <div className="text-[11px] font-normal text-slate-500">{c.tipo} · {c.unidadLinea || 'USPNNA'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{c.departamento} / {c.provincia}</div>
                          <div className="text-[11px] text-slate-400">{c.distrito} (Ubigeo: {c.ubigeo})</div>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          Instalada: {c.capacidadInstalada} <br/>
                          <span className="text-[11px] text-slate-400">Real: {c.capacidadReal}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-800 text-sm">
                          {c.poblacionActual}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            c.estadoSaturacion === 'SIN_DATO'
                              ? 'bg-slate-100 text-slate-600'
                              : c.estadoSaturacion === 'SOBREDEMANDA'
                              ? 'bg-red-100 text-red-800'
                              : c.estadoSaturacion === 'ALERTA'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.tasaOcupacion === null ? 'SIN DATO' : `${c.tasaOcupacion}%`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.acreditado === 'SI' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> ACREDITADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                              NO ACRED.
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{c.resolucion || '---'}</div>
                          <div className="text-[11px] text-slate-400">Vigencia: {c.vigencia || '-'}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 2: CAR BÁSICO (ANÁLISIS CUANTITATIVO AGREGADO) ──────── */}
      {activeTab === 'basico' && metricasBasico && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Alerta de Desinstitucionalización */}
            <div className="bg-white border border-amber-300 border-l-4 border-l-amber-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                Estancia Prolongada (&gt;18 Meses)
              </h4>
              <div className="text-3xl font-black text-amber-800 tabular-nums">
                {metricasBasico.permanencia.mayor18Meses} NNA
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Representa el <strong>{metricasBasico.permanencia.pctMayor18}%</strong> del total en CAR Básico ({metricasBasico.totalNna} NNA).
              </p>
              <div className="mt-3 bg-amber-50 text-amber-800 text-xs p-2.5 rounded-lg">
                Prioridad de revisión para los equipos de la DPNNA y articulación con UPE para reinserción familiar o adopción.
              </div>
            </div>

            {/* Plan de Trabajo Individual (PTI) */}
            <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 border-l-4 border-l-green-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                PTI registrado
              </h4>
              <div className="text-3xl font-black text-slate-900">
                {metricasBasico.pti.aprobado} NNA
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{metricasBasico.pti.pctAprobado}%</strong> registra respuesta afirmativa en la fuente; no implica vigencia documental.
              </p>
              <div className="mt-3 bg-slate-50 text-slate-600 text-xs p-2.5 rounded-lg flex justify-between">
                <span>No registrado / pendiente:</span>
                <strong className="text-amber-700">{metricasBasico.pti.pendiente} NNA</strong>
              </div>
              {metricasBasico.pti.sinDato > 0 && <div className="text-[11px] text-slate-500 mt-2">Sin dato: {metricasBasico.pti.sinDato}</div>}
            </div>

            {/* Composición por Sexo */}
            <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 border-l-4 border-l-blue-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Distribución por Sexo
              </h4>
              <div className="text-3xl font-black text-slate-900">
                {metricasBasico.demografia.mujeres} <span className="text-sm font-normal text-slate-500">Mujeres</span> / {metricasBasico.demografia.hombres} <span className="text-sm font-normal text-slate-500">Hombres</span>
              </div>
              <div className="mt-4 flex gap-2">
                <div
                  style={{ width: `${roundPct(metricasBasico.demografia.mujeres, metricasBasico.totalNna)}%` }}
                  className="bg-purple-600 h-3 rounded-l-full"
                  title="Mujeres"
                />
                <div
                  style={{ width: `${roundPct(metricasBasico.demografia.hombres, metricasBasico.totalNna)}%` }}
                  className="bg-blue-600 h-3 rounded-r-full"
                  title="Hombres"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Mujeres: {roundPct(metricasBasico.demografia.mujeres, metricasBasico.totalNna)}%</span>
                <span>Hombres: {roundPct(metricasBasico.demografia.hombres, metricasBasico.totalNna)}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-green-200 border-l-4 border-l-green-600 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Con seguro de salud</div>
              <div className="text-2xl font-bold tabular-nums text-green-700 mt-2">{metricasBasico.saludEducacion.conSeguro}</div>
            </div>
            <div className="bg-white border border-red-200 border-l-4 border-l-red-600 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sin seguro de salud</div>
              <div className="text-2xl font-bold tabular-nums text-red-700 mt-2">{metricasBasico.saludEducacion.sinSeguro}</div>
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-slate-500 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discapacidad registrada</div>
              <div className="text-2xl font-bold tabular-nums text-slate-800 mt-2">{metricasBasico.saludEducacion.conDiscapacidad}</div>
              <div className="text-xs text-slate-500 mt-1">Solo registros explícitos de la fuente</div>
            </div>
          </div>

          {/* Gráfico y Top Situación Legal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grupos Etarios */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                Población por Grupos Etarios en CAR Básico
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricasBasico.demografia.gruposEtarios}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="grupo" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Situación Legal */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                Top Causales de Situación Legal (Medidas de Ingreso)
              </h3>
              <div className="space-y-3">
                {metricasBasico.topSituacionLegal.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700 max-w-[80%] line-clamp-2">
                      {item.nombre}
                    </span>
                    <span className="font-black text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded">
                      {item.cantidad} NNA
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <BandejaCentros titulo="Bandeja prioritaria de CAR Básico" tipo="BASICO" filas={bandejas.BASICO} />
        </div>
      )}

      {/* ─── PESTAÑA 3: CAR ESPECIALIZADO (SALUD Y DISCAPACIDAD) ─────────── */}
      {activeTab === 'especializado' && metricasEsp && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Composición por sexo */}
            <div className="bg-gradient-to-br from-white to-violet-50 border border-violet-200 border-l-4 border-l-violet-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-violet-600" />
                Composición del corte
              </h4>
              <div className="text-3xl font-black text-slate-900">
                {metricasEsp.demografia.mujeres} <span className="text-sm font-normal text-slate-500">Mujeres</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {metricasEsp.demografia.hombres} hombres; el indicador evita inferir severidad no registrada por la fuente.
              </p>
            </div>

            {/* Permanencia > 18 meses */}
            <div className="bg-white border border-amber-300 border-l-4 border-l-amber-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Permanencia &gt; 18 Meses
              </h4>
              <div className="text-3xl font-black text-amber-900">
                {metricasEsp.mayor18Meses} NNA
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{metricasEsp.pctMayor18}%</strong> del total en centros especializados ({metricasEsp.totalNna} NNA).
              </p>
            </div>

            {/* Total Población */}
            <div className="bg-gradient-to-br from-white to-violet-50 border border-violet-200 border-l-4 border-l-violet-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                NNA activos especializados
              </h4>
              <div className="text-3xl font-black text-slate-900">
                {metricasEsp.totalNna} NNA
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Registros activos del último corte disponible.
              </p>
            </div>
          </div>

          {/* Centros con Mayor Carga Especializada */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-4">
              Centros especializados con mayor población activa
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metricasEsp.topCentros.map((c, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{c.centro}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Revisar junto con capacidad real y necesidades de atención</div>
                  </div>
                  <div className="text-lg font-black text-violet-700 bg-white border border-violet-200 px-3 py-1 rounded-lg tabular-nums">
                    {c.cantidad}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <BandejaCentros titulo="Necesidades por centro especializado" tipo="ESPECIALIZADO" filas={bandejas.ESPECIALIZADO} />
        </div>
      )}

      {/* ─── PESTAÑA 4: CAR URGENCIA (TRANSITORIEDAD Y DERIVACIONES) ──────── */}
      {activeTab === 'urgencia' && metricasUrg && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Días promedio de estancia */}
            <div className="bg-gradient-to-br from-white to-orange-50 border border-orange-200 border-l-4 border-l-orange-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" />
                Días Promedio de Estancia
              </h4>
              <div className="text-3xl font-black text-slate-900">
                {metricasUrg.diasPromedioEstancia} <span className="text-sm font-normal text-slate-500">días</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tiempo promedio de permanencia transitoria en centros de urgencia.
              </p>
            </div>

            {/* Estancia prolongada > 30 días */}
            <div className="bg-white border border-amber-300 border-l-4 border-l-amber-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                Permanencia sobre umbral (&gt; 30 días)
              </h4>
              <div className="text-3xl font-black text-amber-800 tabular-nums">
                {metricasUrg.estanciaProlongadaUrgencia} NNA
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{metricasUrg.pctProlongada}%</strong> superan el umbral de gestión configurable; requiere revisión, no implica por sí solo incumplimiento.
              </p>
            </div>

            {/* Total Urgencias */}
            <div className="bg-gradient-to-br from-white to-orange-50 border border-orange-200 border-l-4 border-l-orange-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-orange-600" />
                Población Total en Urgencia
              </h4>
              <div className="text-3xl font-black text-slate-900">
                {metricasUrg.totalNna} NNA
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Atención contingente activa en el corte actual.
              </p>
            </div>
            <div className="bg-white border border-orange-200 border-l-4 border-l-orange-600 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-4 h-4" />Composición por sexo</h4>
              <div className="text-2xl font-black text-slate-900 tabular-nums">{metricasUrg.demografia.mujeres} <span className="text-sm font-normal text-slate-500">Mujeres</span></div>
              <div className="text-sm text-slate-600 mt-2">{metricasUrg.demografia.hombres} hombres · {Math.max(metricasUrg.totalNna - metricasUrg.demografia.mujeres - metricasUrg.demografia.hombres, 0)} sin dato</div>
            </div>
          </div>

          {/* Centros de Urgencia */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-4">
              Centros de Acogida Residencial de Urgencia
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metricasUrg.topCentros.map((c, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{c.centro}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Disponibilidad de acogimiento de urgencia</div>
                  </div>
                  <div className="text-lg font-black text-orange-700 bg-white border border-orange-200 px-3 py-1 rounded-lg tabular-nums">
                    {c.cantidad} NNA
                  </div>
                </div>
              ))}
            </div>
          </div>
          <BandejaCentros titulo="Bandeja de permanencia sobre umbral" tipo="URGENCIA" filas={bandejas.URGENCIA} />
        </div>
      )}

      {activeTab === 'cargas' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Gestión de cargas periódicas</h2>
              <p className="text-sm text-slate-300 mt-1">Valida e importa los archivos oficiales y consulta su trazabilidad en Oracle.</p>
            </div>
            <button onClick={() => setModalImportar(true)} className="inline-flex items-center justify-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-4 py-2.5 rounded-lg text-sm font-bold">
              <UploadCloud className="w-4 h-4" /> Nueva carga
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Cargas registradas', cargas.length, 'text-slate-900'],
              ['Exitosas', cargas.filter(c => c.estado === 'EXITOSA').length, 'text-green-700'],
              ['Con observaciones', cargas.filter(c => c.estado === 'OBSERVADA').length, 'text-amber-700'],
              ['Fallidas', cargas.filter(c => c.estado === 'ERROR' || c.estado === 'FALLIDA').length, 'text-red-700'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">{label}</div>
                <div className={`text-3xl font-bold tabular-nums mt-1 ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Historial de cargas</h3>
              <span className="text-xs text-slate-500">Fuente: CAR_CARGAS · Oracle</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead className="bg-slate-100 text-slate-600 uppercase tracking-wide font-semibold">
                  <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Archivo</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Periodo</th><th className="px-4 py-3">Registros</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Estado</th></tr>
                </thead>
                <tbody>
                  {cargas.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No hay historial disponible o el servicio aún no expone las cargas.</td></tr>
                  ) : cargas.map(c => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">{c.fechaCarga ? new Date(c.fechaCarga).toLocaleString('es-PE') : 'Sin dato'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.nombreArchivo}</td>
                      <td className="px-4 py-3">{c.tipoCar}</td><td className="px-4 py-3">{c.periodoCorte}</td><td className="px-4 py-3 tabular-nums">{c.totalRegistros}</td><td className="px-4 py-3">{c.usuario || 'Sistema'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full border font-bold ${c.estado === 'EXITOSA' ? 'bg-green-100 text-green-800 border-green-200' : c.estado === 'OBSERVADA' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{c.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE IMPORTACIÓN PERIÓDICA DE EXCEL ─────────────────────── */}
      {modalImportar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                Importar Corte Periódico DPNNA (Excel)
              </h3>
              <button onClick={() => setModalImportar(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEjecutarImportacion} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Archivo / Catálogo:
                </label>
                <select
                  value={tipoImportacion}
                  onChange={e => setTipoImportacion(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none"
                >
                  <option value="CENTROS">Catálogo de Centros CAR (New Report 2026 - 25 variables)</option>
                  <option value="BASICO">NNA CAR Básico (EDNE CAR BÁSICO - 143 variables)</option>
                  <option value="ESPECIALIZADO">NNA CAR Especializado (EDNE CAR ESP - 141 variables)</option>
                  <option value="URGENCIA">NNA CAR Urgencia (EDNE CAR URGENCIAS - 64 variables)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Periodo del Corte (AAAA-MM o Quincena):
                </label>
                <input
                  type="text"
                  value={periodoImportacion}
                  onChange={e => setPeriodoImportacion(e.target.value)}
                  placeholder="Ej. 2026-06 o 2026-07-Q1"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seleccionar archivo Excel (.xlsx):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={e => setFileToUpload(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  required
                />
              </div>

              {mensajeImportacion && (
                <div className={`p-3 rounded-lg text-xs font-medium ${
                  mensajeImportacion.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {mensajeImportacion.texto}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalImportar(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={importando || !fileToUpload}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-lg shadow-sm transition"
                >
                  {importando && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {importando ? 'Procesando en Oracle...' : 'Iniciar Importación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function BandejaCentros({ titulo, tipo, filas }: { titulo: string; tipo: 'BASICO' | 'ESPECIALIZADO' | 'URGENCIA'; filas: CarBandejaItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div><h3 className="font-bold text-slate-900">{titulo}</h3><p className="text-xs text-slate-500 mt-1">Agregado por centro, sin exponer datos personales de NNA.</p></div>
        <span className="text-xs font-semibold text-slate-500">{filas.length} centros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-semibold">
            <tr><th className="px-4 py-3">Centro</th><th className="px-4 py-3">Departamento</th><th className="px-4 py-3">NNA activos</th><th className="px-4 py-3">Cap. real</th><th className="px-4 py-3">Ocupación</th><th className="px-4 py-3">{tipo === 'URGENCIA' ? 'Sobre umbral' : '>18 meses'}</th>{tipo === 'BASICO' && <><th className="px-4 py-3">PTI pendiente</th><th className="px-4 py-3">Sin seguro</th></>}</tr>
          </thead>
          <tbody>
            {filas.length === 0 ? <tr><td colSpan={tipo === 'BASICO' ? 8 : 6} className="px-4 py-10 text-center text-slate-500">No existen registros para los filtros seleccionados.</td></tr> : filas.map((fila, index) => (
              <tr key={`${fila.codigoCentro || fila.centro}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{fila.centro}</div><div className="text-slate-400">{fila.codigoCentro || 'Sin código'}</div></td>
                <td className="px-4 py-3">{fila.departamento || 'Sin dato'}</td><td className="px-4 py-3 tabular-nums font-bold">{fila.poblacionActiva}</td><td className="px-4 py-3 tabular-nums">{fila.capacidadReal ?? 'Sin dato'}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 font-bold ${fila.ocupacion === null ? 'bg-slate-100 text-slate-600 border-slate-200' : fila.ocupacion > 100 ? 'bg-red-100 text-red-800 border-red-200' : fila.ocupacion >= 85 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-green-100 text-green-800 border-green-200'}`}>{fila.ocupacion === null ? 'Sin dato' : `${fila.ocupacion}%`}</span></td>
                <td className="px-4 py-3 tabular-nums font-bold text-amber-700">{tipo === 'URGENCIA' ? fila.permanenciaSobreUmbral : fila.mayor18}</td>{tipo === 'BASICO' && <><td className="px-4 py-3 tabular-nums">{fila.ptiPendiente}</td><td className="px-4 py-3 tabular-nums">{fila.sinSeguro}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function roundPct(val: number, total: number) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}
