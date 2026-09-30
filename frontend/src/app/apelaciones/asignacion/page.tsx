'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/lib/use-me'
import { toast } from 'sonner'
import {
    Scale, Menu, Plus, RefreshCw,
    Layers, User, ArrowRight
} from 'lucide-react'

interface AbogadoData {
    abogado: {
        id: string
        nombre: string
    }
    total: number
    mayores500: number
    vinculados: number
    porComplejidad: Record<string, number>
}

interface RecienteData {
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

interface TableroData {
    configurada: boolean
    mensaje?: string
    modalidadId: string
    iniciadoEn?: string
    totalAsignados: number
    siguienteSecuencia: number
    turnoReferenciaId: string
    turnoReferenciaNombre: string
    brechaTotal: number
    casosOtrosAbogados: number
    complejidades: Array<{ id: string; nombre: string }>
    abogados: AbogadoData[]
    recientes: RecienteData[]
}

const claro = (c: string) => `color-mix(in oklch, ${c} 72%, white)`
const COLOR_POOL = ['#2F5BD3', '#0F8B8D', '#7A5AE0', '#8A6A4F', '#D97706', '#E11D48']

export default function AsignacionApelacionesPage() {
    const router = useRouter()
    const { me, loading: meLoading, hasAccess, canWrite } = useMe()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [tablero, setTablero] = useState<TableroData | null>(null)
    const [abogadoSeleccionado, setAbogadoSeleccionado] = useState<string | null>(null)

    // Opciones visuales
    const [verPromedio, setVerPromedio] = useState(true)
    const [verNumeros, setVerNumeros] = useState(true)

    // Guard de acceso
    useEffect(() => {
        if (!meLoading && me && !hasAccess('apelaciones')) {
            router.replace('/menu')
        }
    }, [me, meLoading, hasAccess, router])

    useEffect(() => {
        const handleCollapseChange = (e: Event) => {
            const customEvent = e as CustomEvent
            setSidebarCollapsed(customEvent.detail)
        }
        window.addEventListener('sidebar-collapse-changed', handleCollapseChange)
        return () => window.removeEventListener('sidebar-collapse-changed', handleCollapseChange)
    }, [])

    const fetchTablero = async () => {
        setLoadingData(true)
        try {
            const res = await fetch('/api/asignacion/tablero')
            if (!res.ok) {
                throw new Error('Error al cargar datos del tablero')
            }
            const data: TableroData = await res.json()
            setTablero(data)
        } catch (error) {
            console.error('Error cargando tablero:', error)
            toast.error('No se pudo cargar el tablero de asignación')
        } finally {
            setLoadingData(false)
        }
    }

    useEffect(() => {
        fetchTablero()
    }, [])

    // Mapa de colores por complejidad
    const mapComplejidades = useMemo(() => {
        if (!tablero?.complejidades) return []
        return tablero.complejidades.map((c, i) => {
            const norm = c.nombre.toLowerCase()
            let corto = c.nombre
            let color = COLOR_POOL[i % COLOR_POOL.length]

            if (norm.includes('pas')) {
                corto = 'PAS'
                color = '#2F5BD3'
            } else if (norm.includes('upe')) {
                corto = 'UPE'
                color = '#0F8B8D'
            } else if (norm.includes('adopcion')) {
                corto = 'Adopciones'
                color = '#7A5AE0'
            } else if (norm.includes('declinac') || norm.includes('competenc')) {
                corto = 'Declinación'
                color = '#8A6A4F'
            }

            return { id: c.id, nombre: c.nombre, corto, color }
        })
    }, [tablero?.complejidades])

    const colorDe = (cid: string) => {
        return mapComplejidades.find(m => m.id === cid)?.color || '#2F5BD3'
    }

    // Brechas de control
    const brechas = useMemo(() => {
        if (!tablero?.abogados?.length) return []
        const totales = tablero.abogados.map(a => a.total)
        const m500 = tablero.abogados.map(a => a.mayores500)
        const brechaTot = totales.length ? Math.max(...totales) - Math.min(...totales) : 0
        const brechaM500 = m500.length ? Math.max(...m500) - Math.min(...m500) : 0

        return [
            { label: 'Cantidad total', val: brechaTot },
            { label: 'Más de 500 folios', val: brechaM500 }
        ]
    }, [tablero?.abogados])

    // Historial filtrable
    const historialFiltrado = useMemo(() => {
        if (!tablero?.recientes) return []
        if (!abogadoSeleccionado) return tablero.recientes
        return tablero.recientes.filter(r => r.abogadoId === abogadoSeleccionado)
    }, [tablero?.recientes, abogadoSeleccionado])

    // Estadísticas para las columnas
    const maxCasosCol = Math.max(...(tablero?.abogados?.map(a => a.total) || [1]), 1)
    const capN = Math.max(6, Math.ceil((maxCasosCol + 1) / 2) * 2)
    const promedioGeneral = tablero?.abogados?.length
        ? tablero.abogados.reduce((s, a) => s + a.total, 0) / tablero.abogados.length
        : 0
    const HC = 280
    const unidadAltura = HC / capN

    return (
        <div className="flex h-screen bg-[#F6F8FB] overflow-hidden w-full text-slate-900 font-sans">
            <AppSidebar />
            <div className={`flex-1 ml-0 flex flex-col h-full max-h-screen max-w-full overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-64'
                }`}>
                {/* Header superior */}
                <header className="border-b bg-white sticky top-0 z-30 flex-shrink-0">
                    <div className="px-4 py-3 md:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden shrink-0 h-9 w-9"
                                    onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
                                >
                                    <Menu className="h-5 w-5 text-muted-foreground" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="hidden md:inline-flex shrink-0 h-9 w-9"
                                    onClick={() => window.dispatchEvent(new Event('toggle-sidebar-collapse'))}
                                    title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
                                >
                                    <Menu className="h-5 w-5 text-muted-foreground" />
                                </Button>
                                <div>
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                                        Módulo de Apelaciones · Sistema DGNNA
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                        Tablero de Asignación de Apelaciones
                                    </h1>
                                    <p className="text-xs text-slate-500 hidden sm:block">
                                        Distribución equilibrada y transparente por cantidad, complejidad jurídica, volumen y turno.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="hidden sm:inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                                    Nueva modalidad · Sin puntos
                                </span>
                                {canWrite('apelaciones') && (
                                    <Link href="/apelaciones/nueva">
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs gap-1.5 shadow-sm">
                                            <Plus className="h-4 w-4" />
                                            <span>Registrar Apelación</span>
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido principal scrollable */}
                <main className="px-3 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto space-y-4">
                    {loadingData ? (
                        <div className="py-20 text-center">
                            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-3" />
                            <p className="text-sm text-slate-500">Cargando estado en vivo de las asignaciones...</p>
                        </div>
                    ) : !tablero?.configurada ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-slate-600 font-semibold">{tablero?.mensaje || 'Modalidad no configurada.'}</p>
                        </div>
                    ) : (
                        <>
                            {/* PANEL HERO: ESTADO OFICIAL Y PRÓXIMO TURNO */}
                            <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 p-5 text-white shadow-md relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
                                    <Scale className="w-64 h-64 text-white" />
                                </div>

                                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                    {/* Propuesta del próximo expediente */}
                                    <div className="space-y-2 flex-1">
                                        <div className="text-[10px] font-extrabold tracking-widest uppercase text-blue-200">
                                            ESTADO OFICIAL DE LA MODALIDAD · EXPEDIENTE N.º {tablero.siguienteSecuencia}
                                        </div>
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-base font-extrabold text-white shadow-inner">
                                                {tablero.turnoReferenciaNombre ? tablero.turnoReferenciaNombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '—'}
                                            </div>
                                            <div>
                                                <div className="text-xl md:text-2xl font-extrabold tracking-tight">
                                                    Turno de Referencia: {tablero.turnoReferenciaNombre}
                                                </div>
                                                <div className="text-xs text-blue-100 flex items-center gap-2 mt-0.5">
                                                    <span>Total asignados bajo la nueva modalidad: <strong>{tablero.totalAsignados}</strong></span>
                                                    <span className="text-[10px] bg-emerald-400/30 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300/30">
                                                        Inicio: UPEMADREDEDIOS20260000803
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resumen de equilibrio */}
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 flex items-center gap-4">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Brecha actual</div>
                                            <div className="text-lg font-black text-white">
                                                {tablero.brechaTotal === 0 ? 'Equilibrado' : `± ${tablero.brechaTotal} casos`}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={fetchTablero}
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-lg"
                                            title="Actualizar estado del tablero"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Desglose de los 4 criterios de equilibrio */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/15">
                                    {[
                                        { title: 'Cantidad', desc: '1.º Equilibrio de cantidad total' },
                                        { title: 'Complejidad', desc: '2.º Equilibrio de la misma complejidad' },
                                        { title: '+500 folios', desc: '3.º Menor carga en expedientes voluminosos' },
                                        { title: 'Turno', desc: '4.º En caso de empate, turno circular' }
                                    ].map((paso, idx) => (
                                        <div
                                            key={paso.title}
                                            className="p-2.5 rounded-lg border text-left bg-white/10 text-white border-white/15"
                                        >
                                            <div className="text-[9px] font-extrabold uppercase text-blue-200">
                                                Criterio {idx + 1}
                                            </div>
                                            <div className="text-xs font-extrabold mt-0.5">{paso.title}</div>
                                            <div className="text-[10px] opacity-80 mt-0.5 leading-tight">
                                                {paso.desc}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* BRECHAS Y CONTROLES VISUALES */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto flex-1 max-w-xl">
                                    {brechas.map((b) => {
                                        const c = b.val <= 1 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : b.val <= 2 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                                        return (
                                            <div key={b.label} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
                                                <span className="text-xs font-semibold text-slate-600">Brecha · {b.label}</span>
                                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${c}`}>
                                                    {b.val === 0 ? 'Equilibrado' : `± ${b.val}`}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
                                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={verPromedio}
                                            onChange={(e) => setVerPromedio(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-0"
                                        />
                                        <span>Línea promedio</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={verNumeros}
                                            onChange={(e) => setVerNumeros(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-0"
                                        />
                                        <span>Números en barras</span>
                                    </label>
                                </div>
                            </div>

                            {/* PILAS / COLUMNAS DE ASIGNACIÓN POR ABOGADO */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {tablero.abogados.map((a) => {
                                    const esTurno = a.abogado.id === tablero.turnoReferenciaId
                                    const estaSeleccionado = abogadoSeleccionado === a.abogado.id
                                    const inits = a.abogado.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

                                    // Ticks para el gráfico de barras
                                    const ticks = Array.from({ length: Math.floor(capN / 2) + 1 }, (_, ti) => ti * 2)

                                    return (
                                        <Card
                                            key={a.abogado.id}
                                            onClick={() => setAbogadoSeleccionado(estaSeleccionado ? null : a.abogado.id)}
                                            className={`transition-all duration-200 cursor-pointer overflow-hidden border ${estaSeleccionado
                                                ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                                                : 'hover:shadow-md border-slate-200'
                                                }`}
                                        >
                                            {/* Indicador de turno arriba */}
                                            {esTurno && (
                                                <div className="h-1 bg-blue-600 w-full" />
                                            )}

                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors ${esTurno
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {inits}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <CardTitle className="text-sm font-bold text-slate-900 truncate">
                                                                {a.abogado.nombre}
                                                            </CardTitle>
                                                            <div className="flex gap-1.5 flex-wrap mt-0.5">
                                                                {esTurno && (
                                                                    <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                                                        TURNO DE REFERENCIA
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-2xl font-black text-slate-900 leading-none">
                                                            {a.total}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">asignadas</div>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="p-4 pt-2 space-y-4">
                                                {/* Gráfico de Columna de Volumen */}
                                                <div className="relative bg-slate-50/70 border border-slate-100 rounded-xl p-2" style={{ height: HC + 20 }}>
                                                    {/* Líneas de escala (ticks) */}
                                                    {ticks.map(t => (
                                                        <div
                                                            key={t}
                                                            className="absolute left-6 right-2 border-t border-slate-200/80 pointer-events-none"
                                                            style={{ bottom: 16 + t * unidadAltura }}
                                                        >
                                                            <span className="font-mono text-[9px] text-slate-400 absolute -left-6 -top-2 w-4 text-right">
                                                                {t}
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {/* Línea de Promedio */}
                                                    {verPromedio && (
                                                        <div
                                                            className="absolute left-6 right-2 border-t-2 border-dashed border-slate-500 z-10 pointer-events-none"
                                                            style={{ bottom: 16 + promedioGeneral * unidadAltura }}
                                                        >
                                                            <span className="absolute right-0 -top-4 text-[9px] font-extrabold text-slate-600 tracking-wider">
                                                                PROMEDIO {promedioGeneral.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Barra apilada central */}
                                                    <div
                                                        className="absolute left-[26%] right-[26%] flex flex-col-reverse bottom-4"
                                                    >
                                                        {mapComplejidades.map(c => {
                                                            const cant = a.porComplejidad[c.id] || 0
                                                            if (!cant) return null
                                                            const alturaSeg = cant * unidadAltura

                                                            return (
                                                                <div
                                                                    key={c.id}
                                                                    title={`${c.nombre}: ${cant}`}
                                                                    style={{
                                                                        height: alturaSeg,
                                                                        background: `linear-gradient(90deg, ${c.color}, ${claro(c.color)})`
                                                                    }}
                                                                    className="relative border-t border-white/60 transition-all duration-300 first:rounded-b-sm last:rounded-t-md overflow-hidden group"
                                                                >
                                                                    {verNumeros && alturaSeg >= 16 && (
                                                                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-white drop-shadow-xs">
                                                                            {cant}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Composición en miniatura */}
                                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                                    {/* Barra horizontal proporcional */}
                                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 gap-0.5">
                                                        {mapComplejidades.map(c => {
                                                            const cant = a.porComplejidad[c.id] || 0
                                                            if (!cant) return null
                                                            return (
                                                                <div
                                                                    key={c.id}
                                                                    style={{ flex: cant, backgroundColor: c.color }}
                                                                    title={`${c.nombre}: ${cant}`}
                                                                />
                                                            )
                                                        })}
                                                    </div>

                                                    {/* Desglose en 2 columnas */}
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                                                        {mapComplejidades.map(c => (
                                                            <div key={c.id} className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                                                    <span className="truncate">{c.corto}</span>
                                                                </div>
                                                                <span className="font-extrabold text-slate-900">{a.porComplejidad[c.id] || 0}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Voluminosos +500 */}
                                                    <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-slate-200 text-[11px] text-slate-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-3.5 h-2 rounded-xs bg-[repeating-linear-gradient(135deg,#94A3B8_0,#94A3B8_2px,#E2E8F0_2px,#E2E8F0_4px)]" />
                                                            <span>Más de 500 folios</span>
                                                        </div>
                                                        <span className="font-extrabold text-slate-900">{a.mayores500}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>

                            {/* LEYENDA INFORMATIVA */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                <span className="font-bold text-slate-800">Leyenda de complejidades:</span>
                                {mapComplejidades.map(c => (
                                    <div key={c.id} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: c.color }} />
                                        <span>{c.nombre}</span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3.5 h-2.5 rounded-xs bg-[repeating-linear-gradient(135deg,#94A3B8_0,#94A3B8_2px,#E2E8F0_2px,#E2E8F0_4px)]" />
                                    <span>Más de 500 folios</span>
                                </div>
                            </div>

                            {/* HISTORIAL OFICIAL DE ASIGNACIONES */}
                            <div className="pt-2">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
                                    <div>
                                        <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                                            Historial Oficial de Asignaciones (Nueva Modalidad)
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {abogadoSeleccionado ? (
                                                <>
                                                    Filtrado por: <strong className="text-slate-800">{tablero.abogados.find(a => a.abogado.id === abogadoSeleccionado)?.abogado.nombre}</strong> ·{' '}
                                                    <button onClick={() => setAbogadoSeleccionado(null)} className="text-blue-600 hover:underline font-semibold">
                                                        Quitar filtro
                                                    </button>
                                                </>
                                            ) : (
                                                'Haz clic en la tarjeta de cualquier abogada para filtrar sus expedientes asignados.'
                                            )}
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchTablero}
                                        className="text-xs gap-1.5 bg-white text-slate-700 self-start sm:self-auto"
                                        title="Recarga los datos oficiales de la base de datos"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Refrescar datos</span>
                                    </Button>
                                </div>

                                <Card className="border-slate-200 overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider sticky top-0 z-10">
                                                <tr>
                                                    <th className="py-2.5 px-3 w-16">Secuencia</th>
                                                    <th className="py-2.5 px-3">Expediente</th>
                                                    <th className="py-2.5 px-3">Complejidad jurídica</th>
                                                    <th className="py-2.5 px-3">Folios</th>
                                                    <th className="py-2.5 px-3">Volumen</th>
                                                    <th className="py-2.5 px-3">Abogada asignada</th>
                                                    <th className="py-2.5 px-3">Criterio aplicado</th>
                                                    <th className="py-2.5 px-3">Fecha de asignación</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {historialFiltrado.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                                            Aún no existen registros en la nueva modalidad.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    historialFiltrado.map((r) => {
                                                        const color = colorDe(r.complejidadId)
                                                        let fechaFmt = r.asignadoEn
                                                        if (r.asignadoEn) {
                                                            try {
                                                                const d = new Date(r.asignadoEn)
                                                                fechaFmt = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                                                            } catch { }
                                                        }

                                                        return (
                                                            <tr
                                                                key={r.secuencia}
                                                                className="hover:bg-slate-50/80 transition-colors"
                                                            >
                                                                <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">
                                                                    #{r.secuencia}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-medium text-slate-900">
                                                                    {r.numeroExpediente || `EXP-${r.secuencia}`}
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                                        <span className="font-semibold text-slate-800">{r.complejidadNombre}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-3 font-mono text-slate-700">
                                                                    {r.folios?.toLocaleString('es-PE')}
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.esMayor500
                                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                        : 'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                        {r.esMayor500 ? 'Más de 500' : 'Hasta 500'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                                                    {r.abogadoNombre}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600">
                                                                    {r.criterio}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-400">
                                                                    {fechaFmt}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
