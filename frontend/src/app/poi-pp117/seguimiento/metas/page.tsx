'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Target,
  Upload,
  Calendar,
  Sliders,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { useMe } from '@/lib/use-me'
import {
  NIVELES,
  type NivelClave,
  umbralesMes,
  evaluarConMef,
  evaluarConAnual
} from '@/lib/semaforo-metas'

// --- Tipos ---
interface CargaItem {
  num: number
  den: number
  porcentaje?: number | null
  calculado?: boolean // mes calculado desde una carga acumulada posterior
  cargaMes?: number
}

interface SerieItem {
  mes: number
  numerador: number
  denominador: number
  porcentaje: number | null
  fuente: 'carga' | 'calculado'
  cargaMes: number
}

interface IndicadorConfig {
  codigo: string
  nombre: string
  sub: string
  metaMef: number | null
  metaMefMes: Record<number, number>
  metaAnual: number | null
  fuenteMeta: string | null
  habilitado: boolean
  cargas: Record<number, CargaItem>
}

interface CatalogoApi {
  codigo: string
  nombre: string
  nombreCorto?: string
  producto?: string
  habilitado?: boolean
}

interface CargaApi {
  indicador: string
  mes: number
  anio: number
  numerador: number
  denominador: number
  porcentaje: number | null
}

const mensajeError = (err: unknown, porDefecto: string) => (err instanceof Error && err.message ? err.message : porDefecto)

interface MetaApi {
  indicador: string
  metaMef: number | null
  metaMefMes: Record<string, number>
  metaAnual: number | null
  fuente: string | null
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']
const MESES_L = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const HOY = new Date()
const ANIO_ACTUAL = HOY.getFullYear()
const MES_HOY = HOY.getMonth() + 1

// Escala de la barra de cumplimiento: 0 a 150% de la meta; la marca negra es el 100%.
const ESCALA_BARRA = 150

function ultimoMesEvaluable(anio: number) {
  if (anio < ANIO_ACTUAL) return 12
  if (anio > ANIO_ACTUAL) return 0
  return MES_HOY
}

// --- Formato ---
function f1(x: number) {
  return (Math.round(x * 10) / 10).toFixed(1)
}
function f2(x: number) {
  return (Math.round(x * 100) / 100).toFixed(2)
}
function signo(x: number) {
  return `${x >= 0 ? '+' : '−'}${f2(Math.abs(x))}`
}
function miles(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function numero(v: string): number | null {
  const t = v.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

async function leerError(res: Response, porDefecto: string) {
  const data = await res.json().catch(() => null)
  return (data && (data.detail || data.error)) || `${porDefecto} (HTTP ${res.status})`
}

interface Evaluacion {
  nivel: NivelClave
  base: 'mef' | 'anual' | null
  logro: number
  num: number
  den: number
  meta: number // meta esperada del mes, en las mismas unidades que el logro (%)
  cumplimiento: number // % de la meta esperada
  brecha: number // logro − meta, en puntos porcentuales
  avanceAnual: number // solo base 'anual': logro ÷ meta anual (%)
  esperadoAnual: number // solo base 'anual': esperado de la tabla (%)
  calculado?: boolean
  cargaMes?: number
}

function metaMefDelMes(ind: IndicadorConfig, mes: number): number | null {
  const m = ind.metaMefMes[mes]
  return m != null ? m : ind.metaMef
}

function evaluarIndicador(ind: IndicadorConfig, mes: number): Evaluacion {
  const vacio = { base: null, logro: 0, num: 0, den: 0, meta: 0, cumplimiento: 0, brecha: 0, avanceAnual: 0, esperadoAnual: 0 }
  const metaMes = metaMefDelMes(ind, mes)
  const c = ind.cargas[mes]
  const hayCarga = !!c && !!c.den
  const logro = hayCarga ? (c.porcentaje != null ? c.porcentaje : (c.num / c.den) * 100) : 0
  const base = hayCarga ? { logro, num: c.num, den: c.den, calculado: c.calculado, cargaMes: c.cargaMes } : {}
  // Sin meta: se informa el logro de la carga (si existe) aunque no pueda evaluarse
  if (metaMes == null && ind.metaAnual == null) return { ...vacio, ...base, nivel: 'sm' }
  if (!hayCarga) return { ...vacio, nivel: 'pen' }
  if (metaMes != null) {
    return { ...vacio, ...base, ...evaluarConMef(logro, metaMes), base: 'mef' }
  }
  return { ...vacio, ...base, ...evaluarConAnual(logro, ind.metaAnual as number, mes), base: 'anual' }
}

export default function BandejaMetasPage() {
  const router = useRouter()
  const { me, loading, hasAccess, canWrite } = useMe()
  const puedeEditar = canWrite('poi-pp117')

  useEffect(() => {
    if (!loading && me && !hasAccess('poi-pp117')) router.replace('/menu')
  }, [me, loading, hasAccess, router])

  const [anio, setAnio] = useState<number>(ANIO_ACTUAL)
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(ultimoMesEvaluable(ANIO_ACTUAL))
  const [vista, setVista] = useState<'bandeja' | 'matriz'>('bandeja')
  const [filtro, setFiltro] = useState<'todos' | 'fav' | 'seg' | 'rie' | 'sin'>('todos')
  const [indicadores, setIndicadores] = useState<IndicadorConfig[]>([])
  const [aniosConCarga, setAniosConCarga] = useState<number[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  // Modal de metas
  const [modalMetasAbierto, setModalMetasAbierto] = useState(false)
  const [borrador, setBorrador] = useState<Record<string, { mef: string; anual: string; fuente: string }>>({})
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  // Simulador
  const [simLogro, setSimLogro] = useState<string>('55.98')
  const [simMeta, setSimMeta] = useState<string>('46.1')

  const mesMax = ultimoMesEvaluable(anio)

  useEffect(() => {
    let cancel = false
    async function cargar() {
      setCargando(true)
      setErrorCarga(null)
      try {
        const [rInd, rMetas, rCargas, rSerie] = await Promise.all([
          fetch(`/api/poi-pp117/seguimiento/indicadores?anio=${anio}`),
          fetch(`/api/poi-pp117/seguimiento/metas?anio=${anio}`),
          fetch('/api/poi-pp117/seguimiento/cargas'),
          fetch(`/api/poi-pp117/seguimiento/serie?anio=${anio}`)
        ])
        if (!rInd.ok) throw new Error(await leerError(rInd, 'No se pudo leer el catálogo de indicadores'))
        if (!rMetas.ok) throw new Error(await leerError(rMetas, 'No se pudieron leer las metas'))
        if (!rCargas.ok) throw new Error(await leerError(rCargas, 'No se pudieron leer las cargas'))

        const catalogo: CatalogoApi[] = await rInd.json()
        const metas: MetaApi[] = await rMetas.json()
        const cargas: CargaApi[] = await rCargas.json()
        // La serie calculada es complementaria: si falla, la bandeja sigue con las cargas propias
        const serie: Record<string, SerieItem[]> = rSerie.ok ? await rSerie.json() : {}
        if (cancel) return

        const metaPor = new Map(metas.map(m => [m.indicador, m]))
        const lista: IndicadorConfig[] = catalogo.map(ind => {
          const cargasInd: Record<number, CargaItem> = {}
          cargas
            .filter(c => String(c.indicador) === String(ind.codigo) && Number(c.anio) === anio)
            .forEach(c => {
              cargasInd[Number(c.mes)] = { num: c.numerador, den: c.denominador, porcentaje: c.porcentaje }
            })
          ;(serie[String(ind.codigo)] ?? []).forEach(x => {
            if (x.fuente === 'calculado' && !cargasInd[x.mes]) {
              cargasInd[x.mes] = {
                num: x.numerador,
                den: x.denominador,
                porcentaje: x.porcentaje,
                calculado: true,
                cargaMes: x.cargaMes
              }
            }
          })
          const m = metaPor.get(String(ind.codigo))
          const porMes: Record<number, number> = {}
          Object.entries(m?.metaMefMes ?? {}).forEach(([k, v]) => {
            porMes[Number(k)] = Number(v)
          })
          return {
            codigo: String(ind.codigo),
            nombre: ind.nombreCorto || ind.nombre,
            sub: ind.producto || '',
            metaMef: m?.metaMef ?? null,
            metaMefMes: porMes,
            metaAnual: m?.metaAnual ?? null,
            fuenteMeta: m?.fuente ?? null,
            habilitado: Boolean(ind.habilitado),
            cargas: cargasInd
          }
        })
        setIndicadores(lista)
        setAniosConCarga(
          Array.from(new Set(cargas.map(c => Number(c.anio)).filter(n => Number.isFinite(n)))) as number[]
        )

        const mesesConCarga = lista.flatMap(i => Object.keys(i.cargas).map(Number))
        if (mesesConCarga.length > 0) {
          setMesSeleccionado(prev => (mesesConCarga.includes(prev) ? prev : Math.max(...mesesConCarga)))
        }
      } catch (err) {
        if (!cancel) {
          setIndicadores([])
          setErrorCarga(mensajeError(err, 'Error de conexión con el servicio de seguimiento.'))
        }
      } finally {
        if (!cancel) setCargando(false)
      }
    }
    cargar()
    return () => {
      cancel = true
    }
  }, [anio, recarga])

  const aniosDisponibles = useMemo(() => {
    const s = new Set<number>([ANIO_ACTUAL, ...aniosConCarga])
    return Array.from(s).sort((a, b) => b - a)
  }, [aniosConCarga])

  const cambiarAnio = (nuevo: number) => {
    setAnio(nuevo)
    setMesSeleccionado(Math.max(1, ultimoMesEvaluable(nuevo)))
  }

  const mesEval = Math.min(Math.max(mesSeleccionado, 1), 12)
  const umbralAnual = umbralesMes(mesEval)

  const evals = useMemo(
    () => indicadores.map(ind => ({ ind, e: evaluarIndicador(ind, mesEval) })),
    [indicadores, mesEval]
  )

  const cuenta = useMemo(() => {
    const c = { fav: 0, seg: 0, rie: 0, sin: 0 }
    evals.forEach(x => {
      const n = x.e.nivel
      if (n === 'pen' || n === 'sm') c.sin++
      else c[n]++
    })
    return c
  }, [evals])

  const total = indicadores.length

  const filasFiltradas = useMemo(
    () =>
      evals.filter(x => {
        const n = x.e.nivel
        if (filtro === 'todos') return true
        if (filtro === 'sin') return n === 'pen' || n === 'sm'
        return n === filtro
      }),
    [evals, filtro]
  )

  const simResultado = useMemo(() => {
    const l = numero(simLogro)
    const m = numero(simMeta)
    if (l == null || m == null || !(l >= 0) || !(m > 0)) {
      return { nivel: 'sm' as NivelClave, label: 'Datos incompletos', detalle: 'Ingresa un logro y una meta mayor que cero.' }
    }
    const r = evaluarConMef(l, m)
    return {
      nivel: r.nivel,
      label: NIVELES[r.nivel].label,
      detalle: `${f2(l)}% frente a meta ${f2(m)}% → ${f1(r.cumplimiento)}% de la meta (${signo(r.brecha)} pp)`
    }
  }, [simLogro, simMeta])

  // --- Modal de metas ---
  const abrirModalMetas = useCallback(() => {
    const b: Record<string, { mef: string; anual: string; fuente: string }> = {}
    indicadores.forEach(ind => {
      b[ind.codigo] = {
        mef: ind.metaMef != null ? String(ind.metaMef) : '',
        anual: ind.metaAnual != null ? String(ind.metaAnual) : '',
        fuente: ind.fuenteMeta ?? ''
      }
    })
    setBorrador(b)
    setErrorGuardar(null)
    setModalMetasAbierto(true)
  }, [indicadores])

  const errorValor = (v: string | undefined) => {
    const n = numero(v ?? '')
    if (n == null) return null
    if (Number.isNaN(n) || n <= 0) return 'Número mayor que 0'
    if (n > 100) return 'Máximo 100%'
    return null
  }
  const hayErrores = indicadores.some(
    ind => errorValor(borrador[ind.codigo]?.mef) || errorValor(borrador[ind.codigo]?.anual)
  )

  const guardarMetas = async () => {
    if (hayErrores) return
    setGuardando(true)
    setErrorGuardar(null)
    try {
      const metas = indicadores.map(ind => {
        const d = borrador[ind.codigo] ?? { mef: '', anual: '', fuente: '' }
        return {
          indicador: ind.codigo,
          metaMef: numero(d.mef),
          metaAnual: numero(d.anual),
          fuente: d.fuente.trim() || null
        }
      })
      const res = await fetch('/api/poi-pp117/seguimiento/metas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio, metas })
      })
      if (!res.ok) throw new Error(await leerError(res, 'No se pudieron guardar las metas'))
      setModalMetasAbierto(false)
      setRecarga(r => r + 1)
    } catch (err) {
      setErrorGuardar(mensajeError(err, 'No se pudieron guardar las metas.'))
    } finally {
      setGuardando(false)
    }
  }

  const qsCorte = `mes=${mesEval}&anio=${anio}`

  const barra = (e: Evaluacion) => {
    const s = NIVELES[e.nivel]
    return (
      <div className="relative h-2.5 bg-slate-200 rounded-full" aria-hidden="true">
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500"
          style={{ width: `${(Math.min(ESCALA_BARRA, e.cumplimiento) / ESCALA_BARRA) * 100}%`, backgroundColor: s.dot }}
        ></div>
        <div className="absolute -top-0.5 -bottom-0.5 w-px bg-slate-400" style={{ left: `${(90 / ESCALA_BARRA) * 100}%` }}></div>
        <div className="absolute -top-1 -bottom-1 w-0.5 bg-slate-900" style={{ left: `calc(${(100 / ESCALA_BARRA) * 100}% - 1px)` }}></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <AppSidebar />

      <main className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/poi-pp117/seguimiento/dashboard"
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                POI-PP117 · Seguimiento de indicadores
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Bandeja de metas · PP 0117</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              Año
              <select
                value={anio}
                onChange={e => cambiarAnio(Number(e.target.value))}
                className="h-9 border border-slate-300 rounded-lg px-2 text-xs font-bold text-slate-900 bg-white"
              >
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <Link
              href={`/poi-pp117/seguimiento/carga?${qsCorte}`}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Cargar archivo
            </Link>
            {puedeEditar && (
              <button
                onClick={abrirModalMetas}
                disabled={cargando || !!errorCarga}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                Registrar metas {anio}
              </button>
            )}
          </div>
        </header>

        <div className="max-w-[1340px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
          {errorCarga && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">No se pudieron cargar los datos de seguimiento</div>
                  <div className="text-xs mt-0.5">{errorCarga}</div>
                </div>
              </div>
              <button
                onClick={() => setRecarga(r => r + 1)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-rose-300 text-rose-800 text-xs font-semibold hover:bg-rose-100"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
            </div>
          )}

          {/* Mes de corte y regla */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Mes de corte {anio}
                {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" aria-label="Cargando" />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MESES.map((m, i) => {
                  const n = i + 1
                  const activo = n === mesEval
                  const futuro = n > mesMax
                  return (
                    <button
                      key={m}
                      disabled={futuro}
                      onClick={() => setMesSeleccionado(n)}
                      className={`min-w-[48px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        activo
                          ? 'bg-blue-600 text-white shadow-xs'
                          : futuro
                          ? 'bg-slate-50 text-slate-400 border border-dashed border-slate-300 cursor-not-allowed'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-slate-100/80 rounded-lg p-2.5 border border-slate-200/60">
                <div className="text-[11px] text-slate-600 font-semibold">Meta esperada a {MESES_L[mesEval - 1]}</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Meta MEF del mes</div>
                <div className="text-[11px] text-slate-500">
                  Sin meta MEF: {umbralAnual.esperado}% de la meta anual ({mesEval}/12)
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Avance favorable
                </div>
                <div className="text-xl font-extrabold font-mono text-emerald-900 mt-0.5">≥ 100%</div>
                <div className="text-[11px] text-emerald-700">de la meta esperada</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Requiere seguimiento
                </div>
                <div className="text-xl font-extrabold font-mono text-amber-900 mt-0.5">90 – &lt;100%</div>
                <div className="text-[11px] text-amber-700">de la meta esperada</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                <div className="text-[11px] text-rose-800 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Riesgo de incumplimiento
                </div>
                <div className="text-xl font-extrabold font-mono text-rose-900 mt-0.5">&lt; 90%</div>
                <div className="text-[11px] text-rose-700">de la meta esperada</div>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Avance favorable', valor: cuenta.fav, dot: 'bg-emerald-500' },
              { label: 'Requiere seguimiento', valor: cuenta.seg, dot: 'bg-amber-500' },
              { label: 'Riesgo de incumplimiento', valor: cuenta.rie, dot: 'bg-rose-500' },
              { label: 'Sin evaluar (sin carga/meta)', valor: cuenta.sin, dot: 'bg-slate-400' }
            ].map(k => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
                <span className={`w-3 h-3 rounded-full shrink-0 ${k.dot}`}></span>
                <div>
                  <div className="text-xs text-slate-500 font-semibold">{k.label}</div>
                  <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {cargando ? '…' : k.valor} <span className="text-xs text-slate-400 font-normal">/ {total || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Bandeja / Matriz */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 border-b border-slate-200 bg-slate-50/80">
              <div className="flex gap-1 bg-slate-200/80 p-1 rounded-lg" role="tablist">
                <button
                  role="tab"
                  aria-selected={vista === 'bandeja'}
                  onClick={() => setVista('bandeja')}
                  className={`h-8 px-3.5 rounded-md text-xs font-bold transition-all ${
                    vista === 'bandeja' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bandeja del mes
                </button>
                <button
                  role="tab"
                  aria-selected={vista === 'matriz'}
                  onClick={() => setVista('matriz')}
                  className={`h-8 px-3.5 rounded-md text-xs font-bold transition-all ${
                    vista === 'matriz' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Matriz anual
                </button>
              </div>

              {vista === 'bandeja' && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'todos', label: 'Todos', n: total },
                    { id: 'fav', label: 'Favorable', n: cuenta.fav },
                    { id: 'seg', label: 'Seguimiento', n: cuenta.seg },
                    { id: 'rie', label: 'Riesgo', n: cuenta.rie },
                    { id: 'sin', label: 'Sin evaluar', n: cuenta.sin }
                  ].map(f => {
                    const activo = filtro === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFiltro(f.id as typeof filtro)}
                        className={`h-7 px-3 rounded-full text-xs font-semibold transition-all ${
                          activo
                            ? 'bg-blue-100 text-blue-900 border border-blue-300 font-bold'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {f.label} · {f.n}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {vista === 'bandeja' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs sm:text-sm min-w-[1120px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                      <th className="text-left py-2.5 px-3 font-bold w-14">Cód.</th>
                      <th className="text-left py-2.5 px-3 font-bold">Indicador priorizado</th>
                      <th className="text-right py-2.5 px-3 font-bold w-32">Logro</th>
                      <th className="text-right py-2.5 px-3 font-bold w-24">Meta MEF</th>
                      <th className="text-right py-2.5 px-3 font-bold w-24">Meta anual</th>
                      <th className="text-left py-2.5 px-3 font-bold w-64">Cumplimiento</th>
                      <th className="text-left py-2.5 px-3 font-bold w-48">Nivel</th>
                      <th className="text-right py-2.5 px-3 font-bold w-28">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cargando ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                          Cargando indicadores…
                        </td>
                      </tr>
                    ) : filasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                          {errorCarga
                            ? 'Sin datos: no se pudo conectar con el servicio.'
                            : `Ningún indicador en este estado para ${MESES_L[mesEval - 1]} ${anio}.`}
                        </td>
                      </tr>
                    ) : (
                      filasFiltradas.map(({ ind, e }) => {
                        const tiene = e.nivel === 'fav' || e.nivel === 'seg' || e.nivel === 'rie'
                        const s = NIVELES[e.nivel]
                        const metaMes = metaMefDelMes(ind, mesEval)
                        const motivo =
                          e.nivel === 'sm'
                            ? e.den > 0
                              ? `Hay carga de ${MESES_L[mesEval - 1]}; registra la meta ${anio} para evaluar`
                              : `Registra la meta ${anio} para evaluar`
                            : `Sin carga para ${MESES_L[mesEval - 1]} ${anio}`

                        return (
                          <tr key={ind.codigo} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-blue-900">{ind.codigo}</td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{ind.nombre}</div>
                              {ind.sub && <div className="text-xs text-slate-500 mt-0.5">{ind.sub}</div>}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-mono font-bold text-sm text-slate-900">{e.den > 0 ? `${f2(e.logro)}%` : '—'}</div>
                              {e.den > 0 && (
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {miles(e.num)} / {miles(e.den)}
                                </div>
                              )}
                              {e.calculado && e.cargaMes && (
                                <div
                                  className="text-[10px] text-indigo-700 mt-0.5"
                                  title={`Calculado al cierre de ${MESES_L[mesEval - 1]} con las fechas de sesión del archivo acumulado de ${MESES_L[e.cargaMes - 1]}`}
                                >
                                  Calculado desde corte {MESES[e.cargaMes - 1]}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800" title={ind.fuenteMeta ? `Fuente: ${ind.fuenteMeta}` : undefined}>
                              {metaMes == null ? '—' : `${f2(metaMes)}%`}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {ind.metaAnual == null ? '—' : `${f2(ind.metaAnual)}%`}
                            </td>
                            <td className="py-3 px-3">
                              {tiene ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[11px] text-slate-600">
                                    <span>
                                      <strong className="text-slate-900 font-mono">{f1(e.cumplimiento)}%</strong> de la meta
                                    </span>
                                    <span className="font-mono">{signo(e.brecha)} pp</span>
                                  </div>
                                  {barra(e)}
                                  <div className="text-[11px] text-slate-500">
                                    {e.base === 'mef'
                                      ? `Frente a meta MEF ${f2(e.meta)}%`
                                      : `Sin meta MEF: avance ${f1(e.avanceAnual)}% de la meta anual vs ${f1(e.esperadoAnual)}% esperado`}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">{motivo}</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border"
                                style={{ backgroundColor: s.bg, color: s.fg, borderColor: s.bd }}
                              >
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }}></span>
                                {s.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {tiene ? (
                                <Link
                                  href={`/poi-pp117/seguimiento/dashboard?indicador=${ind.codigo}&${qsCorte}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Ver analítica
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : e.nivel === 'sm' && puedeEditar ? (
                                <button onClick={abrirModalMetas} className="text-xs font-semibold text-blue-600 hover:underline">
                                  Registrar meta
                                </button>
                              ) : ind.habilitado ? (
                                <Link
                                  href={`/poi-pp117/seguimiento/carga?indicador=${ind.codigo}&${qsCorte}`}
                                  className="text-xs font-semibold text-blue-600 hover:underline"
                                >
                                  Cargar
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">Próximamente</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {vista === 'matriz' && (
              <div className="overflow-x-auto p-4">
                <table className="w-full border-separate border-spacing-1 text-xs min-w-[950px]">
                  <thead>
                    <tr className="text-slate-600 text-[11px]">
                      <th className="text-left py-1.5 px-2 font-bold w-14">Cód.</th>
                      <th className="text-left py-1.5 px-2 font-bold">Indicador</th>
                      {MESES.map((m, i) => (
                        <th
                          key={m}
                          className={`text-center py-1.5 px-1 w-14 rounded-md font-bold ${
                            i + 1 === mesEval ? 'bg-blue-100 text-blue-900 font-extrabold' : 'text-slate-600'
                          }`}
                        >
                          {m}
                        </th>
                      ))}
                      <th className="text-right py-1.5 px-2 font-bold w-20">Meta MEF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicadores.map(ind => (
                      <tr key={ind.codigo}>
                        <td className="py-2 px-2 font-mono font-bold text-blue-900">{ind.codigo}</td>
                        <td className="py-2 px-2 font-semibold text-slate-900 max-w-xs truncate" title={ind.nombre}>
                          {ind.nombre}
                        </td>
                        {MESES.map((m, i) => {
                          const mesNum = i + 1
                          const e = evaluarIndicador(ind, mesNum)
                          const tiene = e.nivel === 'fav' || e.nivel === 'seg' || e.nivel === 'rie'
                          const s = NIVELES[e.nivel]
                          const futuro = mesNum > mesMax
                          const txt = tiene
                            ? `${Math.round(e.cumplimiento)}%`
                            : e.den > 0
                            ? `(${Math.round(e.logro)}%)`
                            : futuro
                            ? ''
                            : '—'
                          const origen = e.calculado && e.cargaMes ? ` · calculado desde corte ${MESES_L[e.cargaMes - 1]}` : ''
                          const tooltip = tiene
                            ? `${MESES_L[i]}: logro ${f2(e.logro)}% vs meta ${f2(e.meta)}% → ${f1(e.cumplimiento)}% (${signo(e.brecha)} pp) · ${s.label}${origen}`
                            : e.den > 0
                            ? `${MESES_L[i]}: logro ${f2(e.logro)}% · sin meta registrada${origen}`
                            : `${MESES_L[i]}: ${futuro ? 'mes futuro' : s.label}`
                          return (
                            <td
                              key={m}
                              title={tooltip}
                              className={`text-center py-2 px-1 rounded font-mono font-bold text-[11px] cursor-default ${e.calculado ? 'italic' : ''}`}
                              style={{
                                backgroundColor: tiene ? s.cell : futuro ? '#FFFFFF' : '#F8FAFC',
                                color: tiene ? s.cellFg : '#64748B',
                                border: tiene ? `1px solid ${s.bd}` : futuro ? '1px dashed #CBD5E1' : '1px solid #F1F5F9'
                              }}
                            >
                              {txt}
                            </td>
                          )
                        })}
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-700">
                          {ind.metaMef == null ? '—' : `${f2(ind.metaMef)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-wrap items-center gap-3 pt-3 px-2 text-xs text-slate-500 border-t border-slate-100 mt-2">
                  <span className="font-medium text-slate-700">Cada celda muestra el cumplimiento (logro ÷ meta del mes); en cursiva, meses calculados desde la última carga:</span>
                  {(['fav', 'seg', 'rie', 'pen'] as NivelClave[]).map(k => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-xs"
                        style={{ backgroundColor: NIVELES[k].cell, border: `1px solid ${NIVELES[k].bd}` }}
                      ></span>
                      {k === 'fav' ? 'Favorable (≥ 100%)' : k === 'seg' ? 'Seguimiento (90% a < 100%)' : k === 'rie' ? 'Riesgo (< 90%)' : 'Sin carga / sin meta'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <strong className="text-slate-700">Cumplimiento:</strong> logro ÷ meta esperada del mes × 100
              </span>
              <span>
                <strong className="text-slate-700">Meta esperada:</strong> meta MEF del mes; si no hay, meta anual × mes ÷ 12
              </span>
              <span>
                <strong className="text-slate-700">Nivel:</strong> ≥ 100% favorable · 90% a &lt; 100% seguimiento · &lt; 90% riesgo
              </span>
            </div>
          </section>

          {/* Simulador */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-xs">
            <div className="flex-1 min-w-[220px]">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Probar la regla
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Ingresa un logro y la meta MEF del mes para ver el nivel.</div>
            </div>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Logro (%)
              <input
                type="text"
                inputMode="decimal"
                value={simLogro}
                onChange={e => setSimLogro(e.target.value)}
                className="w-28 h-9 border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Meta MEF (%)
              <input
                type="text"
                inputMode="decimal"
                value={simMeta}
                onChange={e => setSimMeta(e.target.value)}
                className="w-28 h-9 border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <div className="flex-1 min-w-[300px] flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[36px]">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0"
                style={{
                  backgroundColor: NIVELES[simResultado.nivel].bg,
                  color: NIVELES[simResultado.nivel].fg,
                  borderColor: NIVELES[simResultado.nivel].bd
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NIVELES[simResultado.nivel].dot }}></span>
                {simResultado.label}
              </span>
              <span className="text-xs text-slate-700 font-medium">{simResultado.detalle}</span>
            </div>
          </section>
        </div>

        {/* Modal: registrar metas */}
        {modalMetasAbierto && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-metas"
          >
            <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  <h3 id="titulo-modal-metas" className="font-bold text-slate-900 text-sm sm:text-base">
                    Metas {anio}
                  </h3>
                </div>
                <button
                  onClick={() => setModalMetasAbierto(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex flex-col gap-3">
                <p className="text-xs text-slate-600">
                  La <strong>meta MEF</strong> es la que usa el semáforo (rige para todos los meses del año). La{' '}
                  <strong>meta anual</strong> es de referencia y solo se usa si no hay meta MEF. Indica de qué documento sale
                  cada meta. Deja vacío lo que aún no esté definido.
                </p>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold">Indicador</th>
                        <th className="text-left px-3 py-2 font-bold w-28">Meta MEF (%)</th>
                        <th className="text-left px-3 py-2 font-bold w-28">Meta anual (%)</th>
                        <th className="text-left px-3 py-2 font-bold w-56">Fuente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {indicadores.map(ind => {
                        const d = borrador[ind.codigo] ?? { mef: '', anual: '', fuente: '' }
                        const errMef = errorValor(d.mef)
                        const errAnual = errorValor(d.anual)
                        const set = (campo: 'mef' | 'anual' | 'fuente', v: string) =>
                          setBorrador(b => ({ ...b, [ind.codigo]: { ...d, [campo]: v } }))
                        return (
                          <tr key={ind.codigo}>
                            <td className="px-3 py-2">
                              <span className="font-mono font-bold text-blue-900 mr-2">{ind.codigo}</span>
                              <span className="font-semibold text-slate-900">{ind.nombre}</span>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`Meta MEF ${ind.codigo}`}
                                value={d.mef}
                                placeholder="—"
                                onChange={e => set('mef', e.target.value)}
                                className={`w-24 h-8 border rounded-lg px-2 font-mono font-bold text-slate-900 ${
                                  errMef ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                                }`}
                              />
                              {errMef && <div className="text-[10px] text-rose-700 mt-0.5">{errMef}</div>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`Meta anual ${ind.codigo}`}
                                value={d.anual}
                                placeholder="—"
                                onChange={e => set('anual', e.target.value)}
                                className={`w-24 h-8 border rounded-lg px-2 font-mono text-slate-900 ${
                                  errAnual ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                                }`}
                              />
                              {errAnual && <div className="text-[10px] text-rose-700 mt-0.5">{errAnual}</div>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                type="text"
                                aria-label={`Fuente de la meta ${ind.codigo}`}
                                value={d.fuente}
                                maxLength={300}
                                placeholder="Ej. Seguimiento de indicadores PP 117 - 2026"
                                onChange={e => set('fuente', e.target.value)}
                                className="w-full h-8 border border-slate-300 rounded-lg px-2 text-slate-900"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {errorGuardar && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorGuardar}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button
                  onClick={() => setModalMetasAbierto(false)}
                  className="px-4 h-9 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarMetas}
                  disabled={guardando || hayErrores}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs"
                >
                  {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar metas
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
