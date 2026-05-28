'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PanelAsignacion } from '@/components/panel-asignacion'
import { AppSidebar } from '@/components/app-sidebar'
import {
  FileText, Plus, Settings, Scale, Clock,
  CheckCircle2, AlertCircle, Building2, ArrowRight, TrendingUp, ClipboardList,
} from 'lucide-react'
import type { EstadisticasDashboard, CargaRevisor } from '@/types'
import { useMe } from '@/lib/use-me'

interface CargaRevisorData {
  revisorId: string
  nombre: string
  totalCasos: number
  casosPendientes: number
  casosResueltos: number
  casosAtendidos: number
}

export default function HomePage() {
  const [stats, setStats] = useState<EstadisticasDashboard | null>(null)
  const [cargaRevisores, setCargaRevisores] = useState<CargaRevisorData[]>([])
  const [loading, setLoading] = useState(true)
  const { canWrite } = useMe()

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const [dashRes, revisoresRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/revisor/carga'),
      ])
      const data = await dashRes.json()
      setStats(data)
      if (revisoresRes.ok) {
        const revData = await revisoresRes.json()
        setCargaRevisores(Array.isArray(revData) ? revData : [])
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />

      {/* Contenido principal desplazado por el sidebar */}
      <div className="flex-1 ml-56 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sistema de Gestión de Apelaciones</h1>
            <p className="text-xs text-gray-400">DGNNA - Ministerio de la Mujer</p>
          </div>
          <div className="flex gap-2">
            {canWrite('apelaciones') && (
              <Link href="/apelaciones/nueva">
                <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nueva Apelación
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 px-6 py-6 space-y-6">
          {/* Alerta plazos */}
          {(stats?.casosConPlazoProximo ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">
                {stats!.casosConPlazoProximo} caso{stats!.casosConPlazoProximo > 1 ? 's' : ''} con plazo próximo a vencer —{' '}
                <Link href="/apelaciones" className="underline underline-offset-2">revisar ahora</Link>
              </p>
            </div>
          )}

          {/* Tarjetas estadísticas */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total de Casos</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalCasos || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pendientes</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{stats?.casosPendientes || 0}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Resueltos</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.casosResueltos || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Scale className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Atendidos</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats?.casosAtendidos || 0}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel asignación + Acciones */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {stats?.cargaPorAbogado && (
                <PanelAsignacion cargaAbogados={stats.cargaPorAbogado} />
              )}
            </div>
            <div className="space-y-6">
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {canWrite('apelaciones') && (
                    <Link href="/apelaciones/nueva" className="block">
                      <Button className="w-full justify-between bg-blue-600 hover:bg-blue-700" size="lg">
                        <span className="flex items-center"><Plus className="mr-2 h-4 w-4" />Nueva Apelación</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Link href="/apelaciones" className="block">
                    <Button variant="outline" className="w-full justify-between" size="lg">
                      <span className="flex items-center"><FileText className="mr-2 h-4 w-4" />Ver Apelaciones</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/configuracion" className="block">
                    <Button variant="outline" className="w-full justify-between" size="lg">
                      <span className="flex items-center"><Settings className="mr-2 h-4 w-4" />Configuración</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Link href="/reportes" className="block">
                <Button variant="outline" className="w-full justify-between h-auto py-4 border-dashed bg-gray-50/50 hover:bg-gray-100/80" size="lg">
                  <span className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-md">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <span className="block font-semibold text-gray-900">Reportes Avanzados</span>
                      <span className="block text-xs text-gray-500 font-normal">Estadísticas y productividad</span>
                    </div>
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Carga por Revisor + Por Complejidad — misma altura */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Carga por Revisor */}
            <Card className="bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Carga por Revisor</CardTitle>
                  <CardDescription>Casos asignados a cada revisor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cargaRevisores.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">Sin datos de revisores</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cargaRevisores.map((item) => {
                    const initials = item.nombre
                      .split(' ')
                      .slice(0, 2)
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                    return (
                      <div
                        key={item.revisorId}
                        className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50 hover:border-purple-200 transition-colors"
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{item.nombre}</p>
                          <p className="text-2xl font-bold text-purple-600 mt-0.5">{item.totalCasos}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

            {/* Por Complejidad */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-gray-500" />
                  Por Complejidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.casosPorComplejidad && stats.casosPorComplejidad.length > 0 ? (
                    stats.casosPorComplejidad.map((item, index) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500']
                      const total = stats.casosPorComplejidad.reduce((acc, i) => acc + (i.cantidad ?? 0), 0) || 1
                      const rawPct = ((item.cantidad ?? 0) / total) * 100
                      const pct = isFinite(rawPct) ? rawPct.toFixed(0) : '0'
                      return (
                        <div key={item.nombre} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate">{item.nombre}</span>
                            <span className="text-gray-500 font-medium">{item.cantidad}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[index % colors.length]} rounded-full`} style={{ width: `${Math.max(Number(pct), 5)}%` }} />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">Sin datos</p>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>{/* fin grid revisores + complejidad */}

          {/* Distribución por procedencia */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-500" />
                Distribución por Procedencia
              </CardTitle>
              <CardDescription>Top 10 dependencias con más casos pendientes</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.casosPorProcedencia && stats.casosPorProcedencia.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  {stats.casosPorProcedencia.slice(0, 10).map((proc) => (
                    <div key={proc.nombre} className="p-4 rounded-lg bg-gray-50 border hover:border-blue-200 transition-colors">
                      <p className="text-2xl font-bold text-gray-900">{proc.cantidad}</p>
                      <p className="text-sm text-gray-600 truncate">{proc.nombre}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay casos registrados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <footer className="border-t bg-white px-6 py-3">
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} DGNNA - Ministerio de la Mujer y Poblaciones Vulnerables
          </p>
        </footer>
      </div>
    </div>
  )
}
