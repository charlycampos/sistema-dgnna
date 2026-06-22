'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useMe } from '@/lib/use-me'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

const MESES_NOMBRES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']

type Entidad = 'sector' | 'dgnna' | 'inabif' | 'conadis'

interface Dato {
  centroCosto: string; ccAlias: string
  codAO: string; actividadOp: string; unidadMedida: string
  actPresupId: string; actPresup: string
  categoriaId: string; categoria: string
  progAnual: number; progFinAnual: number
  progMeses: number[]; ejecMeses: number[]
  progAcum: number; ejecAcum: number; pctAvance: number | null
  pim: number; devengado: number; pctFinanciero: number | null
}
interface Ap {
  actPresupId: string; actPresup: string
  totalProg: number; totalEjec: number; pctAvance: number | null
  centros: Dato[]
}
interface Categoria {
  categoriaId: string; categoria: string
  totalProg: number; totalEjec: number; pctAvance: number | null
  aps: Ap[]
}
interface Pp117Data {
  mes: number; anio: number; mesNombre: string
  entidad: string; categorias: Categoria[]
}

function pctColor(v: number | null | undefined) {
  if (v === null || v === undefined) return 'text-gray-400'
  return v >= 80 ? 'text-green-600' : v >= 50 ? 'text-amber-500' : 'text-red-600'
}
function pctBg(v: number | null | undefined) {
  if (v === null || v === undefined) return ''
  return v < 50 ? 'bg-red-50' : v >= 80 ? 'bg-green-50' : ''
}
function fmt(n: number | null | undefined, dec = 1) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function FilaProducto({ cat, mes, mesNombre, abierto, onToggle }: {
  cat: Categoria; mes: number; mesNombre: string
  abierto: boolean; onToggle: () => void
}) {
  return (
    <tr
      onClick={onToggle}
      className="cursor-pointer bg-gradient-to-r from-blue-900 to-blue-800 text-white hover:from-blue-800 select-none"
    >
      <td className="px-3 py-2 font-bold text-xs border-r border-blue-700 w-8">
        {abierto ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />}
      </td>
      <td className="px-3 py-2 font-bold text-xs" colSpan={2 + mes}>
        {cat.categoriaId} — {cat.categoria || cat.categoriaId}
      </td>
      <td className="text-right px-2 py-2 text-xs font-bold border-l border-blue-700">
        {fmt(cat.totalProg, 0)}
      </td>
      <td className="text-right px-2 py-2 text-xs font-bold">
        {fmt(cat.totalEjec, 0)}
      </td>
      <td className={`text-center px-2 py-2 text-xs font-bold ${pctColor(cat.pctAvance)}`}>
        {cat.pctAvance !== null ? `${fmt(cat.pctAvance)}%` : '—'}
      </td>
      <td colSpan={3} />
    </tr>
  )
}

function FilaAP({ ap, mes, mesNombre, abierto, onToggle }: {
  ap: Ap; mes: number; mesNombre: string
  abierto: boolean; onToggle: () => void
}) {
  return (
    <tr
      onClick={onToggle}
      className="cursor-pointer bg-blue-50 hover:bg-blue-100 select-none"
    >
      <td className="px-3 py-1.5 text-xs text-blue-600 border-r border-blue-100 pl-6">
        {abierto ? <ChevronDown className="h-3 w-3 inline" /> : <ChevronRight className="h-3 w-3 inline" />}
      </td>
      <td className="px-3 py-1.5 text-xs font-semibold text-blue-800" colSpan={2 + mes}>
        {ap.actPresupId}. {ap.actPresup || ap.actPresupId}
      </td>
      <td className="text-right px-2 py-1.5 text-xs font-semibold text-blue-800 border-l border-blue-200">
        {fmt(ap.totalProg, 0)}
      </td>
      <td className="text-right px-2 py-1.5 text-xs font-semibold text-blue-800">
        {fmt(ap.totalEjec, 0)}
      </td>
      <td className={`text-center px-2 py-1.5 text-xs font-semibold ${pctColor(ap.pctAvance)}`}>
        {ap.pctAvance !== null ? `${fmt(ap.pctAvance)}%` : '—'}
      </td>
      <td colSpan={3} />
    </tr>
  )
}

function TablaPP117({ data }: { data: Pp117Data }) {
  const { mes, mesNombre, categorias } = data
  const [abiertoCat, setAbiertoCat] = useState<Record<string, boolean>>({})
  const [abiertoAp, setAbiertoAp]   = useState<Record<string, boolean>>({})

  useEffect(() => {
    const ac: Record<string, boolean> = {}
    const aa: Record<string, boolean> = {}
    categorias.forEach(c => {
      ac[c.categoriaId] = true
      c.aps.forEach(a => { aa[`${c.categoriaId}-${a.actPresupId}`] = true })
    })
    setAbiertoCat(ac); setAbiertoAp(aa)
  }, [categorias])

  const toggleCat = (id: string) => setAbiertoCat(p => ({ ...p, [id]: !p[id] }))
  const toggleAp  = (id: string) => setAbiertoAp(p => ({ ...p, [id]: !p[id] }))

  const colSpanMeses = mes

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-xs min-w-[900px]">
        <thead>
          <tr>
            <th className="bg-blue-900 text-white text-center px-2 py-2 w-8" />
            <th className="bg-blue-900 text-white text-left px-3 py-2 w-20">CC</th>
            <th className="bg-blue-900 text-white text-left px-3 py-2 min-w-[220px]">Producto / AP / Actividad</th>
            {MESES_NOMBRES.slice(0, mes).map(m => (
              <th key={m} className="bg-blue-700 text-white text-center px-2 py-2 w-14">{m}</th>
            ))}
            <th className="bg-blue-800 text-white text-center px-2 py-2 w-20">Prog. Acum.</th>
            <th className="bg-blue-800 text-white text-center px-2 py-2 w-20">Ejec. Acum.</th>
            <th className="bg-blue-800 text-white text-center px-2 py-2 w-16">% Fís.</th>
            <th className="bg-gray-700 text-white text-center px-2 py-2 w-22">PIM</th>
            <th className="bg-gray-700 text-white text-center px-2 py-2 w-22">Devengado</th>
            <th className="bg-gray-700 text-white text-center px-2 py-2 w-16">% Fin.</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map(cat => (
            <Fragment key={`cat-${cat.categoriaId}`}>
              <FilaProducto
                cat={cat} mes={mes} mesNombre={mesNombre}
                abierto={!!abiertoCat[cat.categoriaId]}
                onToggle={() => toggleCat(cat.categoriaId)}
              />
              {abiertoCat[cat.categoriaId] && cat.aps.map(ap => {
                const apKey = `${cat.categoriaId}-${ap.actPresupId}`
                return (
                  <Fragment key={`ap-${apKey}`}>
                    <FilaAP
                      ap={ap} mes={mes} mesNombre={mesNombre}
                      abierto={!!abiertoAp[apKey]}
                      onToggle={() => toggleAp(apKey)}
                    />
                    {abiertoAp[apKey] && ap.centros.map((d, i) => (
                      <tr key={`d-${apKey}-${i}`} className={`border-b border-gray-100 hover:bg-blue-50/20 ${pctBg(d.pctAvance)}`}>
                        <td className="border-r border-gray-100" />
                        <td className="px-3 py-1.5 text-blue-600 font-semibold text-[10px]">{d.ccAlias}</td>
                        <td className="px-3 py-1.5 text-gray-700">
                          <span className="font-mono text-[10px] text-gray-400 mr-1">{d.codAO}</span>
                          {d.actividadOp}
                        </td>
                        {d.progMeses.slice(0, mes).map((v, j) => (
                          <td key={j} className="text-right px-2 py-1.5 text-gray-500 border-l border-gray-100">{fmt(v, 0)}</td>
                        ))}
                        <td className="text-right px-2 py-1.5 text-gray-700 font-medium border-l border-gray-200">{fmt(d.progAcum, 0)}</td>
                        <td className="text-right px-2 py-1.5 text-gray-700 font-medium">{fmt(d.ejecAcum, 0)}</td>
                        <td className={`text-center px-2 py-1.5 font-bold ${pctColor(d.pctAvance)}`}>
                          {d.pctAvance !== null ? `${fmt(d.pctAvance)}%` : '—'}
                        </td>
                        <td className="text-right px-2 py-1.5 text-gray-600 border-l border-gray-200">{fmt(d.pim, 0)}</td>
                        <td className="text-right px-2 py-1.5 text-gray-600">{fmt(d.devengado, 0)}</td>
                        <td className={`text-center px-2 py-1.5 font-semibold ${pctColor(d.pctFinanciero)}`}>
                          {d.pctFinanciero !== null ? `${fmt(d.pctFinanciero)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ENTIDADES: { value: Entidad; label: string; color: string }[] = [
  { value: 'sector',  label: 'Sector MIMP',  color: 'bg-blue-700 text-white' },
  { value: 'dgnna',  label: 'DGNNA',         color: 'bg-indigo-600 text-white' },
  { value: 'inabif', label: 'INABIF',         color: 'bg-violet-600 text-white' },
  { value: 'conadis',label: 'CONADIS',        color: 'bg-purple-600 text-white' },
]

export default function Pp117Page() {
  const { me, loading: meLoading } = useMe()
  const [meses, setMeses]   = useState<{ mes: number; anio: number; mesNombre: string }[]>([])
  const [periodo, setPeriodo] = useState('')
  const [entidad, setEntidad] = useState<Entidad>('sector')
  const [data, setData]     = useState<Pp117Data | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError]   = useState('')
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    fetch('/api/poi-pp117/meses')
      .then(r => r.json())
      .then(list => {
        setMeses(list.map((c: any) => ({ mes: c.mes, anio: c.anio, mesNombre: c.mesNombre })))
        if (list.length) setPeriodo(`${list[0].mes}-${list[0].anio}`)
      })
      .catch(() => setError('Error cargando períodos'))
  }, [])

  const cargar = useCallback(async () => {
    if (!periodo) return
    const [mes, anio] = periodo.split('-')
    setCargando(true); setError('')
    try {
      const r = await fetch(`/api/poi-pp117/estructura-pp117?mes=${mes}&anio=${anio}&entidad=${entidad}`)
      if (!r.ok) throw new Error((await r.json()).detail)
      setData(await r.json())
    } catch (e: any) {
      setError(e.message || 'Error cargando datos')
    } finally { setCargando(false) }
  }, [periodo, entidad])

  useEffect(() => { cargar() }, [cargar])

  const descargar = async () => {
    if (!periodo) return
    const [mes, anio] = periodo.split('-')
    setDescargando(true)
    try {
      const r = await fetch(`/api/poi-pp117/descargar/pp117?mes=${mes}&anio=${anio}`)
      if (!r.ok) throw new Error('Error generando Excel')
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url
      a.download = `Reporte-PP0117-${MESES_NOMBRES[(parseInt(mes)-1)]}${anio}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e: any) { alert(e.message) }
    finally { setDescargando(false) }
  }

  if (meLoading) return <div className="p-8 text-gray-400">Cargando...</div>

  const totalProg = data?.categorias.reduce((s,c) => s + c.totalProg, 0) || 0
  const totalEjec = data?.categorias.reduce((s,c) => s + c.totalEjec, 0) || 0
  const pctTotal  = totalProg > 0 ? totalEjec/totalProg*100 : null

  return (
    <div className="flex flex-col gap-6 p-6 max-w-full">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ejecución PP 0117</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tablero jerárquico: Producto → Actividad Presupuestal → Centro de Costo</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Período</span>
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
          <Button onClick={descargar} disabled={descargando || !data} size="sm"
            className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {descargando ? 'Generando...' : 'Descargar Excel (todas las entidades)'}
          </Button>
        </div>
      </div>

      {/* Selector de entidad */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Ver:</span>
        {ENTIDADES.map(e => (
          <button
            key={e.value}
            onClick={() => setEntidad(e.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              entidad === e.value
                ? `${e.color} border-transparent shadow`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* KPI rápido */}
      {data && (
        <div className="flex items-center gap-6 px-4 py-3 bg-blue-50 rounded-xl text-sm">
          <span className="font-semibold text-blue-900">
            {ENTIDADES.find(e => e.value === entidad)?.label}
          </span>
          <span className="text-gray-500">·</span>
          <span className="text-gray-600">
            Prog. acum.: <strong className="text-gray-900">{fmt(totalProg, 0)}</strong>
          </span>
          <span className="text-gray-600">
            Ejec. acum.: <strong className="text-gray-900">{fmt(totalEjec, 0)}</strong>
          </span>
          <Badge className={`text-xs ${
            (pctTotal||0) >= 80 ? 'bg-green-100 text-green-700 hover:bg-green-100' :
            (pctTotal||0) >= 50 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
            'bg-red-100 text-red-700 hover:bg-red-100'
          }`}>
            {pctTotal !== null ? `${fmt(pctTotal)}% avance` : '—'}
          </Badge>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {cargando && <div className="text-center py-16 text-gray-400 text-sm">Cargando datos...</div>}

      {!cargando && data && data.categorias.length > 0 && (
        <TablaPP117 data={data} />
      )}

      {!cargando && data && data.categorias.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">
          No hay datos registrados para {ENTIDADES.find(e => e.value === entidad)?.label} en este período
        </p>
      )}
    </div>
  )
}
