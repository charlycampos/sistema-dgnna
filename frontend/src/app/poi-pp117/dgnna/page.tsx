'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMe } from '@/lib/use-me'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, AlertTriangle, ChevronDown, ChevronRight, LayoutList, Globe } from 'lucide-react'

const MESES_NOMBRES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']

interface ActividadRow {
  codAO: string; actividadOp: string; unidadMedida: string
  progAnual: number; progFinAnual: number
  progMes1: number; ejecMes1: number; pctMes1: number | null
  progAcum: number; ejecAcum: number; pctAvance: number | null
  pim: number; devengado: number; pctFinanciero: number | null
  metaPptal: string | number | null
  motivoMes: string | null
}
interface BloqueCC { cc: string; ccAlias: string; actividades: ActividadRow[] }
interface DgnnaData {
  mes: number; anio: number; mesNombre: string
  datos: ActividadRow[]; porCC: BloqueCC[]
}
interface UpeRow {
  departamento: string
  progAnual: number; progAcum: number; ejecAcum: number; pctAvance: number | null
  pim: number; devengado: number; pctFinanciero: number | null
  metaPptal: number | null; sinDatos: boolean
}
interface AoUpe { codAO: string; actividadOp: string; unidadMedida: string; upes: UpeRow[] }
interface UpeData { mes: number; anio: number; mesNombre: string; actividades: AoUpe[] }

type VistaTabla = 'tabla01' | 'tabla02'

function semaforoFisico(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  if (v >= 95) return 'bg-green-500'
  if (v >= 75) return 'bg-yellow-400'
  return 'bg-red-500'
}
function pctColor(v: number | null | undefined) {
  if (v === null || v === undefined) return 'text-gray-400'
  return v >= 95 ? 'text-green-600' : v >= 75 ? 'text-amber-500' : 'text-red-600'
}
function pctBg(v: number | null | undefined) {
  if (v === null || v === undefined) return ''
  return v < 75 ? 'bg-red-50' : v >= 95 ? 'bg-green-50' : 'bg-yellow-50'
}
function fmt(n: number | null | undefined, dec = 1) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

// TABLA 01 — por dirección
function Tabla01Section({ data01 }: { data01: DgnnaData }) {
  const [ccSeleccionado, setCcSeleccionado] = useState<string>('')

  useEffect(() => {
    if (data01.porCC.length > 0 && (!ccSeleccionado || !data01.porCC.find(b => b.cc === ccSeleccionado))) {
      setCcSeleccionado(data01.porCC[0].cc)
    }
  }, [data01, ccSeleccionado])

  if (data01.porCC.length === 0)
    return <p className="text-sm text-gray-400 text-center py-12">No hay datos para el periodo seleccionado</p>

  const bloque = data01.porCC.find(b => b.cc === ccSeleccionado)
  if (!bloque) return null

  const thDark = 'bg-[#293d5a] text-white text-center text-[10px] font-semibold px-2 py-2 border border-[#1d2d44] align-middle'
  const thOrange = 'bg-[#ed7d31] text-white text-center text-[10px] font-semibold px-2 py-1.5 border border-[#c65e1b] align-middle'
  const thGreen = 'bg-[#70ad47] text-white text-center text-[10px] font-semibold px-2 py-1.5 border border-[#508030] align-middle'

  return (
    <div className="space-y-4 mt-2">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
          <span className="font-medium text-gray-500">Semáforo físico:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 border border-gray-300 inline-block"/> Verde ≥95%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 border border-gray-300 inline-block"/> Amarillo 75-95%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 border border-gray-300 inline-block"/> Rojo &lt;75%</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Centro de Costo:</label>
          <select
            value={ccSeleccionado}
            onChange={e => setCcSeleccionado(e.target.value)}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px] shadow-sm"
          >
            {data01.porCC.map(b => (
              <option key={b.cc} value={b.cc}>{b.cc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-gray-300 shadow-sm">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th rowSpan={2} className={`${thDark} w-20`}>CENTRO DE<br/>COSTO</th>
              <th rowSpan={2} className={`${thDark} text-left px-3 min-w-[240px]`}>ACTIVIDAD OPERATIVA</th>
              <th rowSpan={2} className={`${thDark} w-16`}>UM</th>
              <th rowSpan={2} className={`${thDark} w-20 leading-tight`}>PROG.<br/>FISICA<br/>ANUAL</th>
              <th rowSpan={2} className={`${thDark} w-24 leading-tight`}>PROG.<br/>FINANCIERA<br/>ANUAL</th>
              <th colSpan={3} className={thOrange}>FISICO</th>
              <th rowSpan={2} className={`${thGreen} w-16 leading-tight`}>META<br/>PPTAL</th>
              <th colSpan={3} className={thGreen}>FINANCIERO (01.{String(new Date().getMonth()+1).padStart(2,'0')}.{data01.anio})</th>
            </tr>
            <tr>
              <th className={`${thOrange} w-16 leading-tight`}>PROG.<br/>ACUM.<br/>{data01.mesNombre.substring(0,3).toUpperCase()}.</th>
              <th className={`${thOrange} w-16 leading-tight`}>EJEC.<br/>ACUM.<br/>{data01.mesNombre.substring(0,3).toUpperCase()}.</th>
              <th className={`${thOrange} w-20 leading-tight`}>%<br/>AVANCE</th>
              <th className={`${thGreen} w-24`}>PIM</th>
              <th className={`${thGreen} w-24 leading-tight`}>EJEC.<br/>ACUM.<br/>{data01.mesNombre.substring(0,3).toUpperCase()}.</th>
              <th className={`${thGreen} w-20 leading-tight`}>%<br/>AVANCE</th>
            </tr>
          </thead>
          <tbody>
            {bloque.actividades.map((a, i) => (
              <tr key={i} className="hover:bg-blue-50/40">
                {i === 0 && (
                  <td rowSpan={bloque.actividades.length} className="border border-gray-300 px-2 py-1 text-center font-bold text-gray-700 align-middle bg-white text-[13px]">
                    {bloque.cc}
                  </td>
                )}
                <td className="border border-gray-200 px-3 py-2 text-[11px] text-gray-800 leading-snug">
                  {a.actividadOp}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-center text-[11px] text-gray-600">
                  {a.unidadMedida || '—'}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right text-[11px] tabular-nums text-gray-700">
                  {fmt(a.progAnual, 0)}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right text-[11px] tabular-nums text-gray-700">
                  {fmt(a.progFinAnual, 0)}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right text-[11px] tabular-nums text-gray-700">
                  {fmt(a.progAcum, 0)}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right text-[11px] tabular-nums text-gray-700">
                  {fmt(a.ejecAcum, 0)}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-center text-[11px]">
                  <span className="inline-flex items-center justify-center gap-1.5 w-full">
                    {a.pctAvance !== null && (
                      <span className={`inline-block w-3.5 h-3.5 rounded-full shrink-0 border border-gray-400 shadow-sm ${semaforoFisico(a.pctAvance)}`} />
                    )}
                    <span className="font-bold w-9 text-right text-gray-800">{a.pctAvance !== null ? `${Math.round(a.pctAvance)}%` : '—'}</span>
                  </span>
                </td>
                <td className="border border-gray-200 px-2 py-2 text-center text-[11px] text-gray-500">
                  {a.metaPptal != null ? a.metaPptal : '—'}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right text-[11px] tabular-nums text-gray-700">
                  {a.pim > 0 ? fmt(a.pim, 0) : '—'}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-right text-[11px] tabular-nums text-gray-700">
                  {a.devengado > 0 ? fmt(a.devengado, 0) : '—'}
                </td>
                <td className="border border-gray-200 px-2 py-2 text-center">
                  <BarraFinanciero pct={a.pctFinanciero} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BarraFinanciero({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-300 text-xs">—</span>
  const ancho = Math.min(pct, 100)
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-16 bg-gray-100 rounded-sm h-3 overflow-hidden border border-gray-300 shadow-inner">
        <div className="h-full bg-gradient-to-r from-[#9dc3e6] to-[#2e75b6] rounded-sm" style={{ width: `${ancho}%` }} />
      </div>
      <span className="text-[11px] text-gray-600 font-medium w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

// TABLA 02 — por UPE regional

function TablaAoUpe({ ao, idx, mesNombre, anio }: { ao: AoUpe; idx: number; mesNombre: string; anio: number }) {
  const anioCorto  = String(anio).slice(2)
  const fechaLabel = `${mesNombre}-${anioCorto}`

  const totalProgAnual = ao.upes.reduce((s, u) => s + u.progAnual, 0)
  const totalProg      = ao.upes.reduce((s, u) => s + u.progAcum,  0)
  const totalEjec      = ao.upes.reduce((s, u) => s + u.ejecAcum,  0)
  const totalPct       = totalProg > 0 ? totalEjec / totalProg * 100 : null
  const totalPim       = ao.upes.reduce((s, u) => s + u.pim,       0)
  const totalDev       = ao.upes.reduce((s, u) => s + u.devengado, 0)
  const totalPctF      = totalPim > 0 ? totalDev / totalPim * 100 : null

  const thH = 'bg-[#1e3a5f] text-white text-center text-[10px] font-semibold px-2 border border-[#2d5080] align-middle'
  const thS = 'bg-[#2563a8] text-white text-center text-[10px] font-semibold px-2 border border-[#3b72b8] align-middle'
  const thG = 'bg-[#4b6a88] text-white text-center text-[10px] font-semibold px-2 border border-[#5b7a98] align-middle'
  const td  = 'border border-gray-200 px-2 py-1 text-right text-[11px] tabular-nums text-gray-700'
  const tdc = 'border border-gray-200 px-2 py-1 text-center text-[11px]'

  return (
    <div className="overflow-x-auto rounded border border-gray-300 shadow-sm">
      <table className="text-xs border-collapse w-full">
        <thead>
          {/* Fila 1 */}
          <tr>
            <th rowSpan={3} className={`${thH} w-8 py-2`}>N°</th>
            <th rowSpan={3} className={`${thH} text-left px-3 py-2 min-w-[200px] leading-snug`}>
              <div className="text-blue-300 font-mono text-[10px]">AO {idx}:</div>
              <div className="font-semibold text-[11px] mt-0.5">{ao.actividadOp}</div>
            </th>
            <th rowSpan={3} className={`${thH} w-14 py-2 leading-tight`}>PROG.<br/>FÍSICO<br/>ANUAL</th>
            <th colSpan={3} className={`${thS} py-1.5`}>FÍSICO</th>
            <th rowSpan={3} className={`${thH} w-12 py-2 leading-tight`}>META<br/>PPTAL</th>
            <th colSpan={3} className={`${thG} py-1.5`}>FINANCIERO (01.{String(new Date().getMonth()+1).padStart(2,'0')}.{anio})</th>
          </tr>
          {/* Fila 2 */}
          <tr>
            <th colSpan={2} className={`${thS} py-1`}>{fechaLabel}</th>
            <th rowSpan={2} className={`${thS} w-16 py-1 leading-tight`}>%<br/>AVANCE</th>
            <th colSpan={2} className={`${thG} py-1`}>{fechaLabel}</th>
            <th rowSpan={2} className={`${thG} w-14 py-1 leading-tight`}>%<br/>AVANCE</th>
          </tr>
          {/* Fila 3 */}
          <tr>
            <th className={`${thS} w-14 py-1.5 leading-tight`}>PROGR.<br/>ACUM.</th>
            <th className={`${thS} w-14 py-1.5 leading-tight`}>EJEC.<br/>ACUM.</th>
            <th className={`${thG} w-20 py-1.5`}>PIM</th>
            <th className={`${thG} w-20 py-1.5 leading-tight`}>EJEC.<br/>ACUM.</th>
          </tr>
        </thead>
        <tbody>
          {ao.upes.map((upe, i) => {
            const pctF = upe.pim > 0 ? upe.pctFinanciero : null
            return (
              <tr key={i} className={`hover:bg-blue-50/40 ${upe.sinDatos ? '' : pctBg(upe.pctAvance)}`}>
                <td className={`${tdc} text-gray-400 w-8`}>{String(i+1).padStart(2,'0')}</td>
                <td className={`border border-gray-200 px-3 py-1 text-[11px] font-medium ${upe.sinDatos ? 'text-red-600' : 'text-gray-800'}`}>
                  {upe.departamento}
                </td>
                <td className={td}>{upe.sinDatos ? '—' : fmt(upe.progAnual, 0)}</td>
                <td className={td}>{upe.sinDatos ? '—' : fmt(upe.progAcum, 0)}</td>
                <td className={td}>{upe.sinDatos ? '—' : fmt(upe.ejecAcum, 0)}</td>
                {/* % AVANCE físico — círculo semáforo */}
                <td className={tdc}>
                  {upe.sinDatos ? '—' : (
                    <span className="inline-flex items-center justify-center gap-1">
                      <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${semaforoFisico(upe.pctAvance)}`} />
                      <span className={`font-semibold ${pctColor(upe.pctAvance)}`}>
                        {upe.pctAvance !== null ? `${Math.round(upe.pctAvance)}%` : '—'}
                      </span>
                    </span>
                  )}
                </td>
                {/* META PPTAL */}
                <td className={`${tdc} text-gray-500`}>
                  {upe.metaPptal != null ? upe.metaPptal : '—'}
                </td>
                {/* PIM */}
                <td className={td}>{upe.pim > 0 ? fmt(upe.pim, 0) : '—'}</td>
                {/* EJEC. ACUM. financiero */}
                <td className={td}>{upe.devengado > 0 ? fmt(upe.devengado, 0) : '—'}</td>
                {/* % AVANCE financiero */}
                <td className="border border-gray-200 px-2 py-1 text-center">
                  <BarraFinanciero pct={pctF} />
                </td>
              </tr>
            )
          })}
          {/* TOTAL */}
          <tr className="bg-[#dce8f5] font-bold text-[11px]">
            <td colSpan={2} className="border border-gray-300 px-3 py-1.5 text-blue-900 text-center">TOTAL</td>
            <td className={`${td} text-blue-900`}>{fmt(totalProgAnual, 0)}</td>
            <td className={`${td} text-blue-900`}>{fmt(totalProg, 0)}</td>
            <td className={`${td} text-blue-900`}>{fmt(totalEjec, 0)}</td>
            <td className={tdc}>
              <span className="inline-flex items-center justify-center gap-1">
                <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${semaforoFisico(totalPct)}`} />
                <span className={`font-bold ${pctColor(totalPct)}`}>
                  {totalPct !== null ? `${Math.round(totalPct)}%` : '—'}
                </span>
              </span>
            </td>
            <td className="border border-gray-300 px-2 py-1.5 text-center text-blue-900">—</td>
            <td className={`${td} text-blue-900`}>{fmt(totalPim, 0)}</td>
            <td className={`${td} text-blue-900`}>{fmt(totalDev, 0)}</td>
            <td className={`${tdc} bg-blue-100`}>
              <BarraFinanciero pct={totalPctF} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Tabla02Section({ dataUpe }: { dataUpe: UpeData }) {
  const [aoIdx, setAoIdx] = useState('0')
  const ao = dataUpe.actividades[Number(aoIdx)]

  if (dataUpe.actividades.length === 0)
    return <p className="text-sm text-gray-400 text-center py-12">No hay datos para el periodo seleccionado</p>

  return (
    <div className="space-y-4">
      {/* Leyenda semáforo + combo */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
          <span className="font-medium text-gray-500">Semáforo físico:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Verde ≥95%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"/> Amarillo 75-95%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/> Rojo &lt;75%</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Actividad Operativa:</label>
          <select
            value={aoIdx}
            onChange={e => setAoIdx(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[200px] max-w-xs"
          >
            {dataUpe.actividades.map((a, i) => (
              <option key={i} value={String(i)}>
                AO {i + 1} – {a.actividadOp.length > 55 ? a.actividadOp.slice(0, 55) + '…' : a.actividadOp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla del AO seleccionado */}
      {ao && (
        <TablaAoUpe ao={ao} idx={Number(aoIdx) + 1} mesNombre={dataUpe.mesNombre} anio={dataUpe.anio} />
      )}
    </div>
  )
}

// Página principal
export default function DgnnaPage() {
  const { loading: meLoading } = useMe()
  const [meses, setMeses] = useState<{ mes: number; anio: number; mesNombre: string }[]>([])
  const [periodo, setPeriodo] = useState('')
  const [vista, setVista] = useState<VistaTabla>('tabla01')
  const [data01, setData01] = useState<DgnnaData | null>(null)
  const [dataUpe, setDataUpe] = useState<UpeData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    fetch('/api/poi-pp117/meses')
      .then(r => r.json())
      .then(list => {
        setMeses(list.map((c: any) => ({ mes: c.mes, anio: c.anio, mesNombre: c.mesNombre })))
        if (list.length) setPeriodo(`${list[0].mes}-${list[0].anio}`)
      })
      .catch(() => setError('Error cargando periodos'))
  }, [])

  const cargar = useCallback(async () => {
    if (!periodo) return
    const [mes, anio] = periodo.split('-')
    setCargando(true); setError('')
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/poi-pp117/dgnna?mes=${mes}&anio=${anio}`),
        fetch(`/api/poi-pp117/dgnna-upe?mes=${mes}&anio=${anio}`),
      ])
      if (!r1.ok) throw new Error((await r1.json()).detail)
      if (!r2.ok) throw new Error((await r2.json()).detail)
      const d1 = await r1.json()
      const d2 = await r2.json()
      setData01(d1)
      setDataUpe(d2)
    } catch (e: any) {
      setError(e.message || 'Error cargando datos')
    } finally { setCargando(false) }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar])

  const descargar = async () => {
    if (!periodo) return
    const [mes, anio] = periodo.split('-')
    setDescargando(true)
    try {
      const r = await fetch(`/api/poi-pp117/descargar/dgnna?mes=${mes}&anio=${anio}`)
      if (!r.ok) throw new Error('Error generando Excel')
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url
      a.download = `Reporte-POI-DGNNA-${MESES_NOMBRES[(parseInt(mes)-1)]}${anio}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e: any) { alert(e.message) }
    finally { setDescargando(false) }
  }

  if (meLoading) return <div className="p-8 text-gray-400">Cargando...</div>

  return (
    <div className="flex flex-col gap-6 p-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ejecucion POI DGNNA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento de actividades operativas por direccion</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Periodo</span>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`}>
                    {m.mesNombre} {m.anio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={descargar} disabled={descargando || !data01} size="sm"
            className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {descargando ? 'Generando...' : 'Descargar Excel'}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setVista('tabla01')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            vista === 'tabla01' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutList className="h-3.5 w-3.5" /> TABLA 01 - Por direccion
        </button>
        <button
          onClick={() => setVista('tabla02')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            vista === 'tabla02' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="h-3.5 w-3.5" /> TABLA 02 - Por UPE regional
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {cargando && <div className="text-center py-16 text-gray-400 text-sm">Cargando datos...</div>}

      {!cargando && vista === 'tabla01' && data01 && (
        <Tabla01Section data01={data01} />
      )}

      {!cargando && vista === 'tabla02' && dataUpe && (
        <Tabla02Section dataUpe={dataUpe} />
      )}
    </div>
  )
}
