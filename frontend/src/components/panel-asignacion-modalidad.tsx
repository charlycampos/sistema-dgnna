'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, Info, AlertTriangle, RotateCw, Link2 } from 'lucide-react'

// ── Tipos de la respuesta de GET /api/asignacion/tablero ──────────
interface ComplejidadRef { id: string; nombre: string }
interface FilaAbogado {
    abogado: { id: string; nombre: string }
    total: number
    mayores500: number
    vinculados: number
    porComplejidad: Record<string, number>
}
interface AsignacionReciente {
    secuencia: number
    numeroExpediente: string
    abogadoId: string
    abogadoNombre: string
    complejidadId: string
    complejidadNombre: string
    folios: number
    esMayor500: boolean
    criterio: string
    asignadoEn: string
}
interface TableroAsignacion {
    configurada: boolean
    mensaje?: string
    iniciadoEn?: string
    totalAsignados?: number
    siguienteSecuencia?: number
    turnoReferenciaId?: string
    turnoReferenciaNombre?: string
    brechaTotal?: number
    casosOtrosAbogados?: number
    complejidades: ComplejidadRef[]
    abogados: FilaAbogado[]
    recientes: AsignacionReciente[]
}

// ── Colores: mismos que el tablero de diseño (PAS azul, UPE verde, Adopciones ámbar, Declinación rojo)
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const COLOR_POR_NOMBRE: Array<[RegExp, string]> = [
    [/^pas\b/, 'bg-blue-600'],
    [/^upe\b/, 'bg-green-600'],
    [/^adopcion/, 'bg-amber-500'],
    [/^declinacion/, 'bg-red-600'],
]
const COLORES_EXTRA = ['bg-violet-600', 'bg-cyan-600', 'bg-pink-600', 'bg-slate-500']
function colorComplejidad(nombre: string, indice: number) {
    const n = normalizar(nombre)
    return COLOR_POR_NOMBRE.find(([re]) => re.test(n))?.[1] ?? COLORES_EXTRA[indice % COLORES_EXTRA.length]
}

const AVATAR = ['bg-purple-600', 'bg-orange-600', 'bg-blue-600'] // orden de turno: Karla, Karol, Clara
const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

// El backend guarda fechas en UTC sin zona horaria
const aFecha = (v?: string) => (v ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v.replace(' ', 'T')}Z`) : null)
const fmtFecha = (v?: string) => aFecha(v)?.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) ?? '—'
const fmtCorta = (v?: string) => aFecha(v)?.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) ?? '—'

function criterioCorto(criterio: string) {
    if (criterio.startsWith('Vinculado')) return { texto: 'Vinculado', clase: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    if (criterio.startsWith('Primer')) return { texto: 'Primer registro', clase: 'bg-gray-100 text-gray-700 border-gray-200' }
    if (criterio.includes('cantidad')) return { texto: '1 · Cantidad', clase: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (criterio.includes('complejidad')) return { texto: '2 · Complejidad', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (criterio.includes('500')) return { texto: '3 · +500 folios', clase: 'bg-amber-50 text-amber-800 border-amber-200' }
    return { texto: '4 · Turno', clase: 'bg-orange-50 text-orange-700 border-orange-200' }
}

export function PanelAsignacionModalidad() {
    const [data, setData] = useState<TableroAsignacion | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(false)

    const cargar = async () => {
        setCargando(true)
        setError(false)
        try {
            const res = await fetch('/api/asignacion/tablero', { cache: 'no-store' })
            if (!res.ok) throw new Error()
            setData(await res.json())
        } catch {
            setError(true)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    const encabezado = (
        <CardHeader className="border-b bg-gray-50/50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xs">
                        <Scale className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold text-gray-900 leading-tight">Asignación de Apelaciones</CardTitle>
                        <CardDescription className="text-xs text-gray-500">Equilibrio por cantidad, complejidad, volumen y turno</CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Nueva modalidad · sin puntos
                    </span>
                    <button type="button" onClick={cargar} title="Actualizar" aria-label="Actualizar"
                        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                        <RotateCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </CardHeader>
    )

    if (cargando && !data) {
        return <Card className="bg-white shadow-sm">{encabezado}<CardContent className="p-8 text-center text-sm text-gray-500">Cargando asignaciones…</CardContent></Card>
    }
    if (error || !data) {
        return <Card className="bg-white shadow-sm">{encabezado}<CardContent className="p-8 text-center text-sm text-red-600">No se pudo cargar el estado de la asignación.</CardContent></Card>
    }
    if (!data.configurada) {
        return (
            <Card className="bg-white shadow-sm">{encabezado}
                <CardContent className="p-5">
                    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p>{data.mensaje}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const { complejidades, abogados, recientes } = data
    const maxTotal = Math.max(1, ...abogados.map(a => a.total))
    const brecha = data.brechaTotal ?? 0
    const equilibrado = brecha <= 1

    return (
        <Card className="bg-white h-full flex flex-col shadow-sm">
            {encabezado}

            <CardContent className="p-5 space-y-5 flex-1">
                {/* Resumen */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Asignados</p>
                        <p className="text-xl font-extrabold text-gray-900 leading-tight">{data.totalAsignados}</p>
                        <p className="text-[10px] text-gray-500">desde {fmtFecha(data.iniciadoEn)}</p>
                    </div>
                    <div className={`rounded-lg border px-3 py-2 ${equilibrado ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Diferencia máx.</p>
                        <p className={`text-xl font-extrabold leading-tight ${equilibrado ? 'text-emerald-700' : 'text-amber-700'}`}>{brecha} {brecha === 1 ? 'caso' : 'casos'}</p>
                        <p className="text-[10px] text-gray-500">{equilibrado ? 'Carga equilibrada' : 'Se está compensando'}</p>
                    </div>
                    <div className="rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Turno de referencia</p>
                        <p className="text-sm font-bold text-orange-800 leading-tight mt-1 truncate" title={data.turnoReferenciaNombre}>{data.turnoReferenciaNombre}</p>
                        <p className="text-[10px] text-gray-500">solo decide si hay empate</p>
                    </div>
                </div>

                {/* Abogadas */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Casos asignados por abogado</h4>
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                            {complejidades.map((c, i) => (
                                <span key={c.id} className="inline-flex items-center gap-1 text-[10px] text-gray-600">
                                    <i className={`inline-block h-2 w-2 rounded-full ${colorComplejidad(c.nombre, i)}`} />{c.nombre}
                                </span>
                            ))}
                        </div>
                    </div>

                    {abogados.map((fila, idx) => {
                        const esTurno = fila.abogado.id === data.turnoReferenciaId
                        return (
                            <div key={fila.abogado.id} className={`rounded-xl border p-3.5 ${esTurno ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 shrink-0 rounded-full grid place-items-center text-white text-sm font-bold ${AVATAR[idx % AVATAR.length]}`}>
                                        {iniciales(fila.abogado.nombre)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900 truncate">{fila.abogado.nombre}</span>
                                            {esTurno && <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-bold">Turno</span>}
                                        </div>
                                        {/* Barra segmentada por complejidad, escalada al abogado con más casos */}
                                        <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                            <div className="flex h-full" style={{ width: `${(fila.total / maxTotal) * 100}%` }}>
                                                {complejidades.map((c, i) => {
                                                    const n = fila.porComplejidad[c.id] ?? 0
                                                    return n > 0 ? <div key={c.id} className={colorComplejidad(c.nombre, i)} style={{ width: `${(n / fila.total) * 100}%` }} title={`${c.nombre}: ${n}`} /> : null
                                                })}
                                            </div>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                                            {complejidades.map((c, i) => (
                                                <span key={c.id} className="inline-flex items-center gap-1">
                                                    <i className={`inline-block h-1.5 w-1.5 rounded-full ${colorComplejidad(c.nombre, i)}`} />
                                                    {c.nombre} <strong className="text-gray-900">{fila.porComplejidad[c.id] ?? 0}</strong>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pl-3 border-l border-gray-200 text-right shrink-0">
                                        <div className="text-2xl font-extrabold text-gray-900 leading-none">{fila.total}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">casos</div>
                                    </div>
                                </div>
                                <div className="mt-2.5 flex flex-wrap gap-2 pl-[52px]">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                        +500 folios: {fila.mayores500}
                                    </span>
                                    {fila.vinculados > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                            <Link2 className="h-3 w-3" /> Vinculados: {fila.vinculados}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Últimas asignaciones */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Últimas asignaciones</h4>
                    {recientes.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">
                            Aún no hay casos en la nueva modalidad. El primer registro se asigna a Karla Garcia.
                        </p>
                    ) : (
                        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                            {recientes.slice(0, 6).map((r) => {
                                const crit = criterioCorto(r.criterio)
                                const i = complejidades.findIndex(c => c.id === r.complejidadId)
                                return (
                                    <div key={r.secuencia} className="flex items-center gap-3 px-3 py-2 text-xs" title={r.criterio}>
                                        <span className="w-8 shrink-0 font-mono text-gray-400">#{r.secuencia}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-gray-900 truncate">{r.numeroExpediente || 'Expediente'}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="font-medium text-gray-700 truncate">{r.abogadoNombre}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <i className={`inline-block h-1.5 w-1.5 rounded-full ${colorComplejidad(r.complejidadNombre, i)}`} />
                                                {r.complejidadNombre} · {r.folios.toLocaleString('es-PE')} folios{r.esMayor500 ? ' · +500' : ''}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${crit.clase}`}>{crit.texto}</span>
                                        <span className="w-10 shrink-0 text-right text-gray-400">{fmtCorta(r.asignadoEn)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Regla */}
                <div className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-600">
                    <Info className="h-4 w-4 shrink-0 text-gray-400" />
                    <p>
                        <strong className="text-gray-800">Cómo se decide:</strong> 1) cantidad total, 2) misma complejidad jurídica,
                        3) más de 500 folios (solo si el nuevo caso los supera), 4) turno Karla → Karol → Clara.
                        Los casos vinculados van al abogado del expediente relacionado. Los casos anteriores a la nueva modalidad no se cuentan.
                        {(data.casosOtrosAbogados ?? 0) > 0 && ` Hay ${data.casosOtrosAbogados} caso(s) vinculados a otros abogados.`}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
