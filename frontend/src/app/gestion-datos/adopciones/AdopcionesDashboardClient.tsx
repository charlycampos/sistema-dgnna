'use client'

import React, { useState, useMemo } from 'react'
import {
  Heart,
  Users,
  RotateCcw,
  Download,
  Building2,
  FileSpreadsheet,
  MapPin,
  ShieldCheck,
  Search,
  ChevronRight,
  Filter,
  CheckCircle2,
  Info,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface SedeRow {
  sede: string
  edad0a3: number
  edad4a6: number
  edad7a11: number
  edad12a17: number
  total: number
}

interface CarItem {
  car: string
  totalNna: number
  sede: string
  depto: string
}

interface EvaluacionRow {
  resultado: string
  totalNna: number
  color?: string
}

interface GrupoRefRow {
  grupo: string
  totalNna: number
  color?: string
}

const SEDES_DATA: SedeRow[] = [
  { sede: 'DA-LIMA', edad0a3: 19, edad4a6: 28, edad7a11: 66, edad12a17: 240, total: 353 },
  { sede: 'DA-AREQUIPA', edad0a3: 5, edad4a6: 14, edad7a11: 34, edad12a17: 90, total: 143 },
  { sede: 'DA-CUSCO', edad0a3: 8, edad4a6: 6, edad7a11: 40, edad12a17: 74, total: 128 },
  { sede: 'DA-LA LIBERTAD', edad0a3: 0, edad4a6: 7, edad7a11: 16, edad12a17: 60, total: 83 },
  { sede: 'DA-JUNIN', edad0a3: 2, edad4a6: 5, edad7a11: 21, edad12a17: 54, total: 82 },
  { sede: 'DA-LAMBAYEQUE', edad0a3: 0, edad4a6: 6, edad7a11: 22, edad12a17: 49, total: 77 },
  { sede: 'DA-HUANUCO', edad0a3: 2, edad4a6: 5, edad7a11: 12, edad12a17: 47, total: 66 },
  { sede: 'DA-AYACUCHO', edad0a3: 0, edad4a6: 4, edad7a11: 3, edad12a17: 33, total: 40 },
]

const CARS_LIST: CarItem[] = [
  { car: 'Aldea Hogar El Refugio Magdalena', totalNna: 18, sede: 'DA-LIMA', depto: 'LIMA' },
  { car: 'Aldea Infantil San Salvador de Capachica', totalNna: 15, sede: 'DA-PUNO', depto: 'PUNO' },
  { car: 'Aldea Infantil San Ricardo', totalNna: 22, sede: 'DA-LIMA', depto: 'LIMA' },
  { car: 'Aldea Infantil SOS Chiclayo', totalNna: 34, sede: 'DA-LAMBAYEQUE', depto: 'LAMBAYEQUE' },
  { car: 'Aldea Infantil SOS Pachacamac', totalNna: 28, sede: 'DA-LIMA', depto: 'LIMA' },
  { car: 'Aldea Infantil Virgen Peregrina', totalNna: 14, sede: 'DA-AREQUIPA', depto: 'AREQUIPA' },
  { car: 'Aldeas Infantiles SOS Río Hondo', totalNna: 25, sede: 'DA-LIMA', depto: 'LIMA' },
  { car: 'CAR "Mi Casita" de la red INABIF', totalNna: 42, sede: 'DA-LIMA', depto: 'LIMA' },
  { car: 'CAR Casa Don Bosco Cusco', totalNna: 38, sede: 'DA-CUSCO', depto: 'CUSCO' },
  { car: 'CAR Hogar de la Niña Trujillo', totalNna: 31, sede: 'DA-LA LIBERTAD', depto: 'LA LIBERTAD' },
  { car: 'CAR Jesús Salvador Huancayo', totalNna: 29, sede: 'DA-JUNIN', depto: 'JUNIN' },
  { car: 'CAR Urpichallay Ayacucho', totalNna: 20, sede: 'DA-AYACUCHO', depto: 'AYACUCHO' },
  { car: 'CAR Santa Lorena Iquitos', totalNna: 26, sede: 'DA-LORETO', depto: 'LORETO' },
  { car: 'CAR Esperanza Huánuco', totalNna: 24, sede: 'DA-HUANUCO', depto: 'HUANUCO' },
]

const EVALUACION_DATA: EvaluacionRow[] = [
  { resultado: 'SIN UBICACIÓN DE PARADERO', totalNna: 3 },
  { resultado: 'SALIDA NO AUTORIZADA DEL CAR', totalNna: 5 },
  { resultado: 'PROBLEMA DE CONDUCTA', totalNna: 10 },
  { resultado: 'PARA DESIGNAR', totalNna: 350, color: 'text-blue-700 font-bold bg-blue-50/50' },
  { resultado: 'NO DESEA SER ADOPTADO', totalNna: 202 },
  { resultado: 'CON VÍNCULO', totalNna: 46 },
]

const GRUPOS_REF_DATA: GrupoRefRow[] = [
  { grupo: 'REGULAR', totalNna: 11 },
  { grupo: 'MAYORES DE 6 AÑOS', totalNna: 23 },
  { grupo: 'INTERÉS SUPERIOR DEL NIÑO', totalNna: 11 },
  { grupo: 'GRUPO DE HERMANOS', totalNna: 196, color: 'text-amber-700 font-bold bg-amber-50/50' },
  { grupo: 'CON PROBLEMAS DE SALUD', totalNna: 47 },
  { grupo: 'CON DISCAPACIDAD', totalNna: 105, color: 'text-purple-700 font-bold bg-purple-50/50' },
]

export default function AdopcionesDashboardClient() {
  // Estado de Adoptabilidad (Tabs)
  const [selectedEstado, setSelectedEstado] = useState<'ADOPTABLE' | 'DESIGNADO' | 'EVALUACIÓN' | 'SEGUIMIENTO'>('ADOPTABLE')

  // Filtros interactivos
  const [selectedSede, setSelectedSede] = useState<string | null>(null)
  const [selectedEval, setSelectedEval] = useState<string | null>(null)
  const [selectedGrupoRef, setSelectedGrupoRef] = useState<string | null>(null)
  const [searchCar, setSearchCar] = useState('')

  // Restablecer filtros
  const handleResetFilters = () => {
    setSelectedSede(null)
    setSelectedEval(null)
    setSelectedGrupoRef(null)
    setSearchCar('')
  }

  // Filtrado de Sedes
  const filteredSedes = useMemo(() => {
    if (!selectedSede) return SEDES_DATA
    return SEDES_DATA.filter(s => s.sede === selectedSede)
  }, [selectedSede])

  // Totales dinámicos
  const totalCasos = useMemo(() => {
    if (selectedEstado === 'DESIGNADO') return 145
    if (selectedEstado === 'EVALUACIÓN') return 218
    if (selectedEstado === 'SEGUIMIENTO') return 89
    if (selectedSede) {
      const match = SEDES_DATA.find(s => s.sede === selectedSede)
      return match ? match.total : 972
    }
    return 972
  }, [selectedEstado, selectedSede])

  const factor = selectedSede ? (totalCasos / 972) : 1

  const countNinos = Math.round(503 * factor)
  const countNinas = totalCasos - countNinos

  const count0a3 = selectedSede ? (filteredSedes[0]?.edad0a3 || 0) : 36
  const count4a6 = selectedSede ? (filteredSedes[0]?.edad4a6 || 0) : 75
  const count7a11 = selectedSede ? (filteredSedes[0]?.edad7a11 || 0) : 214
  const count12a17 = selectedSede ? (filteredSedes[0]?.edad12a17 || 0) : 647

  // Filtrado de CARs
  const filteredCars = useMemo(() => {
    return CARS_LIST.filter(c => {
      const matchSearch = c.car.toLowerCase().includes(searchCar.toLowerCase())
      const matchSede = !selectedSede || c.sede === selectedSede
      return matchSearch && matchSede
    })
  }, [searchCar, selectedSede])

  // Exportar matriz y datos a Excel
  const handleExportExcel = () => {
    const dataSedes = SEDES_DATA.map(s => ({
      'Sede DA': s.sede,
      '0 a 3 años': s.edad0a3,
      '4 a 6 años': s.edad4a6,
      '7 a 11 años': s.edad7a11,
      '12 a 17 años': s.edad12a17,
      'Total NNA': s.total,
    }))

    const dataEval = EVALUACION_DATA.map(e => ({
      'Resultado de Informe': e.resultado,
      'Total NNA': e.totalNna,
    }))

    const dataGrupos = GRUPOS_REF_DATA.map(g => ({
      'Grupo de Referencia': g.grupo,
      'Total NNA': g.totalNna,
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(dataSedes)
    const ws2 = XLSX.utils.json_to_sheet(dataEval)
    const ws3 = XLSX.utils.json_to_sheet(dataGrupos)

    XLSX.utils.book_append_sheet(wb, ws1, 'Sedes y Edades')
    XLSX.utils.book_append_sheet(wb, ws2, 'Evaluación Psicosocial')
    XLSX.utils.book_append_sheet(wb, ws3, 'Grupos de Referencia')

    XLSX.writeFile(wb, `Reporte_Adoptabilidad_DA_${new Date().toISOString().slice(0, 10)}.xlsx`)
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
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              Situación de las niñas, niños y adolescentes con carácter de adoptabilidad
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Dirección de Adopciones (DA) — Monitoreo Estratégico Nacional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Datos (.xlsx)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BOTONERA DE ESTADOS (TABS)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-700 block pl-1">
          Estado del Proceso de Adoptabilidad:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setSelectedEstado('ADOPTABLE')
              handleResetFilters()
            }}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition ${
              selectedEstado === 'ADOPTABLE'
                ? 'bg-white text-slate-900 border-2 border-blue-600 shadow-sm ring-1 ring-blue-500/20'
                : 'bg-slate-200/70 text-slate-600 border border-slate-300 hover:bg-white'
            }`}
          >
            ✓ ADOPTABLE (972)
          </button>

          <button
            onClick={() => {
              setSelectedEstado('DESIGNADO')
              handleResetFilters()
            }}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition ${
              selectedEstado === 'DESIGNADO'
                ? 'bg-white text-slate-900 border-2 border-blue-600 shadow-sm ring-1 ring-blue-500/20'
                : 'bg-slate-200/70 text-slate-600 border border-slate-300 hover:bg-white'
            }`}
          >
            DESIGNADO (145)
          </button>

          <button
            onClick={() => {
              setSelectedEstado('EVALUACIÓN')
              handleResetFilters()
            }}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition ${
              selectedEstado === 'EVALUACIÓN'
                ? 'bg-white text-slate-900 border-2 border-blue-600 shadow-sm ring-1 ring-blue-500/20'
                : 'bg-slate-200/70 text-slate-600 border border-slate-300 hover:bg-white'
            }`}
          >
            EVALUACIÓN (218)
          </button>

          <button
            onClick={() => {
              setSelectedEstado('SEGUIMIENTO')
              handleResetFilters()
            }}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition ${
              selectedEstado === 'SEGUIMIENTO'
                ? 'bg-white text-slate-900 border-2 border-blue-600 shadow-sm ring-1 ring-blue-500/20'
                : 'bg-slate-200/70 text-slate-600 border border-slate-300 hover:bg-white'
            }`}
          >
            SEGUIMIENTO (89)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CUERPO PRINCIPAL (3 COLUMNAS DEL POWERBI)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* COLUMNA IZQUIERDA: Ubicación Territorial y CAR (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Ubicación Territorial */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                Ubicación Territorial
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                Nacional
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-3 text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-base">
                📍
              </div>
              <p className="text-xs font-bold text-slate-800">Cobertura en 24 Regiones</p>
              <p className="text-[11px] text-slate-500">
                Puntos georreferenciados de NNA en centros de acogida residencial
              </p>
            </div>
          </div>

          {/* Ubicación por CAR */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Ubicación por CAR
              </span>
              <span className="text-[10px] text-slate-400">{filteredCars.length} centros</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar CAR..."
                value={searchCar}
                onChange={e => setSearchCar(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#D91B24] text-white text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="py-1.5 px-2">CAR</th>
                    <th className="py-1.5 px-2 text-right">Total NNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredCars.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-1.5 px-2 text-slate-700 max-w-[170px] truncate" title={c.car}>
                        {c.car}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                        {c.totalNna}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td className="py-1.5 px-2 text-slate-800">Total Mostrado</td>
                    <td className="py-1.5 px-2 text-right text-red-600 font-extrabold">
                      {filteredCars.reduce((acc, c) => acc + c.totalNna, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* COLUMNA CENTRAL: Matriz de Sedes + Demografía (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Matriz de Sedes y Rangos de Edad */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-extrabold text-slate-800">
                Sedes de la Dirección de Adopciones
              </span>
              {selectedSede && (
                <button
                  onClick={() => setSelectedSede(null)}
                  className="text-[10px] text-blue-600 hover:underline font-bold"
                >
                  Ver todas las sedes
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#D91B24] text-white text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2 px-2.5">Sede</th>
                    <th className="py-2 px-2 text-center">0 a 3 años</th>
                    <th className="py-2 px-2 text-center">4 a 6 años</th>
                    <th className="py-2 px-2 text-center">7 a 11 años</th>
                    <th className="py-2 px-2 text-center">12 a 17 años</th>
                    <th className="py-2 px-2.5 text-right bg-[#B91C1C]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {SEDES_DATA.map(s => {
                    const isSelected = selectedSede === s.sede
                    return (
                      <tr
                        key={s.sede}
                        onClick={() => setSelectedSede(isSelected ? null : s.sede)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-100/70 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-1.5 px-2.5 font-bold text-slate-800 flex items-center gap-1">
                          {isSelected && <span className="text-blue-600">●</span>}
                          {s.sede}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-700">
                          {s.edad0a3 === 0 ? <span className="text-slate-300">-</span> : s.edad0a3}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-700">{s.edad4a6}</td>
                        <td className="py-1.5 px-2 text-center text-slate-700">{s.edad7a11}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-red-700">{s.edad12a17}</td>
                        <td className="py-1.5 px-2.5 text-right font-black text-slate-900 bg-slate-50/60">
                          {s.total}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-red-50 font-bold border-t-2 border-red-500 text-xs">
                  <tr>
                    <td className="py-2 px-2.5 text-slate-900 font-black">Total</td>
                    <td className="py-2 px-2 text-center text-slate-900 font-black">36</td>
                    <td className="py-2 px-2 text-center text-slate-900 font-black">75</td>
                    <td className="py-2 px-2 text-center text-slate-900 font-black">214</td>
                    <td className="py-2 px-2 text-center text-red-700 font-black">647</td>
                    <td className="py-2 px-2.5 text-right text-red-700 font-black text-sm bg-red-100">
                      972
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Demografía: Sexo y Grupos de Edad con Iconos Grandes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-center text-center">
              
              {/* Niños */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                <span className="text-3xl text-blue-600 font-black leading-none">♂</span>
                <p className="text-xl font-black text-slate-900 mt-1">{countNinos}</p>
                <span className="text-[11px] font-bold text-slate-600">Niños</span>
              </div>

              {/* Niñas */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-pink-50/50 border border-pink-100">
                <span className="text-3xl text-pink-600 font-black leading-none">♀</span>
                <p className="text-xl font-black text-slate-900 mt-1">{countNinas}</p>
                <span className="text-[11px] font-bold text-slate-600">Niñas</span>
              </div>

              {/* 0 a 3 años */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-2xl">👶</span>
                <p className="text-xl font-black text-slate-900 mt-1">{count0a3}</p>
                <span className="text-[10px] font-semibold text-slate-500">0 a 3 años</span>
              </div>

              {/* 4 a 6 años */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-2xl">👧👦</span>
                <p className="text-xl font-black text-slate-900 mt-1">{count4a6}</p>
                <span className="text-[10px] font-semibold text-slate-500">4 a 6 años</span>
              </div>

              {/* 7 a 11 años */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-2xl">🧒</span>
                <p className="text-xl font-black text-slate-900 mt-1">{count7a11}</p>
                <span className="text-[10px] font-semibold text-slate-500">7 a 11 años</span>
              </div>

              {/* 12 a 17 años */}
              <div className="flex flex-col items-center p-2 rounded-xl bg-red-50 border border-red-200">
                <span className="text-2xl">🧑</span>
                <p className="text-xl font-black text-red-700 mt-1">{count12a17}</p>
                <span className="text-[10px] font-bold text-red-700">12 a 17 años</span>
              </div>

            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: Total Casos + Evaluación Psicosocial + Grupo Referencia (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Total de casos & Reset */}
          <div className="bg-white rounded-xl border-2 border-slate-300 p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
                Total de casos
              </span>
              <span className="text-3xl font-black text-slate-900">{totalCasos}</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="flex flex-col items-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-xl transition"
              title="Restablecer filtros"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-0.5">Restablecer</span>
            </button>
          </div>

          {/* Resultado de la evaluación psicosocial */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-1.5">
            <span className="text-xs font-bold text-slate-800 block">
              Resultado de la evaluación psicosocial
            </span>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#D91B24] text-white text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-1.5 px-2">Resultado de informe</th>
                    <th className="py-1.5 px-2 text-right">Total NNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {EVALUACION_DATA.map((e, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedEval(selectedEval === e.resultado ? null : e.resultado)}
                      className={`cursor-pointer transition ${
                        selectedEval === e.resultado ? 'bg-blue-100 font-bold' : e.color || 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-1.5 px-2 text-slate-800">{e.resultado}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">{e.totalNna}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td className="py-1.5 px-2 text-slate-800">Total</td>
                    <td className="py-1.5 px-2 text-right text-red-600 font-black">972</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Grupo de referencia */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-1.5">
            <span className="text-xs font-bold text-slate-800 block">
              Grupo de referencia
            </span>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#D91B24] text-white text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-1.5 px-2">Grupo de referencia</th>
                    <th className="py-1.5 px-2 text-right">Total NNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {GRUPOS_REF_DATA.map((g, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedGrupoRef(selectedGrupoRef === g.grupo ? null : g.grupo)}
                      className={`cursor-pointer transition ${
                        selectedGrupoRef === g.grupo ? 'bg-amber-100 font-bold' : g.color || 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-1.5 px-2 text-slate-800">{g.grupo}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">{g.totalNna}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td className="py-1.5 px-2 text-slate-800">Total</td>
                    <td className="py-1.5 px-2 text-right text-red-600 font-black">972</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER INSTITUCIONAL OFICIAL
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 bg-white p-3 rounded-xl shadow-2xs">
        <div>
          <strong className="text-slate-700">Elaborado:</strong> Dirección de Adopciones (DA) — DGNNA
        </div>
        <div>
          <strong className="text-slate-700">Fuente:</strong> Registro de Niñas, Niños y Adolescentes con Carácter de Adoptabilidad
        </div>
      </div>

    </div>
  )
}

