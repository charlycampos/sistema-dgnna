'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Building2,
  Award,
  AlertTriangle,
  Cog,
  Home,
  Users,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
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

// Mock Data por Departamento
const DEPARTAMENTOS_DATA = [
  { depto: 'ANCASH', acreditada: 52, noAcreditada: 95, noOperativa: 19, total: 166, poblacionMenor18: 345000 },
  { depto: 'GORE LIMA', acreditada: 50, noAcreditada: 45, noOperativa: 33, total: 128, poblacionMenor18: 280000 },
  { depto: 'CAJAMARCA', acreditada: 61, noAcreditada: 56, noOperativa: 10, total: 127, poblacionMenor18: 460000 },
  { depto: 'AYACUCHO', acreditada: 43, noAcreditada: 76, noOperativa: 8, total: 127, poblacionMenor18: 210000 },
  { depto: 'JUNIN', acreditada: 47, noAcreditada: 64, noOperativa: 12, total: 123, poblacionMenor18: 395000 },
  { depto: 'CUSCO', acreditada: 113, noAcreditada: 0, noOperativa: 0, total: 113, poblacionMenor18: 410000 },
  { depto: 'PUNO', acreditada: 41, noAcreditada: 63, noOperativa: 6, total: 110, poblacionMenor18: 380000 },
  { depto: 'AREQUIPA', acreditada: 45, noAcreditada: 44, noOperativa: 14, total: 103, poblacionMenor18: 390000 },
  { depto: 'HUANCAVELICA', acreditada: 78, noAcreditada: 20, noOperativa: 4, total: 102, poblacionMenor18: 145000 },
  { depto: 'APURIMAC', acreditada: 56, noAcreditada: 24, noOperativa: 5, total: 85, poblacionMenor18: 135000 },
  { depto: 'AMAZONAS', acreditada: 63, noAcreditada: 18, noOperativa: 3, total: 84, poblacionMenor18: 130000 },
  { depto: 'HUANUCO', acreditada: 42, noAcreditada: 31, noOperativa: 7, total: 80, poblacionMenor18: 260000 },
  { depto: 'LA LIBERTAD', acreditada: 60, noAcreditada: 18, noOperativa: 5, total: 83, poblacionMenor18: 590000 },
  { depto: 'SAN MARTIN', acreditada: 50, noAcreditada: 22, noOperativa: 5, total: 77, poblacionMenor18: 275000 },
  { depto: 'PIURA', acreditada: 58, noAcreditada: 7, noOperativa: 3, total: 68, poblacionMenor18: 620000 },
  { depto: 'LORETO', acreditada: 30, noAcreditada: 19, noOperativa: 4, total: 53, poblacionMenor18: 385000 },
  { depto: 'ICA', acreditada: 35, noAcreditada: 5, noOperativa: 3, total: 43, poblacionMenor18: 290000 },
  { depto: 'LIMA METROPOLITANA', acreditada: 43, noAcreditada: 0, noOperativa: 0, total: 43, poblacionMenor18: 2850000 },
  { depto: 'LAMBAYEQUE', acreditada: 28, noAcreditada: 8, noOperativa: 2, total: 38, poblacionMenor18: 380000 },
]

// Mock Data por Provincia
const PROVINCIAS_DATA = [
  { provincia: 'LIMA', depto: 'LIMA METROPOLITANA', acreditada: 43, noAcreditada: 0, noOperativa: 0, total: 43 },
  { provincia: 'JAUJA', depto: 'JUNIN', acreditada: 7, noAcreditada: 22, noOperativa: 5, total: 34 },
  { provincia: 'YAUYOS', depto: 'GORE LIMA', acreditada: 12, noAcreditada: 3, noOperativa: 18, total: 33 },
  { provincia: 'HUAROCHIRI', depto: 'GORE LIMA', acreditada: 11, noAcreditada: 13, noOperativa: 8, total: 32 },
  { provincia: 'AREQUIPA', depto: 'AREQUIPA', acreditada: 22, noAcreditada: 5, noOperativa: 2, total: 29 },
  { provincia: 'HUANCAYO', depto: 'JUNIN', acreditada: 12, noAcreditada: 15, noOperativa: 1, total: 28 },
  { provincia: 'LUYA', depto: 'AMAZONAS', acreditada: 4, noAcreditada: 19, noOperativa: 0, total: 23 },
  { provincia: 'TAYACAJA', depto: 'HUANCAVELICA', acreditada: 1, noAcreditada: 15, noOperativa: 5, total: 21 },
  { provincia: 'CHACHAPOYAS', depto: 'AMAZONAS', acreditada: 3, noAcreditada: 18, noOperativa: 0, total: 21 },
  { provincia: 'LUCANAS', depto: 'AYACUCHO', acreditada: 5, noAcreditada: 16, noOperativa: 0, total: 21 },
  { provincia: 'ANDAHUAYLAS', depto: 'APURIMAC', acreditada: 5, noAcreditada: 15, noOperativa: 0, total: 20 },
  { provincia: 'CAYLLOMA', depto: 'AREQUIPA', acreditada: 3, noAcreditada: 14, noOperativa: 3, total: 20 },
  { provincia: 'CHICLAYO', depto: 'LAMBAYEQUE', acreditada: 11, noAcreditada: 9, noOperativa: 0, total: 20 },
]

// Mock Directorio de DEMUNA
const DIRECTORIO_MOCK = [
  { id: '1', nombre: 'DEMUNA Municipalidad Metropolitana de Lima', depto: 'LIMA METROPOLITANA', prov: 'LIMA', dist: 'LIMA', tipo: 'Provincial', estado: 'Acreditada', resolucion: 'R.D. N° 045-2024-MIMP', responsable: 'Lic. Carmen Rosa Medina', telefono: '01 632-1300', correo: 'demuna@munlima.gob.pe' },
  { id: '2', nombre: 'DEMUNA Municipalidad Distrital de Miraflores', depto: 'LIMA METROPOLITANA', prov: 'LIMA', dist: 'MIRAFLORES', tipo: 'Distrital', estado: 'Acreditada', resolucion: 'R.D. N° 112-2024-MIMP', responsable: 'Abg. Jorge Valdivia S.', telefono: '01 617-7272', correo: 'demuna@miraflores.gob.pe' },
  { id: '3', nombre: 'DEMUNA Municipalidad Provincial de Huaraz', depto: 'ANCASH', prov: 'HUARAZ', dist: 'HUARAZ', tipo: 'Provincial', estado: 'Acreditada', resolucion: 'R.D. N° 089-2023-MIMP', responsable: 'Lic. Walter Mendoza', telefono: '043 421230', correo: 'demuna@munihuaraz.gob.pe' },
  { id: '4', nombre: 'DEMUNA Municipalidad Distrital de Independencia', depto: 'ANCASH', prov: 'HUARAZ', dist: 'INDEPENDENCIA', tipo: 'Distrital', estado: 'No Acreditada', resolucion: '-', responsable: 'Psic. Ana María Paredes', telefono: '043 428011', correo: 'demuna@muniindependencia.gob.pe' },
  { id: '5', nombre: 'DEMUNA Municipalidad Provincial de Cusco', depto: 'CUSCO', prov: 'CUSCO', dist: 'CUSCO', tipo: 'Provincial', estado: 'Acreditada', resolucion: 'R.D. N° 033-2024-MIMP', responsable: 'Dra. Patricia Huamán', telefono: '084 240006', correo: 'demunacusco@cusco.gob.pe' },
  { id: '6', nombre: 'DEMUNA Municipalidad Provincial de Arequipa', depto: 'AREQUIPA', prov: 'AREQUIPA', dist: 'AREQUIPA', tipo: 'Provincial', estado: 'Acreditada', resolucion: 'R.D. N° 201-2023-MIMP', responsable: 'Lic. Roberto Cáceres', telefono: '054 200100', correo: 'demuna@muniarequipa.gob.pe' },
  { id: '7', nombre: 'DEMUNA Municipalidad Distrital de Yauyos', depto: 'GORE LIMA', prov: 'YAUYOS', dist: 'YAUYOS', tipo: 'Distrital', estado: 'No Operativa', resolucion: '-', responsable: 'Por Designar', telefono: '01 246-8000', correo: 'demuna@muniyauyos.gob.pe' },
  { id: '8', nombre: 'DEMUNA Municipalidad Provincial de Huamanga', depto: 'AYACUCHO', prov: 'HUAMANGA', dist: 'AYACUCHO', tipo: 'Provincial', estado: 'Acreditada', resolucion: 'R.D. N° 154-2024-MIMP', responsable: 'Abg. Carlos Quispe L.', telefono: '066 312520', correo: 'demunahuamanga@munihuamanga.gob.pe' },
  { id: '9', nombre: 'DEMUNA Municipalidad Provincial de Huancayo', depto: 'JUNIN', prov: 'HUANCAYO', dist: 'HUANCAYO', tipo: 'Provincial', estado: 'Acreditada', resolucion: 'R.D. N° 077-2024-MIMP', responsable: 'Lic. Elena Ramos', telefono: '064 600408', correo: 'demuna@munihuancayo.gob.pe' },
  { id: '10', nombre: 'DEMUNA Municipalidad Distrital de Jauja', depto: 'JUNIN', prov: 'JAUJA', dist: 'JAUJA', tipo: 'Distrital', estado: 'No Acreditada', resolucion: '-', responsable: 'Lic. Marco Antonio T.', telefono: '064 362020', correo: 'demuna@munijauja.gob.pe' },
]

export default function DemunaDashboardClient() {
  // Filtros
  const [estadoAcreditacion, setEstadoAcreditacion] = useState('Todas')
  const [anioAcreditacion, setAnioAcreditacion] = useState('Todas')
  const [selectedDepto, setSelectedDepto] = useState('Todas')
  const [selectedProv, setSelectedProv] = useState('Todas')
  const [selectedDist, setSelectedDist] = useState('Todas')
  const [directorioOpen, setDirectorioOpen] = useState(false)
  const [searchDirectorio, setSearchDirectorio] = useState('')

  // Lista de departamentos para el select
  const deptosList = useMemo(() => {
    return ['Todas', ...DEPARTAMENTOS_DATA.map(d => d.depto)]
  }, [])

  // Lista de provincias según departamento
  const provList = useMemo(() => {
    if (selectedDepto === 'Todas') {
      return ['Todas', ...Array.from(new Set(PROVINCIAS_DATA.map(p => p.provincia)))]
    }
    const filtered = PROVINCIAS_DATA.filter(p => p.depto === selectedDepto)
    return ['Todas', ...Array.from(new Set(filtered.map(p => p.provincia)))]
  }, [selectedDepto])

  // Filtrar data por departamento seleccionado
  const deptosDataFiltered = useMemo(() => {
    let list = [...DEPARTAMENTOS_DATA]
    if (selectedDepto !== 'Todas') {
      list = list.filter(d => d.depto === selectedDepto)
    }
    if (estadoAcreditacion === 'Acreditadas') {
      list = list.map(d => ({ ...d, noAcreditada: 0, noOperativa: 0 }))
    } else if (estadoAcreditacion === 'No Acreditadas') {
      list = list.map(d => ({ ...d, acreditada: 0, noOperativa: 0 }))
    } else if (estadoAcreditacion === 'No Operativas') {
      list = list.map(d => ({ ...d, acreditada: 0, noAcreditada: 0 }))
    }
    return list
  }, [selectedDepto, estadoAcreditacion])

  // Filtrar provincias
  const provinciasDataFiltered = useMemo(() => {
    let list = [...PROVINCIAS_DATA]
    if (selectedDepto !== 'Todas') {
      list = list.filter(p => p.depto === selectedDepto)
    }
    if (selectedProv !== 'Todas') {
      list = list.filter(p => p.provincia === selectedProv)
    }
    if (estadoAcreditacion === 'Acreditadas') {
      list = list.map(p => ({ ...p, noAcreditada: 0, noOperativa: 0 }))
    } else if (estadoAcreditacion === 'No Acreditadas') {
      list = list.map(p => ({ ...p, acreditada: 0, noOperativa: 0 }))
    } else if (estadoAcreditacion === 'No Operativas') {
      list = list.map(p => ({ ...p, acreditada: 0, noAcreditada: 0 }))
    }
    return list
  }, [selectedDepto, selectedProv, estadoAcreditacion])

  // Totales calculados
  const totalMunicipalidades = 1892
  const totalAcreditadas = 864
  const totalNoAcreditadas = 858
  const totalNoOperativas = 170
  const totalOperativas = 1722

  const pctAcreditadas = 46
  const pctNoAcreditadas = 45
  const pctNoOperativas = 9
  const pctOperativas = 91

  const totalDistrital = 1696
  const totalProvincial = 196
  const poblacionMenores = '9,523,878'

  // Exportar Directorio a Excel
  const handleExportDirectorio = () => {
    const dataExcel = DIRECTORIO_MOCK.map(d => ({
      'Nombre de DEMUNA': d.nombre,
      'Departamento': d.depto,
      'Provincia': d.prov,
      'Distrito': d.dist,
      'Tipo de DEMUNA': d.tipo,
      'Estado de Acreditación': d.estado,
      'Resolución Directoral': d.resolucion,
      'Responsable / Defensor': d.responsable,
      'Teléfono': d.telefono,
      'Correo Electrónico': d.correo,
    }))

    const ws = XLSX.utils.json_to_sheet(dataExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Directorio DEMUNA')
    XLSX.writeFile(wb, `Directorio_Nacional_DEMUNA_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Directorio Filtrado
  const filteredDirectorio = useMemo(() => {
    return DIRECTORIO_MOCK.filter(d => {
      const matchSearch =
        d.nombre.toLowerCase().includes(searchDirectorio.toLowerCase()) ||
        d.responsable.toLowerCase().includes(searchDirectorio.toLowerCase()) ||
        d.depto.toLowerCase().includes(searchDirectorio.toLowerCase()) ||
        d.prov.toLowerCase().includes(searchDirectorio.toLowerCase())
      const matchDepto = selectedDepto === 'Todas' || d.depto === selectedDepto
      const matchEst =
        estadoAcreditacion === 'Todas' ||
        (estadoAcreditacion === 'Acreditadas' && d.estado === 'Acreditada') ||
        (estadoAcreditacion === 'No Acreditadas' && d.estado === 'No Acreditada') ||
        (estadoAcreditacion === 'No Operativas' && d.estado === 'No Operativa')
      return matchSearch && matchDepto && matchEst
    })
  }, [searchDirectorio, selectedDepto, estadoAcreditacion])

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 md:p-6 space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER OFICIAL INSTITUCIONAL
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Logo MIMP & Título */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <div className="bg-[#D91B24] text-white font-bold px-2 py-1 rounded text-xs tracking-wider flex items-center gap-1 shadow-sm">
              <span className="text-[11px]">PERÚ</span>
            </div>
            <div className="text-[11px] leading-tight font-medium text-slate-700 max-w-[140px]">
              Ministerio de la Mujer y Poblaciones Vulnerables
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Situación de las <span className="text-[#D91B24]">DEMUNA</span>
            </h1>
          </div>
        </div>

        {/* Filtros Superiores */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {/* Estado de Acreditación */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700">Estado de Acreditación</label>
            <select
              value={estadoAcreditacion}
              onChange={e => setEstadoAcreditacion(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm min-w-[130px]"
            >
              <option value="Todas">Todas</option>
              <option value="Acreditadas">Acreditadas</option>
              <option value="No Acreditadas">No Acreditadas</option>
              <option value="No Operativas">No Operativas</option>
            </select>
          </div>

          {/* Última Acreditación */}
          <div className="flex flex-col items-center">
            <label className="text-[11px] font-bold text-slate-700">Última acreditación</label>
            <div className="text-xs font-bold text-[#D91B24] border border-slate-200 bg-red-50/50 rounded-lg px-3 py-1.5 shadow-sm">
              08 septiembre 2026
            </div>
          </div>

          {/* Año Acreditación */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700">Año Acreditación</label>
            <select
              value={anioAcreditacion}
              onChange={e => setAnioAcreditacion(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm min-w-[100px]"
            >
              <option value="Todas">Todas</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILA DE 5 TARJETAS KPI PRINCIPALES
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total Municipalidades */}
        <div className="bg-white rounded-xl border-2 border-[#D91B24] p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[#D91B24] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Total Municipalidades</p>
            <p className="text-2xl font-black text-[#D91B24]">1.892</p>
          </div>
        </div>

        {/* KPI 2: Acreditadas */}
        <div className="bg-white rounded-xl border-2 border-emerald-500 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">Acreditadas</p>
            <p className="text-2xl font-black text-emerald-600">864</p>
            <p className="text-xs font-bold text-emerald-700">46 %</p>
          </div>
        </div>

        {/* KPI 3: No Acreditadas */}
        <div className="bg-white rounded-xl border-2 border-blue-600 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">No Acreditadas</p>
            <p className="text-2xl font-black text-blue-700">858</p>
            <p className="text-xs font-bold text-blue-800">45 %</p>
          </div>
        </div>

        {/* KPI 4: No Operativas */}
        <div className="bg-white rounded-xl border-2 border-orange-500 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">No Operativas</p>
            <p className="text-2xl font-black text-orange-600">170</p>
            <p className="text-xs font-bold text-orange-700">9 %</p>
          </div>
        </div>

        {/* KPI 5: Operativas */}
        <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <Cog className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">Operativas</p>
            <p className="text-2xl font-black text-purple-700">1.722</p>
            <p className="text-xs font-bold text-purple-800">91 %</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CUERPO PRINCIPAL: FILTROS + ESTADÍSTICAS + GRÁFICOS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUMNA IZQUIERDA: Filtros Geográficos y Resumen Tipos (5 cols) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          {/* Bloque Filtros Geográficos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              Filtro Geográfico Territorial
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">DEPARTAMENTOS</label>
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">PROVINCIAS</label>
                <select
                  value={selectedProv}
                  onChange={e => setSelectedProv(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                >
                  {provList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">DISTRITOS</label>
                <select
                  value={selectedDist}
                  onChange={e => setSelectedDist(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Todas">Todas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque Tipos de DEMUNA */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="text-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Tipo de DEMUNA</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Distrital */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-2xl font-black text-blue-900">{totalDistrital.toLocaleString()}</p>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  Distrital
                </span>
              </div>

              {/* Provincial */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-2xl font-black text-blue-900">{totalProvincial.toLocaleString()}</p>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  Provincial
                </span>
              </div>
            </div>

            {/* Botón Directorio */}
            <button
              onClick={() => setDirectorioOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 hover:bg-emerald-100 font-bold text-sm transition shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span>Directorio de las DEMUNA</span>
            </button>
          </div>

          {/* Población Menor a 18 Años */}
          <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-sm text-center">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">
              POBLACIÓN NACIONAL MENOR A 18 AÑOS
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{poblacionMenores}</p>
          </div>
        </div>

        {/* COLUMNA DERECHA: Gráficos de Estado por Departamento y Provincia (8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GRÁFICO 1: ESTADO POR DEPARTAMENTO */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  ESTADO POR DEPARTAMENTO
                </h3>
              </div>

              {/* Leyenda Horizontal */}
              <div className="flex items-center gap-2 text-[10px] font-bold pb-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[#0284c7]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> ACREDITADA
                </span>
                <span className="inline-flex items-center gap-1 text-[#1e3a8a]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]" /> NO ACREDITADA
                </span>
                <span className="inline-flex items-center gap-1 text-[#f97316]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> NO OPERATIVA
                </span>
              </div>

              {/* Chart */}
              <div className="h-[430px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={deptosDataFiltered}
                    margin={{ top: 5, right: 10, left: 45, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={10} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="depto"
                      fontSize={9}
                      fontWeight="bold"
                      stroke="#475569"
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      formatter={(val, name) => [val, name === 'acreditada' ? 'Acreditada' : name === 'noAcreditada' ? 'No Acreditada' : 'No Operativa']}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="acreditada" stackId="a" fill="#0284c7" />
                    <Bar dataKey="noAcreditada" stackId="a" fill="#1e3a8a" />
                    <Bar dataKey="noOperativa" stackId="a" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* GRÁFICO 2: ESTADO POR PROVINCIA */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  ESTADO POR PROVINCIA
                </h3>
              </div>

              {/* Leyenda Horizontal */}
              <div className="flex items-center gap-2 text-[10px] font-bold pb-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[#0284c7]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> ACREDITADA
                </span>
                <span className="inline-flex items-center gap-1 text-[#1e3a8a]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]" /> NO ACREDIT...
                </span>
                <span className="inline-flex items-center gap-1 text-[#f97316]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> NO OPERATI...
                </span>
              </div>

              {/* Chart */}
              <div className="h-[430px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={provinciasDataFiltered}
                    margin={{ top: 5, right: 10, left: 35, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={10} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="provincia"
                      fontSize={9}
                      fontWeight="bold"
                      stroke="#475569"
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      formatter={(val, name) => [val, name === 'acreditada' ? 'Acreditada' : name === 'noAcreditada' ? 'No Acreditada' : 'No Operativa']}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="acreditada" stackId="b" fill="#0284c7" />
                    <Bar dataKey="noAcreditada" stackId="b" fill="#1e3a8a" />
                    <Bar dataKey="noOperativa" stackId="b" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BANNER INFERIOR INSTITUCIONAL (ROJO DSLD)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#D91B24] rounded-xl px-6 py-2.5 text-white flex items-center justify-between shadow-md">
        <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-red-200" />
          <span>Sistema Integrado DGNNA</span>
        </div>
        <div className="text-sm font-bold tracking-tight">
          Dirección de Sistemas Locales y Defensorías
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DIRECTORIO NACIONAL DE DEMUNA
      ───────────────────────────────────────────────────────────── */}
      {directorioOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Directorio Oficial de las DEMUNA</h2>
                  <p className="text-xs text-slate-300">
                    Defensorías Municipales acreditadas, no acreditadas y responsables a nivel nacional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDirectorioOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controles de Búsqueda y Exportación */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por DEMUNA, departamento, responsable..."
                  value={searchDirectorio}
                  onChange={e => setSearchDirectorio(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando {filteredDirectorio.length} registros
                </span>
                <button
                  onClick={handleExportDirectorio}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar Excel
                </button>
              </div>
            </div>

            {/* Tabla de Directorio */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">DEMUNA</th>
                      <th className="py-2.5 px-3">Ubicación</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Responsable</th>
                      <th className="py-2.5 px-3">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDirectorio.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs">
                          {d.nombre}
                          {d.resolucion !== '-' && (
                            <div className="text-[10px] text-slate-400 font-mono">{d.resolucion}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-800 font-medium">{d.depto}</span>
                          <div className="text-[10px] text-slate-400">{d.prov} - {d.dist}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {d.tipo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.estado === 'Acreditada'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : d.estado === 'No Acreditada'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}
                          >
                            {d.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{d.responsable}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" /> {d.telefono}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" /> {d.correo}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDirectorioOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
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

