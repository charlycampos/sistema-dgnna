'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'
import { PeruMap } from '@/components/seguimiento/peru-map'
import { NIVELES, evaluarLogro } from '@/lib/semaforo-metas'
import {
  BarChart3,
  Layers,
  FileSpreadsheet,
  Clock,
  RefreshCw,
  Target,
  Activity,
  ChevronRight,
  Timer,
} from 'lucide-react'

interface IndicadorCardData {
  codigo: string
  nombre: string
  nombreCorto: string
  producto: string
  metaAnual: number | null
  metaMef?: number | null
  metaMefSetiembre?: number
  unidad: string
  frecuencia: string
  hoja: string
  habilitado: boolean
  descripcion: string
  tieneCarga: boolean
  cargaId: string | null
  valor: number | null
  numerador: number | null
  denominador: number | null
  totalSesiones: number | null
  corte: string | null
  mes: number | null
  anio: number | null
  fechaCarga: string | null
}

interface Analytics4390 {
  demografia: {
    hombres: number
    mujeres: number
    pctHombres: number
    pctMujeres: number
  }
  sesionesEstructura: Array<{
    sesion: string
    label: string
    presencial: number
    remoto: number
    mixto: number
    total: number
  }>
  continuidadRegional: Array<{
    departamento: string
    nna1: number
    nna3: number
    nna5: number
    tasaRetencion: number
    tasaContinuidad: number
    tasaFinalizacion: number
  }>
  edadesComparativa: Array<{
    grupo: string
    total1: number
    cumplen3: number
    pct: number
  }>
  curvaMensual: Array<{
    mes: number
    mesNombre: string
    presencial: number
    remoto: number
    mixto: number
    total: number
  }>
  intensidadCuencas: Array<{
    cuenca: string
    promedio: number
    totalNna: number
  }>
  matrizRegionEdad: Array<{
    departamento: string
    grupo: string
    nna1: number
    nna3: number
    pct3: number
    nna5: number
    pct5: number
  }>
  tiemposProceso: {
    promedio: number
    mediana: number
    p25: number
    p75: number
    maximo: number
    minimo: number
    totalCasos: number
    scatterSample: Array<[number, number]>
  }
}

interface ResumenData {
  hayDatos: boolean
  mensaje?: string
  info?: { codigo?: string; nombre?: string; [k: string]: unknown }
  carga?: {
    id: string
    indicador: string
    mes: number
    anio: number
    mesNombre: string
    nombreArchivo: string
    createdAt: string
    cargadoPor: string
  }
  kpi?: {
    numerador: number
    denominador: number
    porcentaje: number
    totalSesiones: number
    metaMefSetiembre?: number | null
    metaMef?: number | null
    metaAnual?: number | null
  }
  desglose?: {
    porDepartamento: Array<{ departamento: string; total: number; cumplen: number; porcentaje: number }>
    porTipoIntervencion: Array<{ tipoIntervencion: string; total: number; cumplen: number; porcentaje: number }>
    porGrupoEdad: Array<{ grupoEdad: string; total: number; cumplen: number; porcentaje: number }>
  }
  analytics4390?: Analytics4390
}

const fmtN = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('es-PE'))
const aMeses = (dias: number | null | undefined) => (dias == null ? '' : `(~${(dias / 30.4).toFixed(1)} meses)`)

export default function SeguimientoDashboardPage() {
  const router = useRouter()
  const { me, loading, hasAccess } = useMe()

  const [indicadores, setIndicadores] = useState<IndicadorCardData[]>([])
  const [indicadorActivo, setIndicadorActivo] = useState<string>('4390')
  const [tabActiva, setTabActiva] = useState<'lamina1' | 'lamina2'>('lamina1')
  const [data, setData] = useState<ResumenData | null>(null)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(true)
  // Corte pedido por URL (?indicador=&mes=&anio=), p. ej. desde la Bandeja de metas
  const [corteUrl, setCorteUrl] = useState<{ indicador: string; mes: number; anio: number } | null>(null)
  const [urlLeida, setUrlLeida] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const ind = p.get('indicador')
    const mes = Number(p.get('mes'))
    const anio = Number(p.get('anio'))
    if (ind) {
      setIndicadorActivo(ind)
      if (mes >= 1 && mes <= 12 && anio >= 2020) setCorteUrl({ indicador: ind, mes, anio })
    }
    setUrlLeida(true)
  }, [])

  useEffect(() => {
    if (!loading && me && !hasAccess('poi-pp117')) router.replace('/menu')
  }, [me, loading, hasAccess, router])

  const cargarIndicadores = useCallback(async () => {
    setCargandoLista(true)
    try {
      const res = await fetch('/api/poi-pp117/seguimiento/indicadores')
      if (res.ok) {
        const json: IndicadorCardData[] = await res.json()
        setIndicadores(json)
      } else {
        toast.error('No se pudo cargar la lista de indicadores')
      }
    } catch {
      toast.error('Error al consultar indicadores de seguimiento')
    } finally {
      setCargandoLista(false)
    }
  }, [])

  const cargarDetalle = useCallback(async (cod: string) => {
    setCargandoDetalle(true)
    try {
      const corte = corteUrl && corteUrl.indicador === cod ? `&mes=${corteUrl.mes}&anio=${corteUrl.anio}` : ''
      const res = await fetch(`/api/poi-pp117/seguimiento/resumen?indicador=${encodeURIComponent(cod)}${corte}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        toast.error('No se pudo obtener el detalle del indicador')
      }
    } catch {
      toast.error('Error al consultar el resumen del indicador')
    } finally {
      setCargandoDetalle(false)
    }
  }, [corteUrl])

  useEffect(() => {
    cargarIndicadores()
  }, [cargarIndicadores])

  useEffect(() => {
    if (urlLeida && indicadorActivo) {
      cargarDetalle(indicadorActivo)
    }
  }, [urlLeida, indicadorActivo, cargarDetalle])

  const indicadorSeleccionado = indicadores.find((i) => i.codigo === indicadorActivo)

  // Datos para el mapa
  const mapaRegional: { [key: string]: { nna1: number; nna3: number; nna5: number; tasaRetencion: number } } = {}
  if (data?.analytics4390?.continuidadRegional) {
    data.analytics4390.continuidadRegional.forEach((r) => {
      const depKey = r.departamento.toUpperCase()
      mapaRegional[depKey] = {
        nna1: r.nna1,
        nna3: r.nna3,
        nna5: r.nna5,
        tasaRetencion: r.tasaRetencion,
      }
    })
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <AppSidebar />

      <main className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen min-w-0">
        {/* ENCABEZADO SUPERIOR */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>PP 0117</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Seguimiento Físico</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-blue-900">Tablero Ejecutivo (10 Indicadores)</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Tablero de Seguimiento Mensual · PP 0117</span>
                {data?.hayDatos && data.carga && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200 font-medium">
                    Corte {data.carga.mesNombre} {data.carga.anio}
                  </Badge>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cargarIndicadores()
                  if (indicadorActivo) cargarDetalle(indicadorActivo)
                }}
                className="gap-1.5 text-xs text-slate-700 hover:text-slate-900"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </Button>
              <Link href="/poi-pp117/seguimiento/carga">
                <Button size="sm" className="gap-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Cargar Archivo Excel
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6 space-y-6 max-w-[1700px] w-full mx-auto">
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 1. GRILLA SUPERIOR DE 10 INDICADORES PRIORIZADOS                   */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Indicadores Priorizados del Programa Presupuestal 0117
              </h2>
              <span className="text-xs text-slate-500">
                Selecciona una casilla para ver sus láminas analíticas y desglose territorial
              </span>
            </div>

            {cargandoLista ? (
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse p-3" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
                {indicadores.map((ind) => {
                  const isActive = ind.codigo === indicadorActivo
                  const meta = ind.metaMef ?? null
                  const ev =
                    ind.tieneCarga && ind.valor !== null && ind.mes
                      ? evaluarLogro(ind.valor, ind.mes, ind.metaMef, ind.metaAnual)
                      : null
                  const estilo = ev ? NIVELES[ev.nivel] : null

                  return (
                    <div
                      key={ind.codigo}
                      onClick={() => setIndicadorActivo(ind.codigo)}
                      className={`rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between h-28 border select-none ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ind.codigo}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{meta != null ? `Meta: ${meta}%` : 'Sin meta'}</span>
                      </div>

                      <p
                        className={`text-[11px] font-semibold line-clamp-2 leading-tight ${
                          isActive ? 'text-blue-950 font-bold' : 'text-slate-700'
                        }`}
                        title={ind.nombre}
                      >
                        {ind.nombreCorto}
                      </p>

                      <div className="flex items-baseline justify-between border-t border-slate-100 pt-1">
                        {ind.tieneCarga && ind.valor !== null ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-extrabold font-mono text-slate-900">{ind.valor}%</span>
                            {estilo && (
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: estilo.dot }}
                                title={`${estilo.label}: ${ev?.cumplimiento}% de la meta`}
                              ></span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pendiente</span>
                        )}
                        <span className="text-[10px] text-slate-400">{ind.frecuencia.split(' ')[0]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* 2. DETALLE ANALÍTICO DEL INDICADOR SELECCIONADO                   */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {cargandoDetalle ? (
            <Card className="border border-slate-200 shadow-sm p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Cargando visualización analítica oficial...</p>
              </div>
            </Card>
          ) : !data || !data.hayDatos ? (
            /* Estado cuando el indicador no tiene archivo cargado aún */
            <Card className="border border-slate-200 shadow-sm p-8 bg-white">
              <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 bg-slate-100 text-slate-700 border-slate-200">
                    Indicador {indicadorSeleccionado?.codigo} · {indicadorSeleccionado?.frecuencia}
                  </Badge>
                  <h3 className="text-lg font-bold text-slate-900">{indicadorSeleccionado?.nombre}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{indicadorSeleccionado?.descripcion}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Producto</span>
                    <strong className="text-slate-800 text-[11px] font-sans">
                      {indicadorSeleccionado?.producto.split('—')[0]}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Meta MEF</span>
                    <strong className="text-blue-900 text-sm">
                      {indicadorSeleccionado?.metaMef != null ? `${indicadorSeleccionado.metaMef}%` : 'Sin registrar'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-sans">Unidad</span>
                    <strong className="text-slate-800">{indicadorSeleccionado?.unidad}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/poi-pp117/seguimiento/carga?indicador=${indicadorSeleccionado?.codigo}`}>
                    <Button className="bg-blue-700 hover:bg-blue-800 text-white gap-2 text-xs">
                      <FileSpreadsheet className="w-4 h-4" />
                      Cargar Archivo Excel para este Indicador
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* CARD EJECUTIVO DEL INDICADOR (COMPACTO) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                {/* Cabecera del Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700">
                      <Target className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      INDICADOR DE DESEMPEÑO {data.info?.codigo ?? data.carga?.indicador} (PP 0117)
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-slate-900 text-white font-mono text-xs px-2.5 py-0.5 self-start sm:self-auto border-0">
                    Corte: {data.carga?.mesNombre} {data.carga?.anio}
                  </Badge>
                </div>

                {/* Título y Fórmula */}
                <div className="mb-3">
                  <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                    {data.info?.nombre}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Numerador: NNA con &ge; 3 sesiones formativas / Denominador: Total NNA atendidos (hoja Nominal)
                  </p>
                </div>

                {/* Fila Principal: Valor KPI + Barra de Avance + 3 Métricas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
                  {/* Columna Izquierda: Valor principal y Barra de Avance con Meta (7 Cols) */}
                  <div className="lg:col-span-7 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-4">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-3xl md:text-4xl font-extrabold font-mono text-blue-950 tracking-tight">
                        {data.kpi?.porcentaje}%
                      </span>
                      {(() => {
                        const val = data.kpi?.porcentaje
                        const ev =
                          val != null && data.carga
                            ? evaluarLogro(val, data.carga.mes, data.kpi?.metaMef, data.kpi?.metaAnual)
                            : null
                        if (!ev) {
                          return (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                              Sin meta registrada para {data.carga?.anio} · regístrala en la Bandeja de metas
                            </span>
                          )
                        }
                        const st = NIVELES[ev.nivel]
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border"
                              style={{ backgroundColor: st.bg, color: st.fg, borderColor: st.bd }}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.dot }}></span>
                              {st.label}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {ev.cumplimiento}% de la meta ({ev.brecha >= 0 ? '+' : '−'}
                              {Math.abs(ev.brecha).toFixed(2)} pp sobre {ev.meta.toFixed(2)}%
                              {ev.base === 'anual' ? ', meta anual prorrateada' : ''})
                            </span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Barra de Progreso con Marcador de Meta */}
                    {(() => {
                      const val = data.kpi?.porcentaje ?? 0
                      const meta = data.kpi?.metaMef ?? null
                      return (
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                            <span>Logro: <strong className="text-blue-900 font-mono">{data.kpi?.porcentaje}%</strong></span>
                            <span>
                              Meta MEF ({data.carga?.mesNombre} {data.carga?.anio}):{' '}
                              <strong className="text-slate-800 font-mono">{meta != null ? `${meta}%` : '—'}</strong>
                            </span>
                          </div>
                          <div className="relative w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                            />
                            {meta != null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500"
                                style={{ left: `${Math.min(100, Math.max(0, meta))}%` }}
                                title={`Meta: ${meta}%`}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Columna Derecha: 3 Métricas en Casillas Compactas (5 Cols) */}
                  <div className="lg:col-span-5 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-600 font-medium leading-tight">Cumplen &ge; 3 Sesiones</span>
                      <strong className="text-lg md:text-xl font-bold font-mono text-emerald-700 my-0.5">
                        {fmtN(data.kpi?.numerador)}
                      </strong>
                      <span className="text-[10px] text-slate-400">Numerador</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-600 font-medium leading-tight">Total NNA Atendidos</span>
                      <strong className="text-lg md:text-xl font-bold font-mono text-slate-900 my-0.5">
                        {fmtN(data.kpi?.denominador)}
                      </strong>
                      <span className="text-[10px] text-slate-400">Denominador</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-600 font-medium leading-tight">Total Sesiones Dadas</span>
                      <strong className="text-lg md:text-xl font-bold font-mono text-purple-700 my-0.5">
                        {fmtN(data.kpi?.totalSesiones)}
                      </strong>
                      <span className="text-[10px] text-slate-400">Fechas registradas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SELECTOR DE LÁMINAS TIPO TABS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTabActiva('lamina1')}
                    className={`px-4 py-2.5 text-xs rounded-t-lg transition-colors flex items-center gap-2 border-t-2 ${
                      tabActiva === 'lamina1'
                        ? 'border-t-blue-700 bg-blue-50/40 text-blue-900 font-bold'
                        : 'border-t-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-blue-700" />
                    <strong>Lámina 1: Cobertura, Estructura y Continuidad</strong>
                  </button>
                  <button
                    onClick={() => setTabActiva('lamina2')}
                    className={`px-4 py-2.5 text-xs rounded-t-lg transition-colors flex items-center gap-2 border-t-2 ${
                      tabActiva === 'lamina2'
                        ? 'border-t-blue-700 bg-blue-50/40 text-blue-900 font-bold'
                        : 'border-t-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-blue-700" />
                    <strong>Lámina 2: Dinámica Temporal y Tiempos de Proceso</strong>
                  </button>
                </div>
                <div className="text-xs text-slate-500 pb-2 flex items-center gap-2">
                  <span>
                    Archivo: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">{data.carga?.nombreArchivo}</code>
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono text-slate-600">N={fmtN(data.kpi?.denominador)} NNA</span>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* LÁMINA 1: COBERTURA, ESTRUCTURA Y CONTINUIDAD                 */}
              {/* ───────────────────────────────────────────────────────────── */}
              {tabActiva === 'lamina1' && (
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl p-5 shadow-xs space-y-5">
                  {/* BANNER SUPERIOR OFICIAL */}
                  <div className="bg-[#2b4c6f] text-white p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <h3 className="font-bold tracking-wide text-xs sm:text-sm uppercase flex items-center gap-2">
                      <Target className="w-4 h-4 text-sky-300" />
                      Porcentaje de niñas, niños y adolescentes que reciben al menos 3 sesiones
                    </h3>
                    <div className="bg-white text-slate-900 px-3 py-1 rounded-md font-mono text-xs font-bold border shadow-xs flex items-center gap-2 self-start sm:self-auto">
                      <span>TOTAL</span>
                      <span className="text-blue-700 text-sm">{data.kpi?.porcentaje}% (3S)</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-purple-800 text-xs">
                        {data.analytics4390?.continuidadRegional?.find((r) => r.departamento === 'Total')?.tasaFinalizacion ?? '—'}% (5S)
                      </span>
                    </div>
                  </div>

                  {/* FILA SUPERIOR: MAPA + EDAD/MODALIDAD + SESIONES COMPLETADAS */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* 1. COBERTURA REGIONAL + SEXO (4 Cols) */}
                    <div className="lg:col-span-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 underline decoration-blue-500 underline-offset-4 flex items-center justify-between">
                          <span>Cobertura Territorial</span>
                          <span className="text-[10px] text-slate-500 font-normal no-underline">
                            {(data.analytics4390?.continuidadRegional ?? []).filter((r) => r.departamento !== 'Total').map((r) => r.departamento).join(' · ')}
                          </span>
                        </h4>

                        {/* Proporción por Sexo con Pictogramas y Mapa Vectorial */}
                        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs">
                          {/* Pictogramas Hombres vs Mujeres */}
                          <div className="flex flex-col items-center justify-center space-y-2 text-center w-28 shrink-0 border-r border-slate-100 pr-2">
                            <div className="text-xs font-bold text-slate-800">
                              <span className="text-xs font-extrabold text-blue-900 block font-mono">
                                {data.analytics4390?.demografia.pctHombres ?? '—'} %
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({fmtN(data.analytics4390?.demografia.hombres)} NNA)
                              </span>
                            </div>
                            <div className="text-2xl my-1 flex items-center justify-center gap-1.5 text-slate-700">
                              <span title="Niños / Hombres">👦</span>
                              <span title="Niñas / Mujeres">👧</span>
                            </div>
                            <div className="text-xs font-bold text-slate-800">
                              <span className="text-xs font-extrabold text-purple-900 block font-mono">
                                {data.analytics4390?.demografia.pctMujeres ?? '—'} %
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({fmtN(data.analytics4390?.demografia.mujeres)} NNA)
                              </span>
                            </div>
                          </div>

                          {/* Mapa Vectorial SVG Oficial de Perú */}
                          <div className="flex-1 flex justify-center">
                            <PeruMap className="w-full h-auto max-h-[260px]" datosRegionales={mapaRegional} />
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-2 text-center border-t border-slate-200 pt-1.5">
                        Mapa: NNA atendidos (≥1 sesión) por departamento del lugar de atención
                      </div>
                    </div>

                    {/* 2. CUMPLIMIENTO POR GRUPO DE EDAD Y MODALIDAD (4 Cols) */}
                    <div className="lg:col-span-4 border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                          NNA atendidos por rango etario
                        </h4>
                        <table className="w-full text-xs mb-4">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b">
                              <th className="py-1.5 px-2 text-left font-bold">Rango</th>
                              <th className="py-1.5 px-2 text-right font-bold">Atendidos (≥1)</th>
                              <th className="py-1.5 px-2 text-right font-bold text-blue-900">&ge;3 sesiones (%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono">
                            {(data.analytics4390?.edadesComparativa ?? []).map((e) => (
                              <tr key={e.grupo} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2 font-sans font-medium text-slate-800">{e.grupo}</td>
                                <td className="py-1.5 px-2 text-right text-slate-600">{e.total1.toLocaleString()}</td>
                                <td className="py-1.5 px-2 text-right font-bold text-blue-800">
                                  {e.cumplen3.toLocaleString()}{' '}
                                  <span className="text-[10px] text-slate-500 font-sans">({e.pct}%)</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                          Por modalidad de atención
                        </h4>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b">
                              <th className="py-1 px-2 text-left font-bold">Modalidad</th>
                              <th className="py-1 px-2 text-right font-bold">NNA</th>
                              <th className="py-1 px-2 text-right font-bold">&ge;3 ses.</th>
                              <th className="py-1 px-2 text-right font-bold">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono">
                            {(data.desglose?.porTipoIntervencion ?? []).map((m) => (
                              <tr key={m.tipoIntervencion} className="hover:bg-slate-50">
                                <td className="py-1 px-2 font-sans font-medium text-slate-800">{m.tipoIntervencion}</td>
                                <td className="py-1 px-2 text-right text-slate-600">{m.total.toLocaleString()}</td>
                                <td className="py-1 px-2 text-right text-blue-800 font-bold">{m.cumplen.toLocaleString()}</td>
                                <td className="py-1 px-2 text-right font-bold text-slate-900">{m.porcentaje}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 3. BARRAS HORIZONTALES: NNA POR SESIONES COMPLETADAS (4 Cols) */}
                    <div className="lg:col-span-4 border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                            Estructura de sesiones completadas
                          </h4>
                          <span className="text-[10px] text-slate-400">1 a 8 sesiones</span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          {(() => {
                            const filas = data.analytics4390?.sesionesEstructura ?? []
                            const maxTotal = Math.max(1, ...filas.map((f) => f.total))
                            return filas.map((s) => {
                            const den = data.kpi?.denominador || 1
                            const pct = Number(((s.total / den) * 100).toFixed(1))
                            const ancho = (n: number) => `${(n / maxTotal) * 100}%`
                            const isReq = s.sesion === '3'

                            return (
                              <div key={s.sesion}>
                                <div className="flex justify-between text-[11px] mb-0.5">
                                  <span className={`font-semibold ${isReq ? 'text-blue-900 font-bold' : 'text-slate-700'}`}>
                                    {s.label} {isReq && <span className="text-blue-600 text-[10px] font-normal">(&ge;3 requisito)</span>}
                                  </span>
                                  <span className={`font-mono ${isReq ? 'font-bold text-blue-800' : 'text-slate-600'}`}>
                                    {s.total.toLocaleString()} <span className="text-slate-400 text-[10px]">({pct}%)</span>
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-3 rounded overflow-hidden flex">
                                  <div
                                    className={`${isReq ? 'bg-blue-700' : 'bg-blue-600'} h-full transition-all`}
                                    style={{ width: ancho(s.presencial) }}
                                    title={`Presencial: ${s.presencial}`}
                                  />
                                  <div
                                    className={`${isReq ? 'bg-sky-400' : 'bg-sky-300'} h-full transition-all`}
                                    style={{ width: ancho(s.remoto) }}
                                    title={`Remoto: ${s.remoto}`}
                                  />
                                  <div
                                    className="bg-amber-400 h-full transition-all"
                                    style={{ width: ancho(s.mixto) }}
                                    title={`Mixto: ${s.mixto}`}
                                  />
                                </div>
                              </div>
                            )
                          })
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-2">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs inline-block"></span> Presencial
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 bg-sky-400 rounded-xs inline-block"></span> Remoto
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs inline-block"></span> Mixto
                        </span>
                        <span>% sobre {fmtN(data.kpi?.denominador)} NNA</span>
                      </div>
                    </div>
                  </div>

                  {/* FILA INFERIOR: TABLA DE RATIOS DE CONTINUIDAD Y FINALIZACIÓN POR REGIÓN */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        % Cumplimiento por región, número de sesiones y tasas de retención, continuidad y finalización
                      </h4>
                      <Badge variant="outline" className="text-[10px] bg-white text-slate-600 font-mono">
                        Fórmulas Normativas
                      </Badge>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs bg-white border border-slate-200 rounded-lg shadow-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b text-left">
                            <th className="py-2.5 px-3 font-bold">Región</th>
                            <th className="py-2.5 px-3 text-right font-bold">NNA &ge;1 sesión</th>
                            <th className="py-2.5 px-3 text-right font-bold text-blue-900">NNA &ge;3 sesiones</th>
                            <th className="py-2.5 px-3 text-right font-bold">NNA &ge;5 sesiones</th>
                            <th className="py-2.5 px-3 text-right font-bold bg-blue-50 text-blue-900 border-l border-blue-100">
                              Tasa Retención (1 &rarr; 3)
                            </th>
                            <th className="py-2.5 px-3 text-right font-bold bg-indigo-50 text-indigo-900 border-l border-indigo-100">
                              Tasa Continuidad (3 &rarr; 5)
                            </th>
                            <th className="py-2.5 px-3 text-right font-bold bg-emerald-50 text-emerald-900 border-l border-emerald-100">
                              Tasa Finalización (1 &rarr; 5)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {(data.analytics4390?.continuidadRegional ?? []).map((row) => {
                            const isTotal = row.departamento === 'Total'
                            return (
                              <tr
                                key={row.departamento}
                                className={isTotal ? 'bg-slate-100 font-bold text-slate-900 border-t-2' : 'hover:bg-slate-50'}
                              >
                                <td className={`py-2 px-3 font-sans ${isTotal ? 'font-bold' : 'font-semibold text-slate-800'}`}>
                                  {row.departamento}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-700">{row.nna1.toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-bold text-blue-800">{row.nna3.toLocaleString()}</td>
                                <td className="py-2 px-3 text-right text-slate-600">{row.nna5.toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-bold text-blue-900 bg-blue-50/40 border-l border-blue-100">
                                  {row.tasaRetencion}%
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-indigo-900 bg-indigo-50/40 border-l border-indigo-100">
                                  {row.tasaContinuidad}%
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-900 bg-emerald-50/40 border-l border-emerald-100">
                                  {row.tasaFinalizacion}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* LÁMINA 2: DINÁMICA TEMPORAL Y TIEMPOS DE PROCESO              */}
              {/* ───────────────────────────────────────────────────────────── */}
              {tabActiva === 'lamina2' && (
                <div className="bg-white border-x border-b border-slate-200 rounded-b-xl p-5 shadow-xs space-y-5">
                  {/* BANNER SUPERIOR OFICIAL */}
                  <div className="bg-[#2b4c6f] text-white p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <h3 className="font-bold tracking-wide text-xs sm:text-sm uppercase flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-300" />
                      Porcentaje de niñas, niños y adolescentes que reciben al menos 3 sesiones · Dinámica Temporal
                    </h3>
                    <span className="text-xs text-blue-200 font-medium">Análisis de Estacionalidad y Tiempos de Proceso</span>
                  </div>

                  {/* FILA SUPERIOR: LÍNEA MENSUAL DE SESIONES */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" />
                        N° de sesiones registradas por mes (Enero – {data.carga?.mesNombre} {data.carga?.anio})
                      </h4>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 font-semibold text-blue-800">
                          <span className="w-3 h-1 bg-blue-800 rounded-xs"></span> Total
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <span className="w-3 h-1 bg-blue-600 rounded-xs"></span> Presencial
                        </span>
                        <span className="flex items-center gap-1 font-medium text-sky-600">
                          <span className="w-3 h-1 bg-sky-400 rounded-xs"></span> Remoto
                        </span>
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <span className="w-3 h-1 bg-amber-400 rounded-xs"></span> Mixto
                        </span>
                      </div>
                    </div>

                    {/* Gráfico de barras mensual responsive con totales */}
                    <div
                      className="grid gap-2 items-end h-36 pt-6 pb-2 border-b border-slate-200 text-center font-mono text-[10px]"
                      style={{ gridTemplateColumns: `repeat(${Math.max(1, data.analytics4390?.curvaMensual?.length ?? 1)}, minmax(0, 1fr))` }}
                    >
                      {(data.analytics4390?.curvaMensual ?? []).map((m, _i, arr) => {
                        const maxVal = Math.max(1, ...arr.map((x) => x.total))
                        const hPct = m.total > 0 ? Math.max(2, (m.total / maxVal) * 100) : 0
                        return (
                          <div key={m.mes} className="flex flex-col items-center justify-end h-full group">
                            <span className="text-slate-800 font-bold mb-1 font-mono text-[11px] group-hover:text-blue-700">
                              {m.total.toLocaleString()}
                            </span>
                            <div
                              className="w-full max-w-[48px] bg-slate-100 rounded-t overflow-hidden flex flex-col justify-end transition-all group-hover:opacity-90"
                              style={{ height: `${hPct}%` }}
                            >
                              <div
                                className="bg-amber-400 w-full"
                                style={{ height: `${(m.mixto / (m.total || 1)) * 100}%` }}
                                title={`Mixto: ${m.mixto}`}
                              />
                              <div
                                className="bg-sky-400 w-full"
                                style={{ height: `${(m.remoto / (m.total || 1)) * 100}%` }}
                                title={`Remoto: ${m.remoto}`}
                              />
                              <div
                                className="bg-blue-700 w-full"
                                style={{ height: `${(m.presencial / (m.total || 1)) * 100}%` }}
                                title={`Presencial: ${m.presencial}`}
                              />
                            </div>
                            <span className="font-sans text-[11px] font-semibold text-slate-600 mt-1.5">{m.mesNombre}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* FILA INFERIOR: RANKING PIAS + MATRIZ EDAD + TIEMPO PARA 3 SESIONES */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* 1. RANKING INTENSIDAD PIAS (3 Cols) */}
                    <div className="lg:col-span-3 border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                          <span>Intensidad por Cuenca / PIAS</span>
                          <span className="text-[10px] text-slate-400 font-normal">Promedio</span>
                        </h4>
                        <div className="overflow-y-auto max-h-[360px]">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 text-left sticky top-0">
                                <th className="py-1.5 px-2 font-bold">Cuenca / PIAS</th>
                                <th className="py-1.5 px-2 text-right font-bold">Ses/NNA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-mono">
                              {(data.analytics4390?.intensidadCuencas ?? []).map((c, idx) => (
                                <tr key={c.cuenca} className="hover:bg-slate-50">
                                  <td className="py-1 px-2 font-sans font-medium text-slate-800 truncate max-w-[130px]" title={c.cuenca}>
                                    <span className="text-slate-400 text-[10px] mr-1">{idx + 1}.</span>
                                    {c.cuenca}
                                  </td>
                                  <td className="py-1 px-2 text-right font-bold text-blue-800">{c.promedio.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-2 border-t mt-2">
                        {(() => {
                          const top = data.analytics4390?.intensidadCuencas?.[0]
                          return top ? `Mayor intensidad: ${top.cuenca} con ${top.promedio.toFixed(2)} ses/NNA (${fmtN(top.totalNna)} NNA)` : ''
                        })()}
                      </div>
                    </div>

                    {/* 2. MATRIZ REGIÓN X GRUPO EDAD (5 Cols) */}
                    <div className="lg:col-span-5 border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                          NNA con sesiones cumplidas, según región y grupo de edad
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] border border-slate-200 rounded">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 border-b">
                                <th className="py-1 px-1.5 text-left font-bold">Región</th>
                                <th className="py-1 px-1.5 text-left font-bold">Grupo</th>
                                <th className="py-1 px-1.5 text-right font-bold">Atendidos (≥1)</th>
                                <th className="py-1 px-1.5 text-right font-bold text-blue-900 bg-blue-50/50">≥3 sesiones (% de atendidos)</th>
                                <th className="py-1 px-1.5 text-right font-bold">≥5 sesiones (% de los ≥3)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-mono">
                              {(data.analytics4390?.matrizRegionEdad ?? []).map((m) => (
                                <tr key={`${m.departamento}-${m.grupo}`} className="hover:bg-slate-50">
                                  <td className="py-1 px-1.5 font-sans font-bold text-slate-800">{m.departamento}</td>
                                  <td className="py-1 px-1.5 font-sans text-slate-700">{m.grupo}</td>
                                  <td className="py-1 px-1.5 text-right text-slate-600">{m.nna1.toLocaleString()}</td>
                                  <td className="py-1 px-1.5 text-right font-bold text-blue-800 bg-blue-50/40">
                                    {m.nna3.toLocaleString()}{' '}
                                    <span className="text-[10px] text-slate-500 font-sans">({m.pct3}%)</span>
                                  </td>
                                  <td className="py-1 px-1.5 text-right text-slate-600">
                                    {m.nna5.toLocaleString()}{' '}
                                    <span className="text-[10px] text-slate-400 font-sans">({m.pct5}%)</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-2 border-t mt-2">
                        {(() => {
                          const filas = data.analytics4390?.matrizRegionEdad ?? []
                          if (filas.length === 0) return ''
                          const mejor = filas.reduce((a, b) => (b.pct3 > a.pct3 ? b : a))
                          return `Mayor % con ≥3 sesiones: ${mejor.departamento}, ${mejor.grupo} (${mejor.pct3}%)`
                        })()}
                      </div>
                    </div>

                    {/* 3. TIEMPO PARA COMPLETAR 3 SESIONES (4 Cols) */}
                    <div className="lg:col-span-4 border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                          <span>Tiempos de Proceso (1ra a 3ra Sesión)</span>
                          <Timer className="w-4 h-4 text-blue-600" />
                        </h4>

                        {/* Visualizador de Dispersión SVG */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-center">
                          <span className="text-[10px] text-slate-500 block mb-1">
                            Dispersión cronológica de días transcurridos ({fmtN(data.analytics4390?.tiemposProceso?.totalCasos)} casos)
                          </span>
                          <div className="h-20 bg-white border border-slate-200 rounded flex items-center justify-center p-1 relative overflow-hidden">
                            <svg viewBox="0 0 300 80" className="w-full h-full">
                              {/* Línea horizontal de referencia mediana */}
                              {(() => {
                                const tp = data.analytics4390?.tiemposProceso
                                if (!tp || !tp.maximo) return null
                                const y = 75 - (tp.mediana / tp.maximo) * 70
                                return <line x1="0" y1={y} x2="300" y2={y} stroke="#93c5fd" strokeDasharray="3,3" strokeWidth="1" />
                              })()}
                              {/* Muestra de puntos scatter reales */}
                              {(data.analytics4390?.tiemposProceso?.scatterSample ?? []).map(([idx, dias], i) => {
                                const tp = data.analytics4390?.tiemposProceso
                                const x = (idx / Math.max(1, tp?.totalCasos ?? 1)) * 290 + 5
                                const y = 75 - (dias / Math.max(1, tp?.maximo ?? 1)) * 70
                                return (
                                  <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="1.8"
                                    fill="#2563eb"
                                    opacity="0.65"
                                  >
                                    <title>Caso #{idx}: {dias} días</title>
                                  </circle>
                                )
                              })}
                            </svg>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                            <span>0 días</span>
                            <span>Mediana: {data.analytics4390?.tiemposProceso?.mediana ?? '—'} d</span>
                            <span>Máx: {data.analytics4390?.tiemposProceso?.maximo ?? '—'} d</span>
                          </div>
                        </div>

                        {/* Tabla de Estadísticos Oficiales */}
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 text-left">
                              <th className="py-1 px-2 font-bold">Estadístico</th>
                              <th className="py-1 px-2 text-right font-bold">Tiempo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono">
                            <tr>
                              <td className="py-1.5 px-2 font-sans font-semibold text-slate-800">Promedio</td>
                              <td className="py-1.5 px-2 text-right font-bold text-blue-800">
                                {data.analytics4390?.tiemposProceso?.promedio ?? '—'} días{' '}
                                <span className="text-[10px] text-slate-500 font-sans">{aMeses(data.analytics4390?.tiemposProceso?.promedio)}</span>
                              </td>
                            </tr>
                            <tr className="bg-blue-50/50">
                              <td className="py-1.5 px-2 font-sans font-bold text-blue-900">Mediana</td>
                              <td className="py-1.5 px-2 text-right font-bold text-blue-900">
                                {data.analytics4390?.tiemposProceso?.mediana ?? '—'} días{' '}
                                <span className="text-[10px] text-slate-500 font-sans">{aMeses(data.analytics4390?.tiemposProceso?.mediana)}</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2 font-sans text-slate-700">25% de los NNA (P25)</td>
                              <td className="py-1.5 px-2 text-right text-slate-700">
                                {data.analytics4390?.tiemposProceso?.p25 ?? '—'} días{' '}
                                <span className="text-[10px] text-slate-500 font-sans">{aMeses(data.analytics4390?.tiemposProceso?.p25)}</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2 font-sans text-slate-700">75% de los NNA (P75)</td>
                              <td className="py-1.5 px-2 text-right text-slate-700">
                                {data.analytics4390?.tiemposProceso?.p75 ?? '—'} días{' '}
                                <span className="text-[10px] text-slate-500 font-sans">{aMeses(data.analytics4390?.tiemposProceso?.p75)}</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2 font-sans text-slate-700">Máximo observado</td>
                              <td className="py-1.5 px-2 text-right font-bold text-rose-700">
                                {data.analytics4390?.tiemposProceso?.maximo ?? '—'} días{' '}
                                <span className="text-[10px] text-slate-500 font-sans">{aMeses(data.analytics4390?.tiemposProceso?.maximo)}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="text-[10px] text-slate-500 pt-2 border-t mt-2 text-center">
                        Cómputo exacto desde primera sesión registrada a tercera sesión efectiva.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
