'use client'

import React, { useState } from 'react'
import {
  PhoneCall,
  HeartHandshake,
  ShieldAlert,
  Users,
  Building2,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Phone,
  BarChart3,
  PieChart as PieChartIcon,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────
// DATA PARA PESTAÑA 1: LÍNEA ANNA 1810
// ─────────────────────────────────────────────────────────────
const LINEA_HISTORICO = [
  { anio: '2018', noVinculadas: 1002, vinculadasNna: 285, total: 1287, pctVinculadas: 22 },
  { anio: '2019', noVinculadas: 5723, vinculadasNna: 2230, total: 7953, pctVinculadas: 28 },
  { name: '2020', anio: '2020', noVinculadas: 8407, vinculadasNna: 3538, total: 11945, pctVinculadas: 30 },
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

// ─────────────────────────────────────────────────────────────
// DATA PARA PESTAÑA 3: UNIDADES DE PROTECCIÓN ESPECIAL (UPE)
// ─────────────────────────────────────────────────────────────
const UPE_MEDIDAS_HISTORICO = [
  { anio: '2018', familiar: 1558, residencial: 1640, total: 3198, pctFam: 49 },
  { anio: '2019', familiar: 3133, residencial: 3551, total: 6684, pctFam: 47 },
  { anio: '2020', familiar: 3038, residencial: 2141, total: 5179, pctFam: 59 },
  { anio: '2021', familiar: 3867, residencial: 2892, total: 6759, pctFam: 57 },
  { anio: '2022', familiar: 4049, residencial: 2977, total: 7026, pctFam: 58 },
  { anio: '2023', familiar: 5040, residencial: 2629, total: 7669, pctFam: 66 },
  { anio: '2024', familiar: 5262, residencial: 2158, total: 7420, pctFam: 71 },
  { anio: '2025', familiar: 2250, residencial: 821, total: 3071, pctFam: 73 },
]

const UPE_INGRESOS_SEDES = [
  { upe: 'Lima', total: 41449, pct: 17.9 },
  { upe: 'Lima Norte-Callao', total: 33831, pct: 14.6 },
  { upe: 'Lima Este', total: 22349, pct: 9.6 },
  { upe: 'Arequipa', total: 19860, pct: 8.6 },
  { upe: 'Lima Sur', total: 14549, pct: 6.3 },
  { upe: 'Piura', total: 12702, pct: 5.5 },
  { upe: 'Cusco', total: 11794, pct: 5.1 },
  { upe: 'Junín', total: 9288, pct: 4.0 },
  { upe: 'Lambayeque', total: 8399, pct: 3.6 },
  { upe: 'Loreto', total: 5575, pct: 2.4 },
  { upe: 'Madre de Dios', total: 5272, pct: 2.3 },
  { upe: 'Cajamarca', total: 5248, pct: 2.3 },
  { upe: 'Huánuco', total: 5008, pct: 2.2 },
  { upe: 'Tumbes', total: 4998, pct: 2.2 },
  { upe: 'La Libertad', total: 4358, pct: 1.9 },
  { upe: 'Tacna', total: 4392, pct: 1.9 },
  { upe: 'Ayacucho', total: 4098, pct: 1.8 },
]

const UPE_DEMOGRAFIA_2025 = {
  total: 11445,
  mujeres: 6672,
  hombres: 4773,
  g1: 2546, // 0 a 5 años (22.2%)
  g2: 3737, // 6 a 11 años (32.7%)
  g3: 5162, // 12 a 17 años (45.1%)
}

export default function DpeDashboardClient() {
  const [activeTab, setActiveTab] = useState<'linea1810' | 'acogimiento' | 'upe'>('linea1810')

  // Exportación Excel según pestaña activa
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    if (activeTab === 'linea1810') {
      const ws1 = XLSX.utils.json_to_sheet(LINEA_HISTORICO)
      const ws2 = XLSX.utils.json_to_sheet(LINEA_REPORTANTES)
      const ws3 = XLSX.utils.json_to_sheet(LINEA_RESULTADOS)
      const ws4 = XLSX.utils.json_to_sheet(LINEA_REGIONES)
      XLSX.utils.book_append_sheet(wb, ws1, 'Historico Llamadas')
      XLSX.utils.book_append_sheet(wb, ws2, 'Reportantes')
      XLSX.utils.book_append_sheet(wb, ws3, 'Resultados Atencion')
      XLSX.utils.book_append_sheet(wb, ws4, 'Distribucion Regional')
      XLSX.writeFile(wb, `Reporte_Linea_ANNA_1810_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else if (activeTab === 'acogimiento') {
      const ws1 = XLSX.utils.json_to_sheet(ACOG_SOLICITUDES_PROCEDENCIA)
      const ws2 = XLSX.utils.json_to_sheet(ACOG_NNA_EDAD)
      const ws3 = XLSX.utils.json_to_sheet(ACOG_UPES_TOP)
      XLSX.utils.book_append_sheet(wb, ws1, 'Solicitudes Procedencia')
      XLSX.utils.book_append_sheet(wb, ws2, 'NNA por Edad')
      XLSX.utils.book_append_sheet(wb, ws3, 'NNA por UPE')
      XLSX.writeFile(wb, `Reporte_Acogimiento_Familiar_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else {
      const ws1 = XLSX.utils.json_to_sheet(UPE_MEDIDAS_HISTORICO)
      const ws2 = XLSX.utils.json_to_sheet(UPE_INGRESOS_SEDES)
      XLSX.utils.book_append_sheet(wb, ws1, 'Medidas de Proteccion')
      XLSX.utils.book_append_sheet(wb, ws2, 'Ingresos por Sede')
      XLSX.writeFile(wb, `Reporte_UPE_Nacional_${new Date().toISOString().slice(0, 10)}.xlsx`)
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
              Servicios de Atención Temprana, Acogimiento Familiar y Unidades de Protección Especial
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
            <div className={`p-2.5 rounded-xl ${activeTab === 'linea1810' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600'}`}>
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
            <div className={`p-2.5 rounded-xl ${activeTab === 'acogimiento' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
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
            <div className={`p-2.5 rounded-xl ${activeTab === 'upe' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 uppercase">3. Unidades de Protección (UPE)</p>
              <p className="text-[11px] text-slate-500">Medidas de protección & Reintegración</p>
            </div>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            232,124 ing.
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO: PESTAÑA 1 - LÍNEA ANNA 1810
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'linea1810' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Banner Línea 1810 */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-xl p-4 text-white shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-xl shadow">
                1810
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Línea Especializada ANNA 1810</h2>
                <p className="text-xs text-orange-100 font-medium">¿Necesitas ayuda?, hablemos — Canal gratuito de orientación y protección</p>
              </div>
            </div>
            <div className="text-right bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-[10px] text-orange-200 block uppercase font-bold">Efectividad 2025</span>
              <span className="text-lg font-black text-white">74 % Vinculadas a NNA</span>
            </div>
          </div>

          {/* 4 KPIs Línea 1810 */}
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

          {/* Gráficos Línea 1810 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Gráfico 1: Evolución de llamadas e incremento de efectividad (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  Evolución Histórica de Llamadas y % de Efectividad
                </h3>
              </div>

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

            {/* Gráfico 2: Demografía y Resultados de Atención (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Resultados de la Atención (2025)
                </h3>
              </div>

              <div className="space-y-3 text-xs pt-1">
                {LINEA_RESULTADOS.map((r, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{r.resultado}</span>
                      <span className="font-bold text-slate-900">{r.cantidad} ({r.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${r.pct}%` }}
                        className={`h-full ${i === 0 ? 'bg-purple-600' : i === 1 ? 'bg-blue-600' : i === 2 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Perfil por Edad */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-base font-black text-slate-800">1,420</p>
                  <span className="text-[10px] text-slate-500 font-semibold block">0 a 5 años (29%)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-base font-black text-slate-800">1,807</p>
                  <span className="text-[10px] text-slate-500 font-semibold block">6 a 11 años (36%)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-base font-black text-slate-800">1,728</p>
                  <span className="text-[10px] text-slate-500 font-semibold block">12 a 17 años (35%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla y Concentración Regional */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Distribución Regional de NNA Identificados en Llamadas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
              {LINEA_REGIONES.map((reg, i) => (
                <div key={i} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block truncate">{reg.region}</span>
                  <p className="text-base font-black text-orange-700">{reg.cantidad}</p>
                  <span className="text-[9px] font-semibold text-slate-400">{reg.pct} %</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO: PESTAÑA 2 - ACOGIMIENTO FAMILIAR (BFA)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'acogimiento' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Banner Acogimiento */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-xl p-4 text-white shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-emerald-700 flex items-center justify-center font-black text-xl shadow">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Servicio de Acogimiento Familiar</h2>
                <p className="text-xs text-emerald-100 font-medium">Banco de Familias Acogedoras (BFA) — Protección en entorno familiar temporal</p>
              </div>
            </div>
            <div className="text-right bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-[10px] text-emerald-200 block uppercase font-bold">NNA Acogidos</span>
              <span className="text-lg font-black text-white">1,244 Niñas, Niños y Adolescentes</span>
            </div>
          </div>

          {/* 4 KPIs Acogimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-emerald-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Solicitudes de Familias</p>
              <p className="text-2xl font-black text-emerald-700">2,730</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Postulantes a Familias Acogedoras</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-blue-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Familias en el Banco (BFA)</p>
              <p className="text-2xl font-black text-blue-700">1,122</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">Evaluadas e Incorporadas</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total NNA Acogidos</p>
              <p className="text-2xl font-black text-purple-700">1,244</p>
              <p className="text-xs text-purple-600 font-semibold mt-0.5">732 Mujeres (59%) / 512 Hombres (41%)</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-amber-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Canal Principal</p>
              <p className="text-2xl font-black text-amber-700">UPE (46.3%)</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">1,263 Solicitudes derivadas</p>
            </div>
          </div>

          {/* Gráficos y Desglose Acogimiento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Procedencia de Solicitudes (6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">
                Solicitudes de Familias por Procedencia (Total: 2,730)
              </h3>
              <div className="space-y-3 text-xs pt-1">
                {ACOG_SOLICITUDES_PROCEDENCIA.map((p, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{p.procedencia}</span>
                      <span className="font-bold text-slate-900">{p.cantidad} ({p.pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${p.pct}%` }}
                        className={`h-full ${i === 0 ? 'bg-emerald-600' : i === 1 ? 'bg-blue-600' : i === 2 ? 'bg-purple-600' : 'bg-slate-400'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NNA Acogidos por Grupo de Edad (6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">
                NNA Acogidos por Rango Etario (Total: 1,244)
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                {ACOG_NNA_EDAD.map((g, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <p className="text-2xl font-black text-slate-900">{g.cantidad}</p>
                    <span className="text-xs font-bold block" style={{ color: g.color }}>{g.grupo}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{g.pct} % del total</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium">
                💡 <strong>Prioridad de Primera Infancia:</strong> El 46.7% de los NNA en familias acogedoras tienen entre 0 y 5 años (G1).
              </div>
            </div>
          </div>

          {/* Tabla de NNA Acogidos por UPE */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              NNA Acogidos por Unidad de Protección Especial (UPE) y Sexo
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#10b981] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Unidad de Protección (UPE)</th>
                    <th className="py-2.5 px-3 text-center">Hombres ♂</th>
                    <th className="py-2.5 px-3 text-center">Mujeres ♀</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-700">Total NNA Acogidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {ACOG_UPES_TOP.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-bold text-slate-800">{u.upe}</td>
                      <td className="py-2 px-3 text-center text-blue-700 font-bold">{u.hombres}</td>
                      <td className="py-2 px-3 text-center text-pink-700 font-bold">{u.mujeres}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-50">{u.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO: PESTAÑA 3 - UNIDADES DE PROTECCIÓN ESPECIAL (UPE)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'upe' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Banner UPE */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-xl p-4 text-white shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-blue-700 flex items-center justify-center font-black text-xl shadow">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Unidades de Protección Especial (UPE)</h2>
                <p className="text-xs text-blue-100 font-medium">Procedimientos por riesgo y desprotección familiar a nivel nacional</p>
              </div>
            </div>
            <div className="text-right bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-[10px] text-blue-200 block uppercase font-bold">Ingresos Históricos</span>
              <span className="text-lg font-black text-white">232,124 NNA (2013-2025)</span>
            </div>
          </div>

          {/* 4 KPIs UPE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border-2 border-blue-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Ingresos Totales (2013-2025)</p>
              <p className="text-2xl font-black text-blue-700">232,124</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">58.3% Mujeres / 41.7% Hombres</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-emerald-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Medidas Dictadas (2018-2025)</p>
              <p className="text-2xl font-black text-emerald-600">47,006</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">60% Acog. Familiar / 40% Residencial</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Procedimientos Concluidos</p>
              <p className="text-2xl font-black text-purple-700">76,539</p>
              <p className="text-xs text-purple-600 font-semibold mt-0.5">Con resolución final</p>
            </div>

            <div className="bg-white rounded-xl border-2 border-amber-500 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Reintegración Familiar</p>
              <p className="text-2xl font-black text-amber-700">29,939</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">NNA reincorporados a su familia</p>
            </div>
          </div>

          {/* Gráfico de Medidas de Protección: Familiar vs Residencial */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Medidas de Protección Dictadas por Año (Acogimiento Familiar vs Residencial)
                </h3>
              </div>

              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={UPE_MEDIDAS_HISTORICO} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="anio" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={10} stroke="#64748b" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="familiar" name="Acogimiento Familiar (60%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="residencial" name="Acogimiento Residencial (40%)" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demografía de Ingresos */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">
                Perfil de Ingreso a UPEs (2025: 11,445 NNA)
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Mujeres ♀</span>
                    <span className="font-bold text-pink-700">6,672 (58.3 %)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: '58.3%' }} className="bg-pink-500 h-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Hombres ♂</span>
                    <span className="font-bold text-blue-700">4,773 (41.7 %)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: '41.7%' }} className="bg-blue-600 h-full" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">Grupos Etarios 2025:</span>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>0 a 5 años</span> <span className="font-bold text-slate-800">2,546 (22.2%)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>6 a 11 años</span> <span className="font-bold text-slate-800">3,737 (32.7%)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>12 a 17 años</span> <span className="font-bold text-red-700">5,162 (45.1%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking de Ingresos por Sedes UPE */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Volumen Histórico por Sedes UPE (Top Regiones)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              {UPE_INGRESOS_SEDES.slice(0, 12).map((s, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-600 block truncate">{s.upe}</span>
                  <p className="text-base font-black text-blue-700">{s.total.toLocaleString()}</p>
                  <span className="text-[9px] font-semibold text-slate-400">{s.pct} % nacional</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER INSTITUCIONAL OFICIAL
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 bg-white p-3 rounded-xl shadow-2xs">
        <div>
          <strong className="text-slate-700">Elaborado:</strong> Dirección de Protección Especial (DPE) — DGNNA
        </div>
        <div>
          <strong className="text-slate-700">Fuentes:</strong> Sistema de Información de Línea 1810, Registro BFA y Unidades de Protección Especial
        </div>
      </div>

    </div>
  )
}

