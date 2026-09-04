'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scale, Trophy, Users, Info } from 'lucide-react'
import type { CargaAbogado } from '@/types'

interface PanelAsignacionProps {
    cargaAbogados: CargaAbogado[]
}

export function PanelAsignacion({ cargaAbogados }: PanelAsignacionProps) {
    if (cargaAbogados.length === 0) {
        return (
            <Card className="bg-white">
                <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay abogados registrados</p>
                </CardContent>
            </Card>
        )
    }

    // Filtrar personal activo vs histórico
    const abogadosActivos = cargaAbogados.filter(a => a.abogado.activo)
    const abogadosInactivos = cargaAbogados.filter(a => !a.abogado.activo && (a.puntosActivos ?? 0) > 0)

    // Sugerencia inteligente evaluada únicamente entre abogados activos
    const abogadoSugerido = abogadosActivos.length > 0
        ? abogadosActivos.reduce((prev, current) => prev.puntosActivos < current.puntosActivos ? prev : current)
        : null

    const hayEmpate = abogadoSugerido
        ? abogadosActivos.filter((a) => a.puntosActivos === abogadoSugerido.puntosActivos).length > 1
        : false

    const maxPuntos = Math.max(...abogadosActivos.map((a) => a.puntosActivos ?? 0)) || 0

    return (
        <Card className="bg-white h-full flex flex-col shadow-sm">
            <CardHeader className="border-b bg-gray-50/50 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xs">
                            <Scale className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-gray-900 leading-tight">Sistema de Asignación Inteligente</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Balance de carga ponderada para asignación de nuevos casos</CardDescription>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Motor por Puntos
                    </span>
                </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                {/* Lista de abogados activos */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
                        <span className="uppercase tracking-wider font-semibold text-gray-500">
                            Abogado Activo y Nivel de Carga
                        </span>
                        <span>
                            Escala máx: {maxPuntos} puntos
                        </span>
                    </div>

                    {abogadosActivos.map((carga, index) => {
                        const esSugerido = !hayEmpate && abogadoSugerido && carga.abogado.id === abogadoSugerido.abogado.id
                        const esEmpate = hayEmpate && abogadoSugerido && carga.puntosActivos === abogadoSugerido.puntosActivos
                        const maxPuntosAbogado = Math.max(...abogadosActivos.map((a) => a.puntosActivos ?? 0)) || 1
                        const pts = carga.puntosActivos ?? 0
                        const porcentaje = isFinite(pts / maxPuntosAbogado) ? (pts / maxPuntosAbogado) * 100 : 0

                        const bgColors = ['bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-emerald-600']

                        return (
                            <div
                                key={carga.abogado.id}
                                className={`rounded-xl border p-4 transition-all ${
                                    esSugerido
                                        ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                                        : esEmpate
                                            ? 'border-amber-300 bg-amber-50/50'
                                            : 'border-gray-200 bg-white hover:bg-gray-50/60'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs ${
                                        bgColors[index % bgColors.length]
                                    }`}>
                                        {carga.abogado.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <p className="font-bold text-sm truncate text-gray-900">
                                                {carga.abogado.nombre}
                                            </p>
                                            {esSugerido && (
                                                <Badge className="bg-emerald-600 text-white text-xs font-bold shadow-xs">
                                                    <Trophy className="h-3 w-3 mr-1" />
                                                    Sugerido (Menor carga)
                                                </Badge>
                                            )}
                                            {esEmpate && (
                                                <Badge className="bg-amber-500 text-white text-xs">Empate</Badge>
                                            )}
                                        </div>

                                        <div className="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all ${
                                                    esSugerido
                                                        ? 'bg-emerald-500'
                                                        : esEmpate
                                                            ? 'bg-amber-500'
                                                            : 'bg-blue-600'
                                                }`}
                                                style={{ width: `${Math.max(isNaN(porcentaje) ? 0 : porcentaje, 5)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Puntos de Carga Ponderada para Asignación */}
                                    <div className={`text-right pl-4 sm:pl-6 min-w-[110px] border-l ${
                                        esSugerido ? 'border-emerald-200/80' : 'border-gray-100'
                                    }`}>
                                        <div className={`text-2xl font-black leading-none ${
                                            esSugerido ? 'text-emerald-700' : 'text-gray-900'
                                        }`}>
                                            {carga.puntosActivos}
                                        </div>
                                        <div className={`text-[11px] font-medium mt-1 ${
                                            esSugerido ? 'text-emerald-800/80' : 'text-gray-500'
                                        }`}>
                                            Puntos activos
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Comentario Informativo sobre Personal Inactivo */}
                {abogadosInactivos.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/70 text-xs text-gray-500">
                        <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                            <strong className="text-gray-700">Registro histórico:</strong>{' '}
                            {abogadosInactivos.map((a, i) => (
                                <span key={a.abogado.id}>
                                    {a.abogado.nombre} cuenta con <strong>{a.puntosActivos} puntos</strong>
                                    {i < abogadosInactivos.length - 1 ? ', ' : ''}
                                </span>
                            ))} (personal inactivo).
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

