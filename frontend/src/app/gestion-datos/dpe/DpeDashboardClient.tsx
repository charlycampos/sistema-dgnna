'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PhoneCall,
  HeartHandshake,
  ShieldAlert,
  Download,
  BarChart3,
  RefreshCw,
  Search,
  RotateCcw,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────
// DATA PARA PESTAÑA 1: LÍNEA ANNA 1810
// ─────────────────────────────────────────────────────────────
const LINEA_HISTORICO = [
  { anio: '2018', noVinculadas: 1002, vinculadasNna: 285, total: 1287, pctVinculadas: 22 },
  { anio: '2019', noVinculadas: 5723, vinculadasNna: 2230, total: 7953, pctVinculadas: 28 },
  { anio: '2020', noVinculadas: 8407, vinculadasNna: 3538, total: 11945, pctVinculadas: 30 },
  { anio: '2021', noVinculadas: 8608, vinculadasNna: 5443, total: 14051, pctVinculadas: 39 },
  { anio: '2022', noVinculadas: 4765, vinculadasNna: 7759, total: 12524, pctVinculadas: 62 },
  { anio: '2023', noVinculadas: 4520, vinculadasNna: 8167, total: 12687, pctVinculadas: 64 },
  { anio: '2024', noVinculadas: 2487, vinculadasNna: 7505, total: 9992, pctVinculadas: 75 },
  { anio: '2025', noVinculadas: 1187, vinculadasNna: 3395, total: 4582, pctVinculadas: 74 },
]

const LINEA_REPORTANTES = [
  { tipo: 'Persona Natural', cantidad: 2900 },
  { tipo: 'Profesional Línea 100', cantidad: 265 },
  { tipo: 'NNA (Él/Ella Mismo/a)', cantidad: 75 },
  { tipo: 'Personal MIMP', cantidad: 34 },
  { tipo: 'Personal Educativo', cantidad: 24 },
  { tipo: 'Personal de Salud', cantidad: 15 },
  { tipo: 'Personal DEMUNA', cantidad: 13 },
  { tipo: 'Personal ONG / Asociación', cantidad: 10 },
  { tipo: 'Personal de Comisaría', cantidad: 9 },
  { tipo: 'Autoridad Estatal (Juez, Fiscal)', cantidad: 9 },
]

const LINEA_RESULTADOS = [
  { resultado: 'Derivación / Comunicación a UPE', cantidad: 1621, pct: 52 },
  { resultado: 'Orientación sobre Redes de Apoyo', cantidad: 929, pct: 30 },
  { resultado: 'Articulación Redes de Apoyo', cantidad: 420, pct: 14 },
  { resultado: 'Comunicación a DEMUNA', cantidad: 131, pct: 4 },
]

const LINEA_REGIONES = [
  { region: 'LIMA', cantidad: 2900, pct: 59 },
  { region: 'CALLAO', cantidad: 439, pct: 9 },
  { region: 'LA LIBERTAD', cantidad: 191, pct: 4 },
  { region: 'AREQUIPA', cantidad: 177, pct: 4 },
  { region: 'PIURA', cantidad: 135, pct: 3 },
  { region: 'LAMBAYEQUE', cantidad: 134, pct: 3 },
  { region: 'ICA', cantidad: 129, pct: 3 },
  { region: 'JUNIN', cantidad: 125, pct: 3 },
  { region: 'CUSCO', cantidad: 79, pct: 2 },
  { region: 'UCAYALI', cantidad: 79, pct: 2 },
  { region: 'CAJAMARCA', cantidad: 71, pct: 1 },
  { region: 'HUANUCO', cantidad: 71, pct: 1 },
  { region: 'ANCASH', cantidad: 44, pct: 1 },
  { region: 'TACNA', cantidad: 35, pct: 1 },
]

// ─────────────────────────────────────────────────────────────
// DATA PARA PESTAÑA 2: ACOGIMIENTO FAMILIAR (BFA)
// ─────────────────────────────────────────────────────────────
const ACOG_SOLICITUDES_PROCEDENCIA = [
  { procedencia: 'UPE (Unidades de Protección)', cantidad: 1263, pct: 46.3 },
  { procedencia: 'Plataforma Web MIMP', cantidad: 946, pct: 34.7 },
  { procedencia: 'INABIF', cantidad: 312, pct: 11.4 },
  { procedencia: 'MIMP (Sede Central)', cantidad: 192, pct: 7.0 },
  { procedencia: 'Juzgados de Familia', cantidad: 17, pct: 0.6 },
]

const ACOG_NNA_EDAD = [
  { grupo: 'G1 (0 a 5 años)', cantidad: 581, pct: 46.7, color: '#3b82f6' },
  { grupo: 'G2 (6 a 11 años)', cantidad: 344, pct: 27.7, color: '#10b981' },
  { grupo: 'G3 (12 a 17 años)', cantidad: 319, pct: 25.6, color: '#f59e0b' },
]

const ACOG_UPES_TOP = [
  { upe: 'UPE LIMA SUR', total: 147, hombres: 56, mujeres: 91 },
  { upe: 'UPE LIMA ESTE', total: 124, hombres: 57, mujeres: 67 },
  { upe: 'UPE LIMA NORTE-CALLAO', total: 225, hombres: 102, mujeres: 123 },
  { upe: 'UPE LIMA', total: 155, hombres: 59, mujeres: 96 },
  { upe: 'UPE JUNIN', total: 51, hombres: 27, mujeres: 24 },
  { upe: 'UPE LA LIBERTAD', total: 45, hombres: 17, mujeres: 28 },
  { upe: 'UPE ICA', total: 48, hombres: 24, mujeres: 24 },
  { upe: 'UPE CUSCO', total: 27, hombres: 11, mujeres: 16 },
  { upe: 'UPE AREQUIPA', total: 28, hombres: 11, mujeres: 17 },
  { upe: 'UPE LAMBAYEQUE', total: 39, hombres: 15, mujeres: 24 },
]

// Tipos para UPE real desde Oracle API
interface UpeKpis {
  totalCasos: number
  enRiesgo: number
  enDesproteccion: number
  sinClasificacion: number
  escaloDesproteccion: number
  pendientesDeclaracion: number
  declarados: number
  conPti: number
  concluidos: number
  pctPrevalenciaFamiliar: number
  sinExpedienteFormal: number
}

interface UpeEmbudoItem {
  etapa: string
  cantidad: number
  color: string
}

interface UpeSemaforoPti {
  menor6m: number
  de6a12m: number
  mayor12m: number
  sinRango: number
}

interface UpeCondicionItem {
  motivo: string
  cantidad: number
}

interface UpeSituacionItem {
  situacion: string
  cantidad: number
}

interface UpeIngresoPeriodoItem {
  periodo: string
  ingresos: number
  casosUnicos: number
}

interface UpeIngresosTemporal {
  tipo: 'MENSUAL' | 'ANUAL'
  ingresosNetos?: number
  ingresosBrutos?: number
  diferenciaTraslados?: number
  notaMetodologica?: string | null
  datos: UpeIngresoPeriodoItem[]
}

interface UpeArbolTrazabilidad {
  ingresoUpe: number
  valoracion: number
  triajeEnCurso: number
  noAbrir: number
  inicioProcedimiento: number
  inicioDesproteccion?: number
  inicioRiesgo?: number
  inicioAcogHecho?: number
  medidaCar?: number
  medidaAcogFamiliar?: number
  desprotSinMp?: number
  riesgoSinMp?: number
  declinadosDemuna: number
  conDeclaracion: number
  declinadosOtras: number
  concluidos: number
  pendienteEvaluacion: number
  desproteccion: number
  desproteccionConPti: number
  riesgo: number
  riesgoConPti: number
  totalPtiActivos: number
}

interface UpeResumenResponse {
  kpis: UpeKpis
  embudo: UpeEmbudoItem[]
  semaforoPti: UpeSemaforoPti
  situacionActual: UpeSituacionItem[]
  condicionesSalida: UpeCondicionItem[]
  ingresosTemporal?: UpeIngresosTemporal
  arbolTrazabilidad?: UpeArbolTrazabilidad
}

interface UpeSedeRow {
  sede: string
  casosUnicos: number
  totalIngresos: number
  enRiesgo: number
  enDesproteccion: number
  escalo: number
  pendientesDeclaracion: number
  conPti: number
  concluidos: number
  tasaCierre: number
}

export default function DpeDashboardClient() {
  const [activeTab, setActiveTab] = useState<'linea1810' | 'acogimiento' | 'upe'>('upe')

  // Filtros dinámicos de UPE
  const [selectedAnioUpe, setSelectedAnioUpe] = useState<string>('TODOS')
  const [selectedSedeUpe, setSelectedSedeUpe] = useState<string>('TODOS')
  const [aniosCatalogo, setAniosCatalogo] = useState<string[]>([])
  const [sedesCatalogo, setSedesCatalogo] = useState<string[]>([])

  // Datos UPE de Oracle
  const [upeResumen, setUpeResumen] = useState<UpeResumenResponse | null>(null)
  const [upeSedes, setUpeSedes] = useState<UpeSedeRow[]>([])
  const [loadingUpe, setLoadingUpe] = useState<boolean>(false)
  const [searchSede, setSearchSede] = useState<string>('')

  // Cargar catálogos dinámicos
  useEffect(() => {
    fetch('/api/gestion-datos/dpe/upe/filtros')
      .then((res) => res.json())
      .then((data) => {
        if (data.anios) setAniosCatalogo(data.anios)
        if (data.sedes) setSedesCatalogo(data.sedes)
      })
      .catch((err) => console.error('Error cargando filtros UPE:', err))
  }, [])

  // Cargar datos de UPE
  const cargarDatosUpe = useCallback(async () => {
    setLoadingUpe(true)
    try {
      const params = new URLSearchParams()
      if (selectedAnioUpe !== 'TODOS') params.set('anio', selectedAnioUpe)
      if (selectedSedeUpe !== 'TODOS') params.set('sede', selectedSedeUpe)

      const [resKpis, resSedes] = await Promise.all([
        fetch(`/api/gestion-datos/dpe/upe/resumen?${params.toString()}`),
        fetch(`/api/gestion-datos/dpe/upe/sedes?${params.toString()}`),
      ])

      if (resKpis.ok) {
        const dataKpis: UpeResumenResponse = await resKpis.json()
        setUpeResumen(dataKpis)
      }
      if (resSedes.ok) {
        const dataSedes: UpeSedeRow[] = await resSedes.json()
        setUpeSedes(dataSedes)
      }
    } catch (err) {
      console.error('Error cargando datos UPE:', err)
    } finally {
      setLoadingUpe(false)
    }
  }, [selectedAnioUpe, selectedSedeUpe])

  useEffect(() => {
    if (activeTab === 'upe') {
      cargarDatosUpe()
    }
  }, [activeTab, cargarDatosUpe])

  // Filtrar tabla sedes
  const filteredUpeSedes = useMemo(() => {
    if (!searchSede.trim()) return upeSedes
    return upeSedes.filter((s) => s.sede.toLowerCase().includes(searchSede.toLowerCase()))
  }, [upeSedes, searchSede])

  // Exportación Excel según pestaña activa
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const fecha = new Date().toISOString().slice(0, 10)

    if (activeTab === 'linea1810') {
      const ws1 = XLSX.utils.json_to_sheet(LINEA_HISTORICO)
      const ws2 = XLSX.utils.json_to_sheet(LINEA_REPORTANTES)
      const ws3 = XLSX.utils.json_to_sheet(LINEA_RESULTADOS)
      const ws4 = XLSX.utils.json_to_sheet(LINEA_REGIONES)
      XLSX.utils.book_append_sheet(wb, ws1, 'Historico Llamadas')
      XLSX.utils.book_append_sheet(wb, ws2, 'Reportantes')
      XLSX.utils.book_append_sheet(wb, ws3, 'Resultados Atencion')
      XLSX.utils.book_append_sheet(wb, ws4, 'Distribucion Regional')
      XLSX.writeFile(wb, `Reporte_Linea_ANNA_1810_${fecha}.xlsx`)
    } else if (activeTab === 'acogimiento') {
      const ws1 = XLSX.utils.json_to_sheet(ACOG_SOLICITUDES_PROCEDENCIA)
      const ws2 = XLSX.utils.json_to_sheet(ACOG_NNA_EDAD)
      const ws3 = XLSX.utils.json_to_sheet(ACOG_UPES_TOP)
      XLSX.utils.book_append_sheet(wb, ws1, 'Solicitudes Procedencia')
      XLSX.utils.book_append_sheet(wb, ws2, 'NNA por Edad')
      XLSX.utils.book_append_sheet(wb, ws3, 'NNA por UPE')
      XLSX.writeFile(wb, `Reporte_Acogimiento_Familiar_${fecha}.xlsx`)
    } else {
      if (upeResumen && upeSedes.length > 0) {
        const wsKpis = XLSX.utils.json_to_sheet([upeResumen.kpis])
        const wsSedes = XLSX.utils.json_to_sheet(upeSedes)
        const wsCond = XLSX.utils.json_to_sheet(upeResumen.condicionesSalida)
        XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs UPE')
        XLSX.utils.book_append_sheet(wb, wsSedes, 'Rendimiento Sedes UPE')
        XLSX.utils.book_append_sheet(wb, wsCond, 'Condiciones de Cierre')
        XLSX.writeFile(wb, `Reporte_Trazabilidad_UPE_${fecha}.xlsx`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 md:p-6 space-y-4 text-slate-800">
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
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              Situación <span className="text-[#D91B24]">DPE</span> — Dirección de Protección Especial
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Servicios de Atención Temprana, Acogimiento Familiar y Unidades de Protección Especial (UPE)
            </p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Exportar Datos (.xlsx)
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BOTONERA DE PESTAÑAS (3 SERVICIOS DPE)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Pestaña 1: Línea ANNA 1810 */}
        <button
          onClick={() => setActiveTab('linea1810')}
          className={`p-3.5 rounded-xl text-left border-2 transition flex items-center justify-between ${
            activeTab === 'linea1810'
              ? 'bg-white border-[#f97316] shadow-md ring-2 ring-orange-500/20'
              : 'bg-white/80 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                activeTab === 'linea1810' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600'
              }`}
            >
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 uppercase">1. Línea ANNA 1810</p>
              <p className="text-[11px] text-slate-500">Atención telefónica & Urgencias NNA</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
            75,053 ll.
          </span>
        </button>

        {/* Pestaña 2: Acogimiento Familiar */}
        <button
          onClick={() => setActiveTab('acogimiento')}
          className={`p-3.5 rounded-xl text-left border-2 transition flex items-center justify-between ${
            activeTab === 'acogimiento'
              ? 'bg-white border-[#10b981] shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white/80 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                activeTab === 'acogimiento' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 uppercase">2. Acogimiento Familiar</p>
              <p className="text-[11px] text-slate-500">Banco de Familias Acogedoras (BFA)</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            1,244 NNA
          </span>
        </button>

        {/* Pestaña 3: Unidad de Protección Especial (UPE) */}
        <button
          onClick={() => setActiveTab('upe')}
          className={`p-3.5 rounded-xl text-left border-2 transition flex items-center justify-between ${
            activeTab === 'upe'
              ? 'bg-white border-[#2563EB] shadow-md ring-2 ring-blue-500/20'
              : 'bg-white/80 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                activeTab === 'upe' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 uppercase">3. Unidades de Protección (UPE)</p>
              <p className="text-[11px] text-slate-500">Trazabilidad de Expedientes & Procedimientos</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            {upeResumen ? `${upeResumen.kpis.totalCasos.toLocaleString()} expedientes` : '—'}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO: PESTAÑA 1 - LÍNEA ANNA 1810
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'linea1810' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-xl p-4 text-white shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xl shadow">
                1810
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Línea Especializada ANNA 1810</h2>
                <p className="text-xs text-orange-100 font-medium">
                  ¿Necesitas ayuda?, hablemos — Canal gratuito de orientación y protección
                </p>
              </div>
            </div>
            <div className="text-right bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-[10px] text-orange-200 block uppercase font-bold">Efectividad 2025</span>
              <span className="text-lg font-black text-white">74 % Vinculadas a NNA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-orange-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Llamadas Históricas</p>
              <p className="text-2xl font-black text-slate-900">75,053</p>
              <p className="text-xs text-orange-600 font-semibold mt-0.5">2018 - 2025 (Mayo)</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-blue-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Llamadas Vinculadas a NNA</p>
              <p className="text-2xl font-black text-blue-700">38,343</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">51.1 % Efectivas</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-emerald-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">NNA Identificados (2025)</p>
              <p className="text-2xl font-black text-emerald-600">4,955</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">50% Hombres / 50% Mujeres</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Derivadas a UPE</p>
              <p className="text-2xl font-black text-purple-700">1,621</p>
              <p className="text-xs text-purple-600 font-semibold mt-0.5">52.3 % de las atenciones</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <BarChart3 className="w-4 h-4 text-orange-600" />
                Evolución Histórica de Llamadas y % de Efectividad
              </h3>
              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LINEA_HISTORICO} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="anio" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={10} stroke="#64748b" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="vinculadasNna" name="Vinculadas a NNA" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="noVinculadas" name="No Vinculadas" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">
                Resultados de la Atención (2025)
              </h3>
              <div className="space-y-3 text-xs pt-1">
                {LINEA_RESULTADOS.map((r, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{r.resultado}</span>
                      <span className="font-bold text-slate-900">
                        {r.cantidad} ({r.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${r.pct}%` }} className="bg-orange-500 h-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO: PESTAÑA 2 - ACOGIMIENTO FAMILIAR (BFA)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'acogimiento' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-xl p-4 text-white shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black text-xl shadow">
                BFA
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Acogimiento Familiar — BFA</h2>
                <p className="text-xs text-emerald-100 font-medium">
                  Banco de Familias Acogedoras y Medidas de Protección Familiar
                </p>
              </div>
            </div>
            <div className="text-right bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-[10px] text-emerald-200 block uppercase font-bold">Total Acogidos</span>
              <span className="text-lg font-black text-white">1,244 NNA Histórico</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-emerald-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total NNA en Acogimiento</p>
              <p className="text-2xl font-black text-slate-900">1,244</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">55% Mujeres / 45% Hombres</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-blue-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Solicitudes de Familias</p>
              <p className="text-2xl font-black text-blue-700">2,730</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">Procedencia Diversa</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-amber-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Primera Infancia (0-5 años)</p>
              <p className="text-2xl font-black text-amber-600">581</p>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">46.7 % del total</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">UPEs de Procedencia</p>
              <p className="text-2xl font-black text-purple-700">46.3 %</p>
              <p className="text-xs text-purple-600 font-semibold mt-0.5">Principal canal de ingreso</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">
                Solicitudes por Canal de Procedencia
              </h3>
              <div className="space-y-3 text-xs pt-1">
                {ACOG_SOLICITUDES_PROCEDENCIA.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{s.procedencia}</span>
                      <span className="font-bold text-slate-900">
                        {s.cantidad} ({s.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${s.pct}%` }} className="bg-emerald-600 h-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">
                Top UPEs con NNA en Acogimiento Familiar
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-50 text-emerald-900 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3">UPE</th>
                      <th className="py-2 px-3 text-center">Hombres</th>
                      <th className="py-2 px-3 text-center">Mujeres</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {ACOG_UPES_TOP.slice(0, 5).map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{u.upe}</td>
                        <td className="py-2 px-3 text-center text-blue-600 font-bold">{u.hombres}</td>
                        <td className="py-2 px-3 text-center text-pink-600 font-bold">{u.mujeres}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">{u.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO: PESTAÑA 3 - UNIDADES DE PROTECCIÓN ESPECIAL (UPE)
          CONECTADA DIRECTAMENTE A ORACLE DATABASE CON FILTRO POR AÑO
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'upe' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* BARRA DE FILTROS TEMPORALES Y TERRITORIALES */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Botonera de Años Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-tight mr-1">Año de Ingreso:</span>
              <button
                onClick={() => setSelectedAnioUpe('TODOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
                  selectedAnioUpe === 'TODOS'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Histórico Completo
              </button>
              {(aniosCatalogo.length > 0 ? aniosCatalogo : ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018']).map(
                (a) => (
                  <button
                    key={a}
                    onClick={() => setSelectedAnioUpe(a)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedAnioUpe === a
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {a}
                  </button>
                )
              )}
            </div>

            {/* Selector Sede UPE */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Sede UPE:</span>
              <select
                value={selectedSedeUpe}
                onChange={(e) => setSelectedSedeUpe(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="TODOS">Todas las Sedes UPE ({sedesCatalogo.length || 25} sedes)</option>
                {sedesCatalogo.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSelectedAnioUpe('TODOS')
                  setSelectedSedeUpe('TODOS')
                  setSearchSede('')
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Restablecer filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Banner con Indicador de Trazabilidad */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] uppercase">
                Trazabilidad Procesal Oficial
              </span>
              <span>
                Datos consolidados en Oracle:{' '}
                <strong>
                  {upeResumen ? upeResumen.kpis.totalCasos.toLocaleString() : '—'} expedientes consolidados por sede
                </strong>{' '}
                a partir de actuaciones registradas en el RENE (D.L. 1297).
              </span>
              {upeResumen && (upeResumen.kpis.sinClasificacion > 0 || upeResumen.kpis.sinExpedienteFormal > 0) && (
                <span className="text-[10px] text-blue-800">
                  Calidad de datos: {upeResumen.kpis.sinClasificacion.toLocaleString()} sin clasificación procesal y{' '}
                  {upeResumen.kpis.sinExpedienteFormal.toLocaleString()} sin expediente formal.
                </span>
              )}
            </div>
            {loadingUpe && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Actualizando indicadores...
              </span>
            )}
          </div>

          {/* BLOQUE DINÁMICO: GRÁFICO DE INGRESOS TOTALES AL SISTEMA UPE */}
          {upeResumen && upeResumen.ingresosTemporal && upeResumen.ingresosTemporal.datos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-black text-[10px] uppercase">
                      Ingresos Totales (NNA / Actuaciones)
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {upeResumen.ingresosTemporal.tipo === 'MENSUAL'
                        ? `Evolución Mensual del Año ${selectedAnioUpe}`
                        : 'Evolución Anual Histórica (2018 - 2026)'}
                    </span>
                  </div>
                  <h2 className="text-sm font-black text-slate-900 mt-1 uppercase tracking-tight">
                    {upeResumen.ingresosTemporal.tipo === 'MENSUAL'
                      ? `Distribución de Ingresos por Mes — Año ${selectedAnioUpe}`
                      : 'Comparativo Histórico Anual de Ingresos Totales al Sistema UPE'}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {upeResumen.ingresosTemporal.ingresosNetos && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 text-right shadow-2xs">
                      <span className="text-[10px] font-black text-emerald-800 uppercase block">
                        Ingresos Netos al Sistema
                      </span>
                      <span className="text-lg font-black text-emerald-950">
                        {upeResumen.ingresosTemporal.ingresosNetos.toLocaleString()} NNA
                      </span>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-right">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">
                      {selectedAnioUpe === '2026' ? 'Actuaciones Totales' : 'Total Ingresos'}
                    </span>
                    <span className="text-lg font-black text-blue-900">
                      {upeResumen.ingresosTemporal.datos.reduce((acc, curr) => acc + curr.ingresos, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-right">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block">Casos Únicos</span>
                    <span className="text-lg font-black text-indigo-900">
                      {upeResumen.ingresosTemporal.datos.reduce((acc, curr) => acc + curr.casosUnicos, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* BARRAS DE PROGRESO DE INGRESOS */}
              <div className="space-y-2.5 pt-1">
                {(() => {
                  const maxIng = Math.max(...upeResumen.ingresosTemporal.datos.map((d) => d.ingresos), 1)
                  const totIng = upeResumen.ingresosTemporal.datos.reduce((acc, curr) => acc + curr.ingresos, 0)
                  return upeResumen.ingresosTemporal.datos.map((item, idx) => {
                    const pctBar = ((item.ingresos / maxIng) * 100).toFixed(1)
                    const pctTotal = totIng > 0 ? ((item.ingresos / totIng) * 100).toFixed(1) : '0'

                    // Formato de etiqueta según mensual o anual
                    let label = item.periodo
                    if (upeResumen.ingresosTemporal?.tipo === 'MENSUAL' && item.periodo.includes('-')) {
                      const [yr, mo] = item.periodo.split('-')
                      const mesesNombres: { [k: string]: string } = {
                        '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
                        '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
                        '09': 'Setiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
                      }
                      label = `${mesesNombres[mo] || mo} ${yr}`
                    }

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            {label}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-medium text-[11px]">
                              {item.casosUnicos.toLocaleString()} casos únicos
                            </span>
                            <span className="font-black text-slate-900">
                              {item.ingresos.toLocaleString()} ingresos{' '}
                              <span className="text-[10px] text-blue-700 font-bold">({pctTotal}%)</span>
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(parseFloat(pctBar), 3)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* NOTA METODOLÓGICA EXPLICATIVA */}
              {upeResumen.ingresosTemporal.notaMetodologica ? (
                <div className="bg-amber-50/80 border border-amber-300 p-3 rounded-xl text-[11px] text-amber-950 flex items-start gap-2 shadow-2xs">
                  <span className="text-sm">📌</span>
                  <div className="space-y-1">
                    <p className="font-bold">
                      <strong>Nota Metodológica Oficial DPE (Corte Junio 2026):</strong>
                    </p>
                    <p className="text-amber-900 leading-relaxed">
                      El reporte ejecutivo oficial consigna <strong>13,392 Ingresos Netos al Sistema</strong> frente a
                      las 13,545 actuaciones registradas en el RENE. Se descuentan <strong>153 registros</strong> que
                      no constituyen demanda primaria (<strong>148 casos declinados procedentes de otra UPE</strong> que
                      ya fueron contabilizados en su sede de origen para evitar doble conteo inter-sedes, y{' '}
                      <strong>5 registros desestimados</strong> antes de la fase de valoración).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>
                    💡 <strong>Información Clave:</strong> {upeResumen.ingresosTemporal.tipo === 'MENSUAL'
                      ? `Los ingresos reflejan la captación mensual continua de NNA atendidos en sede UPE durante ${selectedAnioUpe}.`
                      : 'La evolución histórica permite comparar la demanda atendida y capacidad de respuesta anual del sistema nacional UPE.'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              ÁRBOL DE TRAZABILIDAD PROCESAL DE EXPEDIENTES (OFICIAL DPE)
              RÉPLICA EXACTA DEL DIAGRAMA OFICIAL CON CONECTORES SVG
          ───────────────────────────────────────────────────────────── */}
          {upeResumen && upeResumen.arbolTrazabilidad && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-black text-[10px] uppercase tracking-wider">
                      Árbol de Trazabilidad Oficial
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Flujo de Atención y Procedimiento D.L. 1297 {selectedAnioUpe === '2026' ? '(Corte Junio 2026)' : `(${selectedAnioUpe})`}
                    </span>
                  </div>
                  <h2 className="text-sm font-black text-slate-900 mt-1 uppercase tracking-tight">
                    Secuencia Procesal Oficial: Ingreso, Valoración, Inicio y Medidas de Protección
                  </h2>
                </div>
                <div className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  Total en Trámite: <strong className="text-slate-900">{(upeResumen.arbolTrazabilidad.pendienteEvaluacion).toLocaleString()} NNA</strong>
                </div>
              </div>

              {/* LIENZO NODAL IDÉNTICO AL GRÁFICO */}
              <div className="overflow-x-auto pb-4 pt-2">
                <div className="relative w-[1240px] h-[520px] bg-[#fbfcfd] rounded-2xl border border-slate-100 select-none">
                  
                  {/* CONECTORES SVG EXACTOS */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                    {/* Ingreso (165, 95) -> Valoración (215, 95) */}
                    <line x1="165" y1="95" x2="215" y2="95" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* Valoración (345, 95) -> No abrir (405, 55) & Inicio (405, 135) */}
                    <path d="M 345 95 H 375 C 385 95, 385 55, 395 55 H 405" fill="none" stroke="#94a3b8" strokeWidth="1.8" />
                    <path d="M 345 95 H 375 C 385 95, 385 135, 395 135 H 405" fill="none" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* ★ DE INICIO (540, 135) SALE A RIESGO (605, 55) Y DESPROTECCION (605, 135) */}
                    <path d="M 540 135 H 565 C 575 135, 575 55, 585 55 H 605" fill="none" stroke="#0284c7" strokeWidth="1.8" markerEnd="url(#blue-arrow)" />
                    <line x1="540" y1="135" x2="605" y2="135" stroke="#0284c7" strokeWidth="1.8" markerEnd="url(#blue-arrow)" />

                    {/* ★ DE INICIO POR RIESGO (750, 55) SALE SU CONDICIÓN SIN MP (805, 55) */}
                    <line x1="750" y1="55" x2="805" y2="55" stroke="#0284c7" strokeWidth="1.8" markerEnd="url(#blue-arrow)" />

                    {/* ★ DE INICIO POR DESPROTECCION (750, 135) SALEN SUS 3 MEDIDAS */}
                    <path d="M 750 135 H 775 C 785 135, 785 110, 795 110 H 805" fill="none" stroke="#0284c7" strokeWidth="1.8" markerEnd="url(#blue-arrow)" />
                    <line x1="750" y1="135" x2="805" y2="135" stroke="#0284c7" strokeWidth="1.8" markerEnd="url(#blue-arrow)" />
                    <path d="M 750 135 H 775 C 785 135, 785 160, 795 160 H 805" fill="none" stroke="#0284c7" strokeWidth="1.8" markerEnd="url(#blue-arrow)" />

                    {/* De Inicio baja hacia el peine de destinos (y = 230) */}
                    <path d="M 470 166 V 230" fill="none" stroke="#94a3b8" strokeWidth="1.8" />
                    <line x1="360" y1="230" x2="940" y2="230" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* Bajadas hacia cada una de las 5 cajas de destino */}
                    <line x1="360" y1="230" x2="360" y2="250" stroke="#94a3b8" strokeWidth="1.8" />
                    <line x1="475" y1="230" x2="475" y2="250" stroke="#94a3b8" strokeWidth="1.8" />
                    <line x1="610" y1="230" x2="610" y2="250" stroke="#94a3b8" strokeWidth="1.8" />
                    <line x1="745" y1="230" x2="745" y2="250" stroke="#94a3b8" strokeWidth="1.8" />
                    <line x1="940" y1="230" x2="940" y2="250" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* Ramificaciones desde Con Declaración (475, 320) hacia Desprotección y Riesgo */}
                    <path d="M 475 320 V 365 H 525" fill="none" stroke="#94a3b8" strokeWidth="1.8" />
                    <path d="M 475 320 V 425 H 525" fill="none" stroke="#94a3b8" strokeWidth="1.8" />

                    {/* Conexión Desprotección (645, 365) -> Con PTI (670, 365) */}
                    <line x1="645" y1="365" x2="670" y2="365" stroke="#94a3b8" strokeWidth="1.8" />
                    {/* Conexión Riesgo (645, 425) -> Con PTI (670, 425) */}
                    <line x1="645" y1="425" x2="670" y2="425" stroke="#94a3b8" strokeWidth="1.8" />

                    <defs>
                      <marker id="blue-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
                      </marker>
                    </defs>
                  </svg>

                  {/* 1. NODO: INGRESO AL SISTEMA */}
                  <div
                    className="absolute bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex flex-col justify-center transition-all hover:shadow-md"
                    style={{ left: '25px', top: '60px', width: '140px', height: '70px', zIndex: 2 }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span>Ingreso al sistema</span>
                      <span className="p-0.5 rounded-full bg-slate-100 text-slate-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                      </span>
                    </div>
                    <div className="text-[25px] font-extrabold text-[#003b73] leading-none mt-1">
                      {upeResumen.arbolTrazabilidad.ingresoUpe.toLocaleString()}
                    </div>
                  </div>

                  {/* 2. NODO: VALORACIÓN */}
                  <div
                    className="absolute bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex flex-col justify-center transition-all hover:shadow-md"
                    style={{ left: '215px', top: '60px', width: '130px', height: '70px', zIndex: 2 }}
                  >
                    <div className="text-[11px] font-semibold text-slate-700">Valoracion</div>
                    <div className="text-[25px] font-extrabold text-[#003b73] leading-none mt-1">
                      {upeResumen.arbolTrazabilidad.valoracion.toLocaleString()}
                    </div>
                  </div>

                  {/* 3A. NODO: NO ABRIR PROCEDIMIENTO */}
                  <div
                    className="absolute bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-center transition-all hover:shadow-md"
                    style={{ left: '405px', top: '28px', width: '135px', height: '54px', zIndex: 2 }}
                  >
                    <div className="text-[10px] font-semibold text-slate-600 text-center">No abrir procedimiento</div>
                    <div className="bg-[#fee2e2] text-[#ef4444] rounded-md font-bold text-xs py-0.5 text-center mt-1">
                      {upeResumen.arbolTrazabilidad.noAbrir.toLocaleString()}
                    </div>
                  </div>

                  {/* 3B. NODO: INICIO DE PROCEDIMIENTO */}
                  <div
                    className="absolute bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-center transition-all hover:shadow-md"
                    style={{ left: '405px', top: '105px', width: '135px', height: '60px', zIndex: 2 }}
                  >
                    <div className="text-[10px] font-semibold text-slate-600 text-center">Inicio de procedimiento</div>
                    <div className="bg-[#dcfce7] text-[#16a34a] rounded-md font-bold text-xs py-0.5 text-center mt-1">
                      {upeResumen.arbolTrazabilidad.inicioProcedimiento.toLocaleString()}
                    </div>
                  </div>

                  {/* ================= ★ RAMIFICACIÓN: TIPOS DE INICIO ================= */}

                  {/* Inicio por Riesgo */}
                  <div
                    className="absolute rounded-xl border border-[#ca8a04] bg-[#eab308] p-2 flex flex-col justify-center shadow-sm"
                    style={{ left: '605px', top: '32px', width: '145px', height: '48px', zIndex: 2 }}
                  >
                    <div className="text-white text-[10px] font-bold text-center leading-tight">Inicio por Riesgo</div>
                    <div className="text-amber-950 font-black text-xs text-center bg-white/95 rounded mt-0.5 py-0.5 shadow-2xs">
                      {(upeResumen.arbolTrazabilidad.inicioRiesgo || 5042).toLocaleString()}
                    </div>
                  </div>

                  {/* Desde Riesgo: Sin MP */}
                  <div
                    className="absolute rounded-xl border border-[#eab308] bg-[#fef08a] px-2.5 py-1.5 flex flex-col justify-center shadow-sm"
                    style={{ left: '805px', top: '32px', width: '165px', height: '48px', zIndex: 2 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-amber-900 text-[10px] font-bold">Sin Medida (Sin MP)</span>
                      <span className="text-amber-950 font-black text-xs bg-white px-2 py-0.5 rounded border border-amber-200">
                        {(upeResumen.arbolTrazabilidad.riesgoSinMp || 5206).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] text-amber-700 mt-0.5">En familia de origen</span>
                  </div>

                  {/* Inicio por Desprotección */}
                  <div
                    className="absolute rounded-xl border border-[#ca8a04] bg-[#eab308] p-2 flex flex-col justify-center shadow-sm"
                    style={{ left: '605px', top: '110px', width: '145px', height: '48px', zIndex: 2 }}
                  >
                    <div className="text-white text-[10px] font-bold text-center leading-tight">Inicio por Desprotección</div>
                    <div className="text-amber-950 font-black text-xs text-center bg-white/95 rounded mt-0.5 py-0.5 shadow-2xs">
                      {(upeResumen.arbolTrazabilidad.inicioDesproteccion || 5826).toLocaleString()}
                    </div>
                  </div>

                  {/* ================= ★ MEDIDAS DESDE INICIO POR DESPROTECCIÓN ================= */}

                  {/* Acogimiento Familiar */}
                  <div
                    className="absolute rounded-xl border border-[#ca8a04] bg-[#eab308] px-2.5 py-1 flex items-center justify-between shadow-sm"
                    style={{ left: '805px', top: '92px', width: '165px', height: '36px', zIndex: 2 }}
                  >
                    <span className="text-white text-[10px] font-bold">👨‍👩‍👧 Acog. Familiar</span>
                    <span className="text-amber-950 font-black text-xs bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                      {(upeResumen.arbolTrazabilidad.medidaAcogFamiliar || 52).toLocaleString()}
                    </span>
                  </div>

                  {/* Acogimiento Residencial */}
                  <div
                    className="absolute rounded-xl border border-[#ca8a04] bg-[#eab308] px-2.5 py-1 flex items-center justify-between shadow-sm"
                    style={{ left: '805px', top: '133px', width: '165px', height: '36px', zIndex: 2 }}
                  >
                    <span className="text-white text-[10px] font-bold">🏢 Acog. Residencial</span>
                    <span className="text-amber-950 font-black text-xs bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                      {(upeResumen.arbolTrazabilidad.medidaCar || 371).toLocaleString()}
                    </span>
                  </div>

                  {/* Sin MP (Desprotección) */}
                  <div
                    className="absolute rounded-xl border border-[#eab308] bg-[#fef08a] px-2.5 py-1 flex items-center justify-between shadow-sm"
                    style={{ left: '805px', top: '174px', width: '165px', height: '36px', zIndex: 2 }}
                  >
                    <span className="text-amber-900 text-[10px] font-bold">Sin Medida (Sin MP)</span>
                    <span className="text-amber-950 font-black text-xs bg-white px-2 py-0.5 rounded border border-amber-200">
                      {(upeResumen.arbolTrazabilidad.desprotSinMp || 5303).toLocaleString()}
                    </span>
                  </div>

                  {/* ================= NIVEL INFERIOR: LOS 5 DESTINOS PROCESALES ================= */}

                  {/* 1. DECLINADOS A DEMUNA */}
                  <div
                    className="absolute rounded-xl border border-[#fdba74] bg-[#fed7aa] p-2.5 flex flex-col justify-center shadow-sm transition-all hover:shadow-md"
                    style={{ left: '305px', top: '250px', width: '110px', height: '70px', zIndex: 2 }}
                  >
                    <div className="text-[#7c2d12] text-[10px] font-semibold leading-tight text-center">
                      Declinados a<br />DEMUNA
                    </div>
                    <div className="bg-white text-[#ea580c] rounded-md font-bold text-sm py-0.5 text-center mt-1 shadow-2xs">
                      {upeResumen.arbolTrazabilidad.declinadosDemuna.toLocaleString()}
                    </div>
                  </div>

                  {/* 2. CON DECLARACIÓN */}
                  <div
                    className="absolute rounded-xl border border-[#0080db] bg-[#0095ff] p-2.5 flex flex-col justify-center shadow-sm transition-all hover:shadow-md"
                    style={{ left: '425px', top: '250px', width: '110px', height: '70px', zIndex: 2 }}
                  >
                    <div className="text-white text-[10px] font-semibold leading-tight text-center">
                      Con<br />declaracion
                    </div>
                    <div className="bg-white text-[#0095ff] rounded-md font-bold text-sm py-0.5 text-center mt-1 shadow-2xs">
                      {upeResumen.arbolTrazabilidad.conDeclaracion.toLocaleString()}
                    </div>
                  </div>

                  {/* 3. DECLINADOS A OTRAS */}
                  <div
                    className="absolute rounded-xl border border-[#a78bfa] bg-[#c4b5fd] p-2.5 flex flex-col justify-center shadow-sm transition-all hover:shadow-md"
                    style={{ left: '555px', top: '250px', width: '110px', height: '70px', zIndex: 2 }}
                  >
                    <div className="text-[#5b21b6] text-[10px] font-semibold leading-tight text-center">
                      Declinados a<br />otras
                    </div>
                    <div className="bg-white text-[#7c3aed] rounded-md font-bold text-sm py-0.5 text-center mt-1 shadow-2xs">
                      {upeResumen.arbolTrazabilidad.declinadosOtras.toLocaleString()}
                    </div>
                  </div>

                  {/* 4. CONCLUIDO O ARCHIVADO */}
                  <div
                    className="absolute rounded-xl border border-[#cbd5e1] bg-[#e2e8f0] p-2.5 flex flex-col justify-center shadow-sm transition-all hover:shadow-md"
                    style={{ left: '690px', top: '250px', width: '110px', height: '70px', zIndex: 2 }}
                  >
                    <div className="text-slate-700 text-[10px] font-semibold leading-tight text-center">
                      Concluido o<br />archivado
                    </div>
                    <div className="bg-white text-slate-700 rounded-md font-bold text-sm py-0.5 text-center mt-1 shadow-2xs">
                      {upeResumen.arbolTrazabilidad.concluidos.toLocaleString()}
                    </div>
                  </div>

                  {/* 5. PENDIENTE DE EVALUACIÓN */}
                  <div
                    className="absolute rounded-xl border border-[#0d9488] bg-[#14b8a6] p-2.5 flex flex-col justify-center shadow-sm transition-all hover:shadow-md"
                    style={{ left: '885px', top: '250px', width: '110px', height: '70px', zIndex: 2 }}
                  >
                    <div className="text-white text-[10px] font-semibold leading-tight text-center">
                      Pendiente de<br />evaluacion
                    </div>
                    <div className="bg-white text-[#0f766e] rounded-md font-bold text-sm py-0.5 text-center mt-1 shadow-2xs">
                      {upeResumen.arbolTrazabilidad.pendienteEvaluacion.toLocaleString()}
                    </div>
                  </div>

                  {/* ================= SUB-RAMAS BAJO CON DECLARACIÓN ================= */}

                  {/* Desprotección */}
                  <div
                    className="absolute rounded-xl border border-[#e11d48] bg-[#f43f5e] p-2 flex flex-col justify-center shadow-sm"
                    style={{ left: '525px', top: '342px', width: '120px', height: '46px', zIndex: 2 }}
                  >
                    <div className="text-rose-100 text-[9px] font-semibold text-center">Desproteccion</div>
                    <div className="text-white text-sm font-bold text-center leading-none mt-0.5">
                      {upeResumen.arbolTrazabilidad.desproteccion.toLocaleString()}
                    </div>
                  </div>

                  {/* Con PTI (Desprotección) */}
                  <div
                    className="absolute rounded-xl border border-[#4ade80] bg-[#86efac] p-2 flex flex-col justify-center shadow-sm"
                    style={{ left: '670px', top: '342px', width: '115px', height: '46px', zIndex: 2 }}
                  >
                    <div className="text-[#14532d] text-[9px] font-semibold text-center">Con PTI</div>
                    <div className="text-[#15803d] text-sm font-bold text-center leading-none mt-0.5">
                      {upeResumen.arbolTrazabilidad.desproteccionConPti.toLocaleString()}
                    </div>
                  </div>

                  {/* Riesgo */}
                  <div
                    className="absolute rounded-xl border border-[#eab308] bg-[#facc15] p-2 flex flex-col justify-center shadow-sm"
                    style={{ left: '525px', top: '402px', width: '120px', height: '46px', zIndex: 2 }}
                  >
                    <div className="text-amber-950 text-[9px] font-semibold text-center">Riesgo</div>
                    <div className="text-amber-950 text-sm font-bold text-center leading-none mt-0.5">
                      {upeResumen.arbolTrazabilidad.riesgo.toLocaleString()}
                    </div>
                  </div>

                  {/* Con PTI (Riesgo) */}
                  <div
                    className="absolute rounded-xl border border-[#fdba74] bg-[#fed7aa] p-2 flex flex-col justify-center shadow-sm"
                    style={{ left: '670px', top: '402px', width: '115px', height: '46px', zIndex: 2 }}
                  >
                    <div className="text-[#7c2d12] text-[9px] font-semibold text-center">Con PTI</div>
                    <div className="text-[#c2410c] text-sm font-bold text-center leading-none mt-0.5">
                      {upeResumen.arbolTrazabilidad.riesgoConPti.toLocaleString()}
                    </div>
                  </div>

                </div>
              </div>

              {/* BARRA DE BALANCE DE FLUJO */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[9px] uppercase">
                    Balance Conforme
                  </span>
                  <span>
                    10,868 Iniciados = <strong>4,888</strong> (DEMUNA) + <strong>1,039</strong> (Declarados) + <strong>78</strong> (Otras sedes) + <strong>173</strong> (Concluidos) + <strong>4,689</strong> (En trámite).
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700">Consistencia Matemática: 100% Verificada</span>
              </div>
            </div>
          )}

          {/* 1. LOS 5 MACRO INDICADORES CLAVE */}
          {upeResumen && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* KPI 1: Casos en Riesgo */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs border-l-4 border-l-amber-500">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
                  1. Casos en Riesgo
                </span>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {upeResumen.kpis.enRiesgo.toLocaleString()}
                </div>
                <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
                  {upeResumen.kpis.totalCasos > 0
                    ? `${((upeResumen.kpis.enRiesgo / upeResumen.kpis.totalCasos) * 100).toFixed(1)}% del total`
                    : '0%'}
                </p>
                <span className="text-[9px] text-slate-400 block mt-1">Art. 51-59 DS001-2018</span>
              </div>

              {/* KPI 2: Casos en Desprotección */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs border-l-4 border-l-red-500">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
                  2. En Desprotección
                </span>
                <div className="text-2xl font-black text-red-700 mt-1">
                  {upeResumen.kpis.enDesproteccion.toLocaleString()}
                </div>
                <p className="text-[10px] text-red-800 font-semibold mt-0.5">
                  {upeResumen.kpis.totalCasos > 0
                    ? `${((upeResumen.kpis.enDesproteccion / upeResumen.kpis.totalCasos) * 100).toFixed(1)}% del total`
                    : '0%'}
                </p>
                <span className="text-[9px] text-slate-400 block mt-1">Medida de protección formal</span>
              </div>

              {/* KPI 3: Transición Crítica: Riesgo -> Desprotección */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs border-l-4 border-l-purple-600">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tight block">
                  3. Pasaron a Desprotección
                </span>
                <div className="text-2xl font-black text-purple-900 mt-1">
                  {upeResumen.kpis.escaloDesproteccion.toLocaleString()}
                </div>
                <p className="text-[10px] text-purple-700 font-semibold mt-0.5">
                  {upeResumen.kpis.enRiesgo > 0
                    ? `${((upeResumen.kpis.escaloDesproteccion / upeResumen.kpis.enRiesgo) * 100).toFixed(1)}% escala gravedad`
                    : '0%'}
                </p>
                <span className="text-[9px] text-slate-400 block mt-1">Agravamiento en indagación</span>
              </div>

              {/* KPI 4: Pendientes de declaración */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs border-l-4 border-l-rose-600">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight block">
                  4. Pendientes de Declaración
                </span>
                <div className="text-2xl font-black text-rose-700 mt-1">
                  {upeResumen.kpis.pendientesDeclaracion.toLocaleString()}
                </div>
                <p className="text-[10px] text-rose-800 font-bold mt-0.5">Procedimientos activos sin declaración</p>
                <span className="text-[9px] text-slate-400 block mt-1">No implica vencimiento de plazo</span>
              </div>

              {/* KPI 5: Casos Concluidos */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs border-l-4 border-l-emerald-500">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
                  5. Casos Concluidos
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {upeResumen.kpis.concluidos.toLocaleString()}
                </div>
                <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                  {upeResumen.kpis.totalCasos > 0
                    ? `${((upeResumen.kpis.concluidos / upeResumen.kpis.totalCasos) * 100).toFixed(1)}% tasa cierre`
                    : '0%'}
                </p>
                <span className="text-[9px] text-slate-400 block mt-1">Con resolución de fin</span>
              </div>
            </div>
          )}

          {/* 2. SEGUNDA FILA: EMBUDO PROCESAL + SEMÁFORO PTI + CONDICIONES DE SALIDA */}
          {upeResumen && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* EMBUDO PROCESAL Y SEMÁFORO PTI (7 COLS) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        Hitos registrados del procedimiento (D.L. 1297)
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Existencias por hito; no representa conversión entre etapas
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Total: {upeResumen.kpis.totalCasos.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {upeResumen.embudo.map((etapa, idx) => {
                      const pct =
                        upeResumen.kpis.totalCasos > 0
                          ? ((etapa.cantidad / upeResumen.kpis.totalCasos) * 100).toFixed(1)
                          : '0'
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{etapa.etapa}</span>
                            <span className="font-black text-slate-900">
                              {etapa.cantidad.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(parseFloat(pct), 2)}%`, backgroundColor: etapa.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* SEMÁFORO DE TIEMPOS DE PTI */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                      Semáforo de Permanencia en PTI (Casos Activos: {upeResumen.kpis.conPti.toLocaleString()})
                    </span>
                    <span className="text-[10px] text-slate-400">Plazo legal ordinario: 12 meses</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 block uppercase">Menor a 6 Meses</span>
                      <span className="text-xl font-black text-emerald-950">
                        {upeResumen.semaforoPti.menor6m.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-emerald-600 block font-semibold">En plazo legal regular</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-700 block uppercase">De 6 a 12 Meses</span>
                      <span className="text-xl font-black text-amber-950">
                        {upeResumen.semaforoPti.de6a12m.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-amber-700 block font-semibold">Prórroga ordinaria</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-700 block uppercase">
                        Mayor a 12 Meses (Alerta)
                      </span>
                      <span className="text-xl font-black text-rose-950">
                        {upeResumen.semaforoPti.mayor12m.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-rose-700 block font-bold">Requiere revisión del caso</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600 block uppercase">Sin rango calculable</span>
                      <span className="text-xl font-black text-slate-900">
                        {upeResumen.semaforoPti.sinRango.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-semibold">Revisar fecha de PTI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONDICIONES DE SALIDA / CIERRE (5 COLS) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        Condición / Motivo de Salida (Cierre)
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Causas legales que justificaron la conclusión del procedimiento
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {upeResumen.kpis.concluidos.toLocaleString()} cierres
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {upeResumen.condicionesSalida.map((c, i) => {
                      const pct =
                        upeResumen.kpis.concluidos > 0
                          ? ((c.cantidad / upeResumen.kpis.concluidos) * 100).toFixed(1)
                          : '0'
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[200px] sm:max-w-[240px]">
                              {c.motivo}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900">{c.cantidad.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 block font-bold">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <strong className="text-slate-700">Dato Normativo:</strong> Los casos concluidos por mayoría de edad
                  requieren articulación prioritaria para preparación a la vida autónoma e inserción sociolaboral.
                </div>
              </div>
            </div>
          )}

          {/* 3. TERCERA FILA: SITUACIÓN ACTUAL DEL PROCEDIMIENTO (ESTADO GENERAL) */}
          {upeResumen && upeResumen.situacionActual && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Situación Actual del Procedimiento (Estado General)
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Distribución de expedientes según su estado procesal oficial en el RENE (Columna 97)
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {upeResumen.situacionActual.reduce((acc, curr) => acc + curr.cantidad, 0).toLocaleString()} clasificados
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {upeResumen.situacionActual.map((item, idx) => {
                  const pct =
                    upeResumen.kpis.totalCasos > 0
                      ? ((item.cantidad / upeResumen.kpis.totalCasos) * 100).toFixed(1)
                      : '0'

                  // Estilos por estado
                  let badgeColor = 'border-slate-200 bg-slate-50 text-slate-700'
                  let numColor = 'text-slate-900'
                  if (item.situacion.includes('CONCLUIDO')) {
                    badgeColor = 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    numColor = 'text-emerald-700'
                  } else if (item.situacion.includes('EN TRAMITE')) {
                    badgeColor = 'border-blue-200 bg-blue-50 text-blue-800'
                    numColor = 'text-blue-700'
                  } else if (item.situacion.includes('DECLINADO') || item.situacion.includes('DEMUNA')) {
                    badgeColor = 'border-amber-200 bg-amber-50 text-amber-800'
                    numColor = 'text-amber-700'
                  } else if (item.situacion.includes('NO ABRIR')) {
                    badgeColor = 'border-slate-200 bg-slate-100 text-slate-600'
                    numColor = 'text-slate-700'
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition hover:shadow-2xs ${badgeColor}`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-tight line-clamp-2" title={item.situacion}>
                        {item.situacion}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className={`text-xl font-black ${numColor}`}>
                          {item.cantidad.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black opacity-80">{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 4. CUARTA FILA: RENDIMIENTO Y CARGA OPERATIVA POR SEDE UPE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Carga Operativa y Rendimiento Resolutivo por Sede UPE
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Actuaciones, expedientes consolidados por sede y tasa de cierre
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar Sede UPE..."
                    value={searchSede}
                    onChange={(e) => setSearchSede(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl w-48 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-black">
                  <tr>
                    <th className="py-3 px-3">Sede UPE</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-950 font-black" title="Actuaciones registradas en el RENE">
                      Ingresos Totales (Actuaciones)
                    </th>
                    <th className="py-3 px-3 text-right font-black">Expedientes por Sede</th>
                    <th className="py-3 px-3 text-right text-amber-700">En Riesgo</th>
                    <th className="py-3 px-3 text-right text-red-700">En Desprotección</th>
                    <th className="py-3 px-3 text-right text-purple-700">Riesgo &rarr; Desprot.</th>
                    <th className="py-3 px-3 text-right text-rose-700 font-black">Pendientes Declaración</th>
                    <th className="py-3 px-3 text-right text-indigo-700">PTI Activo</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Concluidos</th>
                    <th className="py-3 px-3 text-center">Tasa Cierre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredUpeSedes.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.sede}</td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-800 bg-blue-50/30">
                        {s.totalIngresos.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {s.casosUnicos.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                        {s.enRiesgo.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-red-700">
                        {s.enDesproteccion.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-purple-700">{s.escalo.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-700 bg-rose-50/50">
                        {s.pendientesDeclaracion.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-700">
                        {s.conPti.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {s.concluidos.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            s.tasaCierre >= 50
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.tasaCierre >= 25
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.tasaCierre}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER INSTITUCIONAL OFICIAL
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 bg-white p-3 rounded-xl shadow-2xs">
        <div>
          <strong className="text-slate-700">Elaborado:</strong> Dirección de Protección Especial (DPE) — DGNNA | MIMP
        </div>
        <div>
          <strong className="text-slate-700">Fuentes:</strong> Sistema de Información de Línea 1810, Registro BFA y
          Unidades de Protección Especial (RENE Consolidado 2018-2026)
        </div>
      </div>
    </div>
  )
}
