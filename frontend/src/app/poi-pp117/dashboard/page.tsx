'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMe } from '@/lib/use-me'
import { AppSidebar } from '@/components/app-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, BarChart3, DollarSign, Activity, AlertTriangle } from 'lucide-react'

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']

interface Kpis {
  totalAOs: number
  pctAvanceFisico: number
  pimTotal: number
  devengadoTotal: number
  pctFinanciero: number
}
interface Semaforo { verde: number; amarillo: number; rojo: number }
interface CcItem { cc: string; ccCompleto: string; pctFisico: number; pctFinanciero: number; ejecAcum: number; progAcum: number }
interface MensualItem { mes: string; prog: number; ejec: number }
interface DashData {
  mes: number; anio: number; mesNombre: string
  kpis: Kpis; semaforo: Semaforo
  porCC: CcItem[]; mensual: MensualItem[]
}

function numSoles(v: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(v)
}

const COLORS_SEMAFORO = ['#22c55e','#f59e0b','#ef4444']
const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value?.toLocaleString('es-PE')}</strong></p>
      ))}
    </div>
  )
}

export default function DashboardPOIPage() {
  const { me, loading: meLoading } = useMe()
  const [meses, setMeses] = useState<{ mes: number; anio: number; mesNombre: string }[]>([])
  const [periodo, setPeriodo] = useState('')
  const [tipo, setTipo] = useState<'dgnna'|'pp117'>('dgnna')
  const [data, setData] = useState<DashData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/poi-pp117/meses')
      .then(r => r.json())
      .then(list => {
        setMeses(list.map((c: any) => ({ mes: c.mes, anio: c.anio, mesNombre: c.mesNombre })))
        if (list.length) setPeriodo(`${list[0].mes}-${list[0].anio}`)
      })
      .catch(() => setError('Error cargando períodos'))
  }, [])

  const cargarDashboard = useCallback(async () => {
    if (!periodo) return
    const [mes, anio] = periodo.split('-')
    setCargando(true); setError('')
    try {
      const r = await fetch(`/api/poi-pp117/dashboard?mes=${mes}&anio=${anio}&tipo=${tipo}`)
      if (!r.ok) throw new Error((await r.json()).detail)
      setData(await r.json())
    } catch (e: any) {
      setError(e.message || 'Error cargando datos')
    } finally { setCargando(false) }
  }, [periodo, tipo])

  useEffect(() => { cargarDashboard() }, [cargarDashboard])

  if (meLoading) return <div className="p-8 text-gray-400">Cargando...</div>

  const kpi = data?.kpis
  const sem = data?.semaforo
  const total_sem = sem ? (sem.verde + sem.amarillo + sem.rojo) : 0

  const semaforoData = sem ? [
    { name: 'En meta (≥80%)',  value: sem.verde    },
    { name: 'En riesgo (50-79%)', value: sem.amarillo },
    { name: 'Crítico (<50%)', value: sem.rojo     },
  ] : []

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <div className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col gap-6">

      {/* ── Encabezado + Selectores ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard POI — PP 0117</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento de ejecución física y financiera</p>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Alcance</span>
            <Select value={tipo} onValueChange={v => setTipo(v as 'dgnna'|'pp117')}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dgnna">Solo DGNNA</SelectItem>
                <SelectItem value="pp117">PP 0117 completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
              {data.mesNombre} {data.anio}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {cargando && (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando datos...</div>
      )}

      {!cargando && data && (
        <>
          {/* ── KPI Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-blue-100">Actividades Op.</p>
                    <p className="text-3xl font-bold mt-1">{kpi?.totalAOs}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Avance Físico</p>
                    <p className={`text-3xl font-bold mt-1 ${
                      (kpi?.pctAvanceFisico||0) >= 80 ? 'text-green-600' :
                      (kpi?.pctAvanceFisico||0) >= 50 ? 'text-amber-500' : 'text-red-600'
                    }`}>{kpi?.pctAvanceFisico?.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className={`h-8 w-8 ${
                    (kpi?.pctAvanceFisico||0) >= 80 ? 'text-green-400' :
                    (kpi?.pctAvanceFisico||0) >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`} />
                </div>
                <div className="mt-2 bg-gray-100 rounded-full h-1.5 w-full">
                  <div className={`h-1.5 rounded-full transition-all ${
                    (kpi?.pctAvanceFisico||0) >= 80 ? 'bg-green-500' :
                    (kpi?.pctAvanceFisico||0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${Math.min(kpi?.pctAvanceFisico||0, 100)}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-500">PIM</p>
                    <p className="text-xl font-bold mt-1 text-gray-900">{numSoles(kpi?.pimTotal||0)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-indigo-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Devengado</p>
                    <p className="text-xl font-bold mt-1 text-gray-900">{numSoles(kpi?.devengadoTotal||0)}</p>
                    <p className={`text-xs mt-0.5 font-semibold ${
                      (kpi?.pctFinanciero||0) >= 80 ? 'text-green-600' :
                      (kpi?.pctFinanciero||0) >= 50 ? 'text-amber-500' : 'text-red-600'
                    }`}>{kpi?.pctFinanciero?.toFixed(1)}% ejecución fin.</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Gráficos fila 2: Semáforo + Avance por CC ────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donut semáforo */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Semáforo de actividades operativas
                  {total_sem > 0 && <span className="ml-2 font-normal text-gray-400">({total_sem} AO)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={semaforoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                           dataKey="value" startAngle={90} endAngle={-270}>
                        {semaforoData.map((_, i) => (
                          <Cell key={i} fill={COLORS_SEMAFORO[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: 'En meta (≥80%)', color: '#22c55e', val: sem?.verde },
                      { label: 'En riesgo', color: '#f59e0b', val: sem?.amarillo },
                      { label: 'Crítico (<50%)', color: '#ef4444', val: sem?.rojo },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate">{s.label}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-800">{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avance físico por CC */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Avance físico por Centro de Costo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={data.porCC} layout="vertical" margin={{ left: 0, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis dataKey="cc" type="category" tick={{ fontSize: 10 }} width={62} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} formatter={(v: any) => [`${v}%`]} />
                    <Bar dataKey="pctFisico" name="Avance físico" radius={[0,4,4,0]}>
                      {data.porCC.map((entry, i) => (
                        <Cell key={i} fill={
                          entry.pctFisico >= 80 ? '#22c55e' :
                          entry.pctFisico >= 50 ? '#f59e0b' : '#ef4444'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Gráfico mensual ──────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Programación vs Ejecución física acumulada mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.mensual} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="prog" name="Programado" fill="#93c5fd" radius={[4,4,0,0]} />
                  <Bar dataKey="ejec" name="Ejecutado"  fill="#2563eb" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── Detalle por CC: tabla resumen ────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Resumen por Centro de Costo — {data.mesNombre} {data.anio}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-3 text-gray-500 font-semibold">Centro de Costo</th>
                      <th className="text-right py-2 px-2 text-gray-500 font-semibold">Prog. Acum.</th>
                      <th className="text-right py-2 px-2 text-gray-500 font-semibold">Ejec. Acum.</th>
                      <th className="text-right py-2 px-2 text-gray-500 font-semibold">% Físico</th>
                      <th className="text-right py-2 px-2 text-gray-500 font-semibold">% Financ.</th>
                      <th className="text-center py-2 pl-2 text-gray-500 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porCC.map((cc, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2 pr-3 text-gray-700 font-medium max-w-[200px] truncate" title={cc.ccCompleto}>
                          {cc.ccCompleto}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-600">{cc.progAcum.toLocaleString('es-PE')}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{cc.ejecAcum.toLocaleString('es-PE')}</td>
                        <td className="py-2 px-2 text-right font-semibold">
                          <span className={cc.pctFisico >= 80 ? 'text-green-600' : cc.pctFisico >= 50 ? 'text-amber-500' : 'text-red-600'}>
                            {cc.pctFisico.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold">
                          <span className={cc.pctFinanciero >= 80 ? 'text-green-600' : cc.pctFinanciero >= 50 ? 'text-amber-500' : 'text-red-600'}>
                            {cc.pctFinanciero.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 pl-2 text-center">
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            cc.pctFisico >= 80 ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                            cc.pctFisico >= 50 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                            'bg-red-100 text-red-700 hover:bg-red-100'
                          }`}>
                            {cc.pctFisico >= 80 ? 'En meta' : cc.pctFisico >= 50 ? 'En riesgo' : 'Crítico'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
        </div>
      </div>
    </div>
  )
}
