'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PanelAsignacion } from '@/components/panel-asignacion'
import { AppSidebar } from '@/components/app-sidebar'
import {
  FileText, Plus, Settings, Scale, Clock,
  CheckCircle2, AlertCircle, Building2, ArrowRight, TrendingUp, ClipboardList, Menu,
  Calendar, Layers, Sparkles
} from 'lucide-react'
import type { EstadisticasDashboard, Abogado, CargaAbogado, CargaRevisor } from '@/types'
import { useMe } from '@/lib/use-me'

interface CargaRevisorData {
  revisorId: string
  nombre: string
  totalCasos: number
  casosPendientes: number
  casosResueltos: number
  casosAtendidos: number
}

type Periodo = 'mes' | 'trimestre' | 'ano'

export default function HomePage() {
  const [stats, setStats] = useState<EstadisticasDashboard | null>(null)
  const [rawApelaciones, setRawApelaciones] = useState<any[]>([])
  const [abogadosList, setAbogadosList] = useState<Abogado[]>([])
  const [cargaRevisoresOriginal, setCargaRevisoresOriginal] = useState<CargaRevisorData[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('ano')
  const [loading, setLoading] = useState(true)
  const { canWrite } = useMe()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handleCollapseChange = (e: Event) => {
      const customEvent = e as CustomEvent
      setSidebarCollapsed(customEvent.detail)
    }
    window.addEventListener('sidebar-collapse-changed', handleCollapseChange)
    return () => window.removeEventListener('sidebar-collapse-changed', handleCollapseChange)
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const [dashRes, revisoresRes, apelRes, abgsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/revisor/carga'),
        fetch('/api/apelaciones'),
        fetch('/api/abogados'),
      ])

      if (dashRes.ok) {
        const data = await dashRes.json()
        setStats(data)
      }
      if (revisoresRes.ok) {
        const revData = await revisoresRes.json()
        setCargaRevisoresOriginal(Array.isArray(revData) ? revData : [])
      }
      if (apelRes.ok) {
        const apelData = await apelRes.json()
        setRawApelaciones(Array.isArray(apelData) ? apelData : [])
      }
      if (abgsRes.ok) {
        const abgsData = await abgsRes.json()
        setAbogadosList(Array.isArray(abgsData) ? abgsData : [])
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // MOTOR DE CÁLCULO Y FILTRADO REACTIVO POR PERÍODO
  // ─────────────────────────────────────────────────────────────────
  const { statsFiltradas, revisoresFiltrados, countPeriodo } = useMemo(() => {
    if (!rawApelaciones || rawApelaciones.length === 0) {
      return {
        statsFiltradas: stats,
        revisoresFiltrados: cargaRevisoresOriginal,
        countPeriodo: stats?.totalCasos || 0,
      }
    }

    const anioActual = 2026
    const mesActual = 7 // Agosto (0-indexed: 0=Ene ... 7=Ago)

    let desde: Date
    let hasta: Date

    if (periodo === 'mes') {
      // Mes Actual: Agosto 2026 (01/08/2026 al 31/08/2026)
      desde = new Date(anioActual, mesActual, 1, 0, 0, 0)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      // III Trimestre: Julio, Agosto, Setiembre (01/07/2026 al 30/09/2026)
      const q = Math.floor(mesActual / 3) // 2 -> Q3
      desde = new Date(anioActual, q * 3, 1, 0, 0, 0)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      // Año Completo 2026
      desde = new Date(anioActual, 0, 1, 0, 0, 0)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    // Filtrar expedientes según fechaIngreso / createdAt
    const filtrados = rawApelaciones.filter(a => {
      const f = a.fechaIngreso ? new Date(a.fechaIngreso) : (a.createdAt ? new Date(a.createdAt) : null)
      if (!f || isNaN(f.getTime())) return false
      return f >= desde && f <= hasta
    })

    const totalCasos = filtrados.length
    const casosPendientes = filtrados.filter(a => a.estado === 'Pendiente').length
    const casosResueltos = filtrados.filter(a => a.estado === 'Resuelto').length
    const casosAtendidos = filtrados.filter(a => a.estado === 'Atendido').length

    // Casos con plazo próximo a vencer (plazo <= 5 días calendario o hábiles)
    const hoy = new Date(2026, mesActual, 28) // fecha de referencia del sistema
    const casosConPlazoProximo = filtrados.filter(a => {
      if (a.estado !== 'Pendiente' || !a.plazoVencimiento) return false
      const fv = new Date(a.plazoVencimiento)
      if (isNaN(fv.getTime())) return false
      const diffDias = Math.ceil((fv.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diffDias >= 0 && diffDias <= 5
    }).length

    // 1. Recalcular Balance de Abogados para el período
    const abMap: Record<
      string,
      { model: Abogado; casosActivos: number; casosResueltos: number; casosCerrados: number; puntosActivos: number }
    > = {}

    abogadosList
      .filter(ab => ab.activo)
      .forEach(ab => {
        abMap[ab.id] = {
          model: ab,
          casosActivos: 0,
          casosResueltos: 0,
          casosCerrados: 0,
          puntosActivos: 0,
        }
      })

    filtrados.forEach(a => {
      if (a.abogadoId && abMap[a.abogadoId]) {
        if (a.estado === 'Pendiente') {
          abMap[a.abogadoId].casosActivos++
          abMap[a.abogadoId].puntosActivos += a.puntosTotal || 0
        } else if (a.estado === 'Resuelto') {
          abMap[a.abogadoId].casosResueltos++
        } else if (a.estado === 'Atendido') {
          abMap[a.abogadoId].casosCerrados++
        }
      }
    })

    const cargaPorAbogado: CargaAbogado[] = Object.values(abMap).map(item => ({
      abogado: item.model,
      casosActivos: item.casosActivos,
      casosResueltos: item.casosResueltos,
      casosCerrados: item.casosCerrados,
      puntosActivos: item.puntosActivos,
    }))

    // 2. Recalcular Carga por Revisor
    const revMap: Record<string, { revisorId: string; nombre: string; totalCasos: number; casosPendientes: number; casosResueltos: number; casosAtendidos: number }> = {}
    cargaRevisoresOriginal.forEach(r => {
      revMap[r.revisorId] = { ...r, totalCasos: 0, casosPendientes: 0, casosResueltos: 0, casosAtendidos: 0 }
    })

    filtrados.forEach(a => {
      if (a.revisorId && revMap[a.revisorId]) {
        revMap[a.revisorId].totalCasos++
        if (a.estado === 'Pendiente') revMap[a.revisorId].casosPendientes++
        else if (a.estado === 'Resuelto') revMap[a.revisorId].casosResueltos++
        else if (a.estado === 'Atendido') revMap[a.revisorId].casosAtendidos++
      }
    })

    const revisoresFiltrados = Object.values(revMap)

    // 3. Recalcular Complejidad
    const compMap: Record<string, number> = {}
    filtrados.forEach(a => {
      const cNombre = a.complejidadJuridica?.nombre || 'General'
      compMap[cNombre] = (compMap[cNombre] || 0) + 1
    })
    const casosPorComplejidad = Object.entries(compMap).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
    }))

    // 4. Recalcular Procedencias
    const procMap: Record<string, number> = {}
    filtrados.forEach(a => {
      const pNombre = a.procedencia || 'Otras Procedencias'
      procMap[pNombre] = (procMap[pNombre] || 0) + 1
    })
    const casosPorProcedencia = Object.entries(procMap)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    const statsFiltradas: EstadisticasDashboard = {
      totalCasos,
      casosPendientes,
      casosResueltos,
      casosAtendidos,
      casosConPlazoProximo: casosConPlazoProximo || stats?.casosConPlazoProximo || 0,
      cargaPorAbogado,
      cargaPorRevisor: (stats?.cargaPorRevisor || []) as CargaRevisor[],
      casosPorComplejidad,
      casosPorProcedencia,
    }

    return {
      statsFiltradas,
      revisoresFiltrados,
      countPeriodo: totalCasos,
    }
  }, [rawApelaciones, stats, cargaRevisoresOriginal, abogadosList, periodo])

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

  const periodoLabel = {
    mes: 'Mes Actual (Agosto 2026)',
    trimestre: 'III Trimestre 2026 (Jul - Set)',
    ano: 'Año Completo 2026',
  }[periodo]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />

      {/* Contenido principal desplazado por el sidebar */}
      <div className={`flex-1 ml-0 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-64'
      }`}>

        {/* Top bar con Selector de Período Integrado */}
        <header className="bg-white border-b px-4 py-3.5 md:px-6 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
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
            
            {/* Desktop Sidebar Collapse Toggle */}
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
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                  Sistema de Gestión de Apelaciones
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  {periodoLabel}
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-gray-400">DGNNA — Dirección General de Niñas, Niños y Adolescentes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botonera de Período */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
              <button
                type="button"
                onClick={() => setPeriodo('mes')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  periodo === 'mes'
                    ? 'bg-white text-blue-700 shadow-sm font-bold border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
                title="Filtrar por el mes actual (Agosto 2026)"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Mes Actual</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodo('trimestre')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  periodo === 'trimestre'
                    ? 'bg-white text-blue-700 shadow-sm font-bold border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
                title="Filtrar por el trimestre actual (III Trimestre: Jul - Set)"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trimestre</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodo('ano')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  periodo === 'ano'
                    ? 'bg-white text-blue-700 shadow-sm font-bold border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
                title="Ver consolidado de todo el año 2026"
              >
                <Scale className="w-3.5 h-3.5 text-purple-600" />
                <span>Año 2026</span>
              </button>
            </div>

            {canWrite('apelaciones') && (
              <Link href="/apelaciones/nueva">
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-xs" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nueva Apelación
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 py-6 space-y-6">
          {/* Banner de Estado de Filtro */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>
                Visualizando <strong>{countPeriodo}</strong> expedientes correspondientes al período <strong>{periodoLabel}</strong>.
              </span>
            </div>
            <span className="text-[11px] text-blue-700/80 hidden md:inline">
              Datos sincronizados en tiempo real con Oracle Database XE
            </span>
          </div>

          {/* Alerta plazos */}
          {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-xs">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">
                {statsFiltradas!.casosConPlazoProximo} caso{statsFiltradas!.casosConPlazoProximo > 1 ? 's' : ''} con plazo próximo a vencer (&le; 5 días) —{' '}
                <Link href="/apelaciones" className="underline underline-offset-2 font-bold hover:text-red-950">revisar ahora en bandeja</Link>
              </p>
            </div>
          )}

          {/* 4 Tarjetas estadísticas Reactivas */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Casos</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1">{statsFiltradas?.totalCasos || 0}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{periodoLabel}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pendientes</p>
                    <p className="text-3xl font-extrabold text-amber-600 mt-1">{statsFiltradas?.casosPendientes || 0}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">En trámite activo</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resueltos</p>
                    <p className="text-3xl font-extrabold text-blue-600 mt-1">{statsFiltradas?.casosResueltos || 0}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Resolución emitida</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <Scale className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atendidos</p>
                    <p className="text-3xl font-extrabold text-green-600 mt-1">{statsFiltradas?.casosAtendidos || 0}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Concluidos formalmente</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel asignación inteligente + Acciones Rápidas */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {statsFiltradas?.cargaPorAbogado && (
                <PanelAsignacion cargaAbogados={statsFiltradas.cargaPorAbogado} />
              )}
            </div>
            <div className="space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-3 border-b bg-gray-50/50">
                  <CardTitle className="text-sm font-bold text-gray-800 uppercase tracking-wider">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-4">
                  {canWrite('apelaciones') && (
                    <Link href="/apelaciones/nueva" className="block">
                      <Button className="w-full justify-between bg-blue-600 hover:bg-blue-700 shadow-xs" size="lg">
                        <span className="flex items-center font-semibold"><Plus className="mr-2 h-4 w-4" />Nueva Apelación</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Link href="/apelaciones" className="block">
                    <Button variant="outline" className="w-full justify-between hover:border-blue-300 hover:bg-blue-50/30" size="lg">
                      <span className="flex items-center text-gray-700 font-medium"><FileText className="mr-2 h-4 w-4 text-blue-600" />Ver Apelaciones</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </Button>
                  </Link>
                  <Link href="/configuracion" className="block">
                    <Button variant="outline" className="w-full justify-between hover:border-purple-300 hover:bg-purple-50/30" size="lg">
                      <span className="flex items-center text-gray-700 font-medium"><Settings className="mr-2 h-4 w-4 text-purple-600" />Configuración</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Link href="/reportes" className="block">
                <Button variant="outline" className="w-full justify-between h-auto py-4 border-dashed border-gray-300 bg-gray-50/50 hover:bg-blue-50/40 hover:border-blue-300 transition-colors" size="lg">
                  <span className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-xl border border-blue-200">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-gray-900 text-sm">Reportes Avanzados</span>
                      <span className="block text-xs text-gray-500 font-normal">Estadísticas y productividad</span>
                    </div>
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Carga por Revisor + Por Complejidad */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Carga por Revisor */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-50 rounded-xl border border-purple-100">
                      <ClipboardList className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-gray-800 uppercase tracking-wider">Carga por Revisor Legal</CardTitle>
                      <CardDescription className="text-xs">Expedientes asignados en {periodoLabel}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {revisoresFiltrados.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">Sin datos de revisores para el período</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {revisoresFiltrados.map((item) => {
                      const initials = item.nombre
                        .split(' ')
                        .slice(0, 2)
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                      return (
                        <div
                          key={item.revisorId}
                          className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:shadow-xs transition-all"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{item.nombre}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-extrabold text-purple-600">{item.totalCasos}</span>
                              <span className="text-[11px] text-gray-400 font-medium">expedientes</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                              <span><strong className="text-amber-600">{item.casosPendientes}</strong> pend.</span>
                              <span><strong className="text-blue-600">{item.casosResueltos}</strong> res.</span>
                              <span><strong className="text-green-600">{item.casosAtendidos}</strong> aten.</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Por Complejidad Jurídica */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  Por Complejidad Jurídica
                </CardTitle>
                <CardDescription className="text-xs">Distribución de casos en {periodoLabel}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3.5">
                  {statsFiltradas?.casosPorComplejidad && statsFiltradas.casosPorComplejidad.length > 0 ? (
                    statsFiltradas.casosPorComplejidad.map((item, index) => {
                      const colors = ['bg-blue-600', 'bg-green-600', 'bg-amber-600', 'bg-purple-600']
                      const total = statsFiltradas.casosPorComplejidad.reduce((acc, i) => acc + (i.cantidad ?? 0), 0) || 1
                      const rawPct = ((item.cantidad ?? 0) / total) * 100
                      const pct = isFinite(rawPct) ? rawPct.toFixed(0) : '0'
                      return (
                        <div key={item.nombre} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-800 truncate">{item.nombre}</span>
                            <span className="text-gray-500 font-bold">{item.cantidad} ({pct}%)</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.max(Number(pct), 4)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-gray-400 py-6 text-sm">Sin datos para el período seleccionado</p>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Distribución por Procedencia */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Distribución por Procedencia
                  </CardTitle>
                  <CardDescription className="text-xs">Top dependencias con expedientes ingresados ({periodoLabel})</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {statsFiltradas?.casosPorProcedencia && statsFiltradas.casosPorProcedencia.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  {statsFiltradas.casosPorProcedencia.slice(0, 10).map((proc) => (
                    <div key={proc.nombre} className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xs transition-all">
                      <p className="text-2xl font-extrabold text-blue-700">{proc.cantidad}</p>
                      <p className="text-xs font-semibold text-gray-700 truncate mt-1" title={proc.nombre}>{proc.nombre}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No hay casos registrados en este período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <footer className="border-t bg-white px-6 py-3">
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} DGNNA — Ministerio de la Mujer y Poblaciones Vulnerables
          </p>
        </footer>
      </div>
    </div>
  )
}
