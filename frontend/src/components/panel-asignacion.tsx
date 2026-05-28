'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scale, Trophy, Users } from 'lucide-react'
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

    const abogadoSugerido = cargaAbogados.reduce((prev, current) =>
        prev.puntosActivos < current.puntosActivos ? prev : current
    )
    const hayEmpate = cargaAbogados.filter(
        (a) => a.puntosActivos === abogadoSugerido.puntosActivos
    ).length > 1
    const maxPuntos = Math.max(...cargaAbogados.map((a) => a.puntosActivos ?? 0)) || 0

    return (
        <Card className="bg-white">
            <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Scale className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Sistema de Asignación Inteligente</CardTitle>
                        <CardDescription>Balance automático de carga de trabajo</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
                {/* Lista de abogados */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
                            Carga por Abogado
                        </h4>
                        <span className="text-xs text-gray-400">
                            Barra = puntos pendientes (máx: {maxPuntos} pts)
                        </span>
                    </div>

                    {cargaAbogados.map((carga, index) => {
                        const esSugerido = !hayEmpate && carga.abogado.id === abogadoSugerido.abogado.id
                        const esEmpate = hayEmpate && carga.puntosActivos === abogadoSugerido.puntosActivos
                        const maxPuntosAbogado = Math.max(...cargaAbogados.map((a) => a.puntosActivos ?? 0)) || 1
                        const pts = carga.puntosActivos ?? 0
                        const porcentaje = isFinite(pts / maxPuntosAbogado) ? (pts / maxPuntosAbogado) * 100 : 0

                        const bgColors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-amber-600']

                        return (
                            <div
                                key={carga.abogado.id}
                                className={`rounded-lg border p-4 ${esSugerido
                                        ? 'border-green-300 bg-green-50'
                                        : esEmpate
                                            ? 'border-amber-300 bg-amber-50'
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${bgColors[index % bgColors.length]}`}>
                                        {carga.abogado.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 truncate">{carga.abogado.nombre}</p>
                                            {esSugerido && (
                                                <Badge className="bg-green-600 text-white text-xs">
                                                    <Trophy className="h-3 w-3 mr-1" />
                                                    Sugerido
                                                </Badge>
                                            )}
                                            {esEmpate && (
                                                <Badge className="bg-amber-500 text-white text-xs">Empate</Badge>
                                            )}
                                        </div>

                                        <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${esSugerido ? 'bg-green-500' : esEmpate ? 'bg-amber-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${Math.max(isNaN(porcentaje) ? 0 : porcentaje, 5)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex-shrink-0 flex gap-6 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">{carga.casosActivos}</p>
                                            <p className="text-xs text-gray-500">Pendientes</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-blue-600">{carga.casosResueltos}</p>
                                            <p className="text-xs text-gray-500">Resueltos</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-gray-500">{carga.casosCerrados}</p>
                                            <p className="text-xs text-gray-500">Atendidos</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-green-600">{carga.puntosActivos}</p>
                                            <p className="text-xs text-gray-500">Puntos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
