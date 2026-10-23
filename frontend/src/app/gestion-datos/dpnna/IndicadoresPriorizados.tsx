'use client'

import React, { useEffect, useState } from 'react'
import { Target, RefreshCw, Info } from 'lucide-react'

type Semaforo = 'VERDE' | 'AMBAR' | 'ROJO' | null

interface CeldaIndicador {
  num: number
  den: number
  valor: number | null
  fuente: 'OFICIAL' | 'CALCULADO'
}

interface FilaIndicador {
  clave: string
  nombre: string
  valores: Record<string, CeldaIndicador | null>
  semaforo: Semaforo
}

interface GrupoIndicadores {
  tipoCar: 'BASICO' | 'ESPECIALIZADO'
  baseDatos: string
  indicadores: FilaIndicador[]
}

interface CuadroIndicadores {
  codigo: string
  titulo: string
  nota: string
  grupos: GrupoIndicadores[]
}

interface RespuestaIndicadores {
  periodos: { periodo: string; etiqueta: string; fuente: 'OFICIAL' | 'CALCULADO' }[]
  cuadros: CuadroIndicadores[]
  criterios: { semaforo: string; fuenteOficial: string; diasPlazoPvi: number }
}

const SEMAFORO_CLASES: Record<'VERDE' | 'AMBAR' | 'ROJO', string> = {
  VERDE: 'bg-[#DCFCE7] text-[#16A34A]',
  AMBAR: 'bg-[#FEF3C7] text-[#D97706]',
  ROJO: 'bg-[#FEE2E2] text-[#DC2626]',
}

function formatoValor(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return '—'
  return `${Number.isInteger(valor) ? valor : valor.toFixed(1)}%`
}

export default function IndicadoresPriorizados() {
  const [datos, setDatos] = useState<RespuestaIndicadores | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/gestion-datos/dpnna/indicadores-priorizados')
      if (!res.ok) throw new Error(`No se pudo consultar los indicadores priorizados (${res.status})`)
      setDatos(await res.json())
    } catch (err) {
      console.error('Error cargando indicadores priorizados:', err)
      setError(err instanceof Error ? err.message : 'No fue posible cargar los indicadores priorizados')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Target className="w-5 h-5 text-indigo-600" />
            Seguimiento mensual a indicadores priorizados PP0117
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Indicadores complementarios vinculados a la atención en CAR (INABIF). El semáforo se aplica al último mes.
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {cargando && !datos && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Calculando indicadores priorizados...
        </div>
      )}

      {datos?.cuadros.map(cuadro => (
        <CuadroPriorizado key={cuadro.codigo} cuadro={cuadro} periodos={datos.periodos} />
      ))}

      {datos && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Semáforo:</span>
            <span className={`rounded px-2 py-0.5 font-bold ${SEMAFORO_CLASES.VERDE}`}>Mejora</span>
            <span className={`rounded px-2 py-0.5 font-bold ${SEMAFORO_CLASES.AMBAR}`}>Se mantiene</span>
            <span className={`rounded px-2 py-0.5 font-bold ${SEMAFORO_CLASES.ROJO}`}>Retrocede</span>
          </div>
          <p className="flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{datos.criterios.semaforo}</p>
          <p className="pl-5">{datos.criterios.fuenteOficial} Los meses siguientes se calculan automáticamente al cargar cada base RENE CAR.</p>
        </div>
      )}
    </section>
  )
}

function CuadroPriorizado({ cuadro, periodos }: { cuadro: CuadroIndicadores; periodos: RespuestaIndicadores['periodos'] }) {
  const ultimo = periodos[periodos.length - 1]?.periodo
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Indicador {cuadro.codigo}</div>
        <h3 className="font-bold text-slate-900 text-sm mt-0.5">{cuadro.titulo}</h3>
        <p className="text-xs text-slate-500 mt-1">* {cuadro.nota}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-[#1F3864] text-white">
              <th rowSpan={2} className="px-3 py-2 text-center font-bold uppercase w-36 border border-[#2c4a7c]">Base de datos</th>
              <th rowSpan={2} className="px-3 py-2 text-center font-bold uppercase border border-[#2c4a7c]">Indicadores complementarios</th>
              {periodos.map(p => (
                <th key={p.periodo} colSpan={3} className="px-3 py-1.5 text-center font-bold uppercase border border-[#2c4a7c]">
                  {p.etiqueta.split(' ')[0]}
                  {p.fuente === 'OFICIAL' && <span className="ml-1 font-normal normal-case text-[10px] text-indigo-200">(reporte)</span>}
                </th>
              ))}
            </tr>
            <tr className="bg-[#1F3864] text-white">
              {periodos.map(p => (
                <React.Fragment key={p.periodo}>
                  <th className="px-2 py-1 text-center font-semibold border border-[#2c4a7c]">NUM</th>
                  <th className="px-2 py-1 text-center font-semibold border border-[#2c4a7c]">DEN</th>
                  <th className="px-2 py-1 text-center font-semibold border border-[#2c4a7c]">VALOR</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuadro.grupos.map(grupo =>
              grupo.indicadores.map((fila, idx) => (
                <tr key={`${grupo.tipoCar}-${fila.clave}`} className="hover:bg-slate-50">
                  {idx === 0 && (
                    <td rowSpan={grupo.indicadores.length} className="px-3 py-2 text-center font-bold text-slate-700 bg-slate-50 border border-slate-200 align-middle">
                      {grupo.baseDatos}
                    </td>
                  )}
                  <td className="px-3 py-2 text-slate-800 border border-slate-200">{fila.nombre}</td>
                  {periodos.map(p => {
                    const celda = fila.valores[p.periodo]
                    const esUltimo = p.periodo === ultimo
                    const color = esUltimo && fila.semaforo ? SEMAFORO_CLASES[fila.semaforo] : 'text-slate-800'
                    return (
                      <React.Fragment key={p.periodo}>
                        <td className="px-2 py-2 text-right tabular-nums border border-slate-200">{celda ? celda.num.toLocaleString('es-PE') : '—'}</td>
                        <td className="px-2 py-2 text-right tabular-nums border border-slate-200">{celda ? celda.den.toLocaleString('es-PE') : '—'}</td>
                        <td className={`px-2 py-2 text-right tabular-nums font-bold border border-slate-200 ${color}`}>{formatoValor(celda?.valor)}</td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
