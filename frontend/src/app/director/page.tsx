'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  Scale,
  BarChart3,
  FileText,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Download,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Building2,
  Users2,
  DollarSign,
  ArrowLeft,
  Printer,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Inbox,
  UserCheck,
  Filter,
} from 'lucide-react'
import type { EstadisticasDashboard, ApelacionConRelaciones, Abogado } from '@/types'

// Tipos de sección
type SeccionId = 'resumen' | 'sustracion' | 'apelaciones' | 'poi' | 'proyectos-ley' | 'transparencia' | 'informes'

interface UsuarioSession {
  nombre: string
  rol: string
  email?: string
}

interface CargaRevisorItem {
  revisorId: string
  nombre: string
  totalCasos: number
  casosPendientes: number
  casosResueltos: number
  casosAtendidos: number
}

export default function DirectorPage() {
  const router = useRouter()
  const [seccion, setSeccion] = useState<SeccionId>('resumen')
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'ano'>('ano')
  const [session, setSession] = useState<UsuarioSession | null>(null)

  // Datos crudos en vivo desde el backend
  const [statsApelaciones, setStatsApelaciones] = useState<EstadisticasDashboard | null>(null)
  const [rawApelaciones, setRawApelaciones] = useState<ApelacionConRelaciones[]>([])
  const [abogadosList, setAbogadosList] = useState<Abogado[]>([])
  const [cargaRevisores, setCargaRevisores] = useState<CargaRevisorItem[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  // Cargar sesión del usuario
  useEffect(() => {
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setSession({
            nombre: data.nombre || data.user?.nombre || 'Dra. Directora General',
            rol: data.rol || data.user?.rol || 'directora',
            email: data.email || data.user?.email,
          })
        } else {
          setSession({
            nombre: 'Dra. Directora General',
            rol: 'directora',
          })
        }
      })
      .catch(() => {
        setSession({
          nombre: 'Dra. Directora General',
          rol: 'directora',
        })
      })
  }, [])

  // Cargar datos en vivo de Apelaciones y Abogados
  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => (r.ok ? r.json() : null)),
      fetch('/api/revisor/carga').then(r => (r.ok ? r.json() : [])),
      fetch('/api/apelaciones').then(r => (r.ok ? r.json() : [])),
      fetch('/api/abogados').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([dashData, revData, apelData, abgsData]) => {
        if (dashData) setStatsApelaciones(dashData)
        if (Array.isArray(revData)) setCargaRevisores(revData)
        if (Array.isArray(apelData)) setRawApelaciones(apelData)
        if (Array.isArray(abgsData)) setAbogadosList(abgsData)
      })
      .catch(err => {
        console.error('Error cargando datos de apelaciones:', err)
      })
      .finally(() => {
        setLoadingStats(false)
      })
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // MOTOR DE CÁLCULO Y FILTRADO POR PERÍODO (Mes, Trimestre, Año 2026)
  // ─────────────────────────────────────────────────────────────────
  const statsFiltradas = useMemo(() => {
    if (!rawApelaciones || rawApelaciones.length === 0) return statsApelaciones

    // Tomamos como referencia el año de la data (2026) y mes actual (Agosto = mes 7 en JS 0-index)
    const anioActual = 2026
    const mesActual = 7 // Agosto

    let desde: Date
    let hasta: Date

    if (periodo === 'mes') {
      // Mes Actual: Agosto 2026 (01/08/2026 - 31/08/2026)
      desde = new Date(anioActual, mesActual, 1, 0, 0, 0)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      // III Trimestre: Julio, Agosto, Septiembre 2026 (01/07/2026 - 30/09/2026)
      const q = Math.floor(mesActual / 3) // Q3 = 2
      desde = new Date(anioActual, q * 3, 1, 0, 0, 0)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      // Año Completo 2026 (01/01/2026 - 31/12/2026)
      desde = new Date(anioActual, 0, 1, 0, 0, 0)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    // Filtrar expedientes según fechaIngreso
    const filtrados = rawApelaciones.filter(a => {
      const f = a.fechaIngreso ? new Date(a.fechaIngreso) : (a.createdAt ? new Date(a.createdAt) : null)
      if (!f || isNaN(f.getTime())) return false
      return f >= desde && f <= hasta
    })

    const totalCasos = filtrados.length
    const casosPendientes = filtrados.filter(a => a.estado === 'Pendiente').length
    const casosResueltos = filtrados.filter(a => a.estado === 'Resuelto').length
    const casosAtendidos = filtrados.filter(a => a.estado === 'Atendido').length

    // Recalcular balance de abogados para el período seleccionado
    const abMap: Record<
      string,
      { model: Abogado; casosActivos: number; casosResueltos: number; casosCerrados: number; puntosActivos: number }
    > = {}

    // Inicializar con los abogados activos
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
        if (a.estado === 'Pendiente') abMap[a.abogadoId].casosActivos++
        else if (a.estado === 'Resuelto') abMap[a.abogadoId].casosResueltos++
        else if (a.estado === 'Atendido') abMap[a.abogadoId].casosCerrados++

        abMap[a.abogadoId].puntosActivos += a.puntosTotal || 0
      }
    })

    const cargaPorAbogado = Object.values(abMap)
      .map(v => ({
        abogado: v.model,
        casosActivos: v.casosActivos,
        casosResueltos: v.casosResueltos,
        casosCerrados: v.casosCerrados,
        puntosActivos: v.puntosActivos,
      }))
      .sort((a, b) => b.puntosActivos - a.puntosActivos)

    // Recalcular por complejidad en este período
    const compMap: Record<string, number> = {}
    filtrados.forEach(a => {
      const nombre = a.complejidad?.nombre || 'Sin complejidad'
      compMap[nombre] = (compMap[nombre] || 0) + 1
    })
    const casosPorComplejidad = Object.entries(compMap).map(([nombre, cantidad]) => ({ nombre, cantidad }))

    // Recalcular por procedencia en este período
    const procMap: Record<string, number> = {}
    filtrados.forEach(a => {
      if (a.procedencia) {
        procMap[a.procedencia] = (procMap[a.procedencia] || 0) + 1
      }
    })
    const casosPorProcedencia = Object.entries(procMap)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    return {
      totalCasos,
      casosPendientes,
      casosResueltos,
      casosAtendidos,
      casosConPlazoProximo: statsApelaciones?.casosConPlazoProximo ?? 0,
      cargaPorAbogado,
      cargaPorRevisor: statsApelaciones?.cargaPorRevisor ?? [],
      casosPorComplejidad,
      casosPorProcedencia,
    }
  }, [rawApelaciones, abogadosList, periodo, statsApelaciones])

  // Recalcular carga de revisores para el período seleccionado
  const revisoresFiltrados = useMemo(() => {
    if (!rawApelaciones || rawApelaciones.length === 0 || cargaRevisores.length === 0) return cargaRevisores

    const anioActual = 2026
    const mesActual = 7

    let desde: Date
    let hasta: Date

    if (periodo === 'mes') {
      desde = new Date(anioActual, mesActual, 1, 0, 0, 0)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      const q = Math.floor(mesActual / 3)
      desde = new Date(anioActual, q * 3, 1, 0, 0, 0)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      desde = new Date(anioActual, 0, 1, 0, 0, 0)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    const filtrados = rawApelaciones.filter(a => {
      const f = a.fechaIngreso ? new Date(a.fechaIngreso) : (a.createdAt ? new Date(a.createdAt) : null)
      if (!f || isNaN(f.getTime())) return false
      return f >= desde && f <= hasta
    })

    return cargaRevisores.map(rev => {
      const casosRev = filtrados.filter(a => a.revisorId === rev.revisorId)
      return {
        ...rev,
        totalCasos: casosRev.length,
        casosPendientes: casosRev.filter(a => a.estado === 'Pendiente').length,
        casosResueltos: casosRev.filter(a => a.estado === 'Resuelto').length,
        casosAtendidos: casosRev.filter(a => a.estado === 'Atendido').length,
      }
    })
  }, [rawApelaciones, cargaRevisores, periodo])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  // Lista de secciones del Sidebar
  const seccionesMenu: { id: SeccionId; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    { id: 'resumen', label: 'Resumen General', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'sustracion', label: 'Sustracción Internacional', icon: <Globe className="w-5 h-5" />, badge: '2 Alertas', badgeColor: 'bg-red-100 text-red-700 border border-red-200' },
    {
      id: 'apelaciones',
      label: 'Apelaciones',
      icon: <Scale className="w-5 h-5" />,
      badge: (statsFiltradas?.casosConPlazoProximo ?? 0) > 0 ? `${statsFiltradas?.casosConPlazoProximo} Alertas` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    { id: 'poi', label: 'POI y Presupuesto PP117', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'proyectos-ley', label: 'Proyectos de Ley', icon: <FileText className="w-5 h-5" />, badge: '1 Urgente', badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200' },
    { id: 'transparencia', label: 'Transparencia y Plazos', icon: <Eye className="w-5 h-5" /> },
    { id: 'informes', label: 'Informes para Despacho', icon: <FileSpreadsheet className="w-5 h-5" />, badge: 'PDF', badgeColor: 'bg-blue-100 text-blue-700 border border-blue-200' },
  ]

  // Texto descriptivo del período activo
  const labelPeriodo = {
    mes: 'Mes Actual (Agosto 2026)',
    trimestre: 'III Trimestre (Jul - Set 2026)',
    ano: 'Año Fiscal 2026 Completo',
  }[periodo]

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          1. SIDEBAR LATERAL IZQUIERDO (100% Claro, Limpio y Elegante)
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-white text-slate-800 flex flex-col flex-shrink-0 border-r border-slate-200 shadow-sm z-20">
        
        {/* Header institucional */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20">
            ⚖️
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
              DGNNA · MIMP
            </h1>
            <p className="text-[11px] text-blue-700 font-bold mt-0.5">Centro de Mando Directivo</p>
          </div>
        </div>

        {/* Identificador de la Directora */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs border border-blue-200">
              {session?.nombre?.charAt(0) || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{session?.nombre || 'Directora General'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Alta Dirección</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menú de Navegación por Secciones */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ejes de Supervisión
          </p>
          {seccionesMenu.map(item => {
            const activo = seccion === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSeccion(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activo
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={activo ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer del Sidebar: Volver al menú o Salir */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <button
            onClick={() => router.push('/menu')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Volver al Menú</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. ÁREA PRINCIPAL DINÁMICA
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Cabecera Superior Clara */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {seccionesMenu.find(s => s.id === seccion)?.label}
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                Vista Macro Directiva
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                <Filter className="w-3 h-3 text-blue-600" />
                {labelPeriodo}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dirección General de Niñas, Niños y Adolescentes · Información consolidada en tiempo real
            </p>
          </div>

          {/* Selector Temporal Dinámico (Mes / Trimestre / Año 2026) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shadow-inner">
              <button
                onClick={() => setPeriodo('mes')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  periodo === 'mes'
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold scale-102'
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Mes Actual
              </button>
              <button
                onClick={() => setPeriodo('trimestre')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  periodo === 'trimestre'
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold scale-102'
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Trimestre
              </button>
              <button
                onClick={() => setPeriodo('ano')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  periodo === 'ano'
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold scale-102'
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Año 2026
              </button>
            </div>

            <button
              onClick={() => setSeccion('informes')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Informe Despacho</span>
            </button>
          </div>
        </header>

        {/* Contenedor con Scroll del Contenido Seleccionado */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* ══════════════════════════════════════════════════════════
              VISTA 1: RESUMEN GENERAL (Tablero Panorámico Claro)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'resumen' && (
            <div className="space-y-8">
              {/* 4 KPIs Clave Superiores */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">NNA Atendidos (Total)</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      👥
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {periodo === 'mes' ? '580' : periodo === 'trimestre' ? '1,640' : '4,820'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+{periodo === 'mes' ? '8.5%' : periodo === 'trimestre' ? '15.2%' : '12.4%'} vs período anterior</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Sustracción Internacional</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      🌍
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {periodo === 'mes' ? '6' : periodo === 'trimestre' ? '14' : '38'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    {periodo === 'mes'
                      ? '4 Requerida · 2 Requirente · 2 Retornos'
                      : periodo === 'trimestre'
                      ? '9 Requerida · 5 Requirente · 6 Retornos'
                      : '24 Requerida · 14 Requirente · 18 Retornos'}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Apelaciones ({labelPeriodo})</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {statsFiltradas?.totalCasos ?? (periodo === 'mes' ? 12 : periodo === 'trimestre' ? 28 : 175)}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-2">
                    {statsFiltradas?.casosAtendidos ?? 0} concluidos · {statsFiltradas?.casosPendientes ?? 0} activos
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Ejecución PP 0117 / POI</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-amber-600">
                    {periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%'}
                  </p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{
                        width: periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Panel de 2 Columnas: Radar de Alertas Críticas (Izquierda) + Carga por Dirección (Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Radar de Alertas Tempranas */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      <h3 className="font-extrabold text-sm text-slate-900">Radar de Alertas Críticas</h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 ? `${(statsFiltradas?.casosConPlazoProximo ?? 0) + 2} Urgentes` : '2 Urgentes'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-red-800 mb-1">
                        <span>🌍 Sustracción · Art. 4 La Haya</span>
                        <span className="text-[10px] bg-red-200/80 px-1.5 py-0.5 rounded text-red-900 font-bold">45 días restantes</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        El menor en el caso <strong>EXP-2026-089 (España → Perú)</strong> cumplirá 16 años el 12/10/2026. Requiere impulso judicial prioritario.
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-800 mb-1">
                        <span>📜 Congreso · Comisión de Mujer</span>
                        <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900 font-bold">48h límite</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Proyecto de Ley N.° 7842/2026-CR: Opinión técnica institucional solicitada con fecha de entrega improrrogable.
                      </p>
                    </div>

                    {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 && (
                      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-blue-800 mb-1">
                          <span>⚖️ Apelaciones · Vencimiento SLA</span>
                          <span className="text-[10px] bg-blue-200/80 px-1.5 py-0.5 rounded text-blue-900 font-bold">
                            {statsFiltradas?.casosConPlazoProximo} caso(s)
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {statsFiltradas?.casosConPlazoProximo} expediente(s) tienen plazo de emisión de resolución por vencer en los próximos 5 días hábiles.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumen de Productividad por Direcciones */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <h3 className="font-extrabold text-sm text-slate-900">Estado de Carga por Módulo Misional</h3>
                    <span className="text-xs text-slate-400 font-medium">{labelPeriodo}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">🌍 Sustracción Internacional</span>
                        <span className="text-blue-700">84% de Avance Promedio</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '84%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">
                          ⚖️ Apelaciones ({statsFiltradas?.totalCasos ?? 175} Expedientes)
                        </span>
                        <span className="text-emerald-700">
                          {statsFiltradas && statsFiltradas.totalCasos > 0
                            ? Math.round((statsFiltradas.casosAtendidos / statsFiltradas.totalCasos) * 100)
                            : 0}% Concluidos
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${
                              statsFiltradas && statsFiltradas.totalCasos > 0
                                ? Math.max(Math.round((statsFiltradas.casosAtendidos / statsFiltradas.totalCasos) * 100), 5)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">📊 POI - Metas Físicas Alcanzadas (PP 0117)</span>
                        <span className="text-indigo-700">
                          {periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%'} Meta
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">📜 Proyectos de Ley Atendidos</span>
                        <span className="text-purple-700">95% Opiniones Emitidas</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Capacidad operativa global de la DGNNA:</span>
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      🟢 Óptima (94.2%)
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 2: SUSTRACCIÓN INTERNACIONAL (La Haya 1980)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'sustracion' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Casos en Cartera</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {periodo === 'mes' ? '6' : periodo === 'trimestre' ? '14' : '38'}
                  </p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">Convenio de La Haya 1980</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Perú AC Requerida</p>
                  <p className="text-3xl font-black text-indigo-700 mt-1">
                    {periodo === 'mes' ? '4' : periodo === 'trimestre' ? '9' : '24'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Menores trasladados al Perú</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Perú AC Requirente</p>
                  <p className="text-3xl font-black text-purple-700 mt-1">
                    {periodo === 'mes' ? '2' : periodo === 'trimestre' ? '5' : '14'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Menores trasladados al exterior</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Retornos Concretados</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {periodo === 'mes' ? '2' : periodo === 'trimestre' ? '6' : '18'}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Acuerdos amigables + Judiciales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                    🌍 Top Países Involucrados
                  </h3>
                  <div className="space-y-3">
                    {[
                      { pais: 'España', casos: 12, pct: 32 },
                      { pais: 'Italia', casos: 8, pct: 21 },
                      { pais: 'Argentina', casos: 6, pct: 16 },
                      { pais: 'Estados Unidos', casos: 5, pct: 13 },
                      { pais: 'Chile', casos: 4, pct: 10 },
                      { pais: 'Otros países', casos: 3, pct: 8 },
                    ].map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 w-32">{p.pais}</span>
                        <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${p.pct}%` }} />
                        </div>
                        <span className="font-black text-slate-900 w-12 text-right">{p.casos} casos</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                    ⚖️ Distribución por Etapa Normativa
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-700">1. Evaluación Inicial de Admisibilidad</span>
                      <span className="font-extrabold text-slate-900">4 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="font-semibold text-amber-800">2. Subsanación de Requisitos (5 días)</span>
                      <span className="font-extrabold text-amber-900">2 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="font-semibold text-blue-800">3. Retorno Voluntario / Cooperación</span>
                      <span className="font-extrabold text-blue-900">8 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                      <span className="font-semibold text-indigo-800">4. Vía Judicial Nacional / Extranjera</span>
                      <span className="font-extrabold text-indigo-900">12 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="font-semibold text-emerald-800">5. Concluidos y Archivados (Éxito)</span>
                      <span className="font-extrabold text-emerald-900">12 casos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 3: APELACIONES (Filtrado Dinámico según Período)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'apelaciones' && (
            <div className="space-y-6">

              {/* Banner de Alerta de Plazos si hay casos próximos a vencer */}
              {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 && (
                <div className="flex items-center justify-between p-4 rounded-2xl border border-red-200 bg-red-50/80 text-red-900 shadow-sm">
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <span>
                      ⚠️ <strong>Alerta Directiva SLA:</strong> {statsFiltradas?.casosConPlazoProximo} caso{statsFiltradas?.casosConPlazoProximo! > 1 ? 's' : ''} con plazo legal próximo a vencer (≤ 5 días hábiles). Requieren impulso prioritario para emisión de resolución.
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/apelaciones')}
                    className="flex items-center gap-1 text-xs font-bold text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors shrink-0 shadow-sm"
                  >
                    <span>Ver en Bandeja</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 4 Tarjetas de Estado (Recalculadas en Vivo según el Filtro Activo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Expedientes</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Inbox className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {statsFiltradas?.totalCasos ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1.5">
                    Ingresados en {labelPeriodo}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Pendientes</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-amber-600 mt-1">
                    {statsFiltradas?.casosPendientes ?? 0}
                  </p>
                  <p className="text-xs text-amber-700 font-medium mt-1.5">
                    En calificación y atención legal
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Resueltos</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Scale className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-blue-600 mt-1">
                    {statsFiltradas?.casosResueltos ?? 0}
                  </p>
                  <p className="text-xs text-blue-700 font-medium mt-1.5">
                    Con proyecto emitido / en revisión
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Atendidos (Concluidos)</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {statsFiltradas?.casosAtendidos ?? 0}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mt-1.5">
                    Con resolución y cargo notificado
                  </p>
                </div>
              </div>

              {/* Panel de Asignación y Balance de Carga por Abogado (Dinámico) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Balance de Carga y Disponibilidad de Abogados · {labelPeriodo}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ponderación basada en foliatura y complejidad jurídica de los expedientes del período
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                    {statsFiltradas?.cargaPorAbogado?.length ?? 4} Abogados Activos
                  </span>
                </div>

                {/* Tabla de Carga de Abogados */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3 px-2">Abogado Responsable</th>
                        <th className="pb-3 px-3 text-center">Pendientes</th>
                        <th className="pb-3 px-3 text-center">Resueltos</th>
                        <th className="pb-3 px-3 text-center">Atendidos</th>
                        <th className="pb-3 px-3 text-center">Puntos Complejidad</th>
                        <th className="pb-3 px-3 text-right">Capacidad Operativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statsFiltradas?.cargaPorAbogado && statsFiltradas.cargaPorAbogado.length > 0 ? (
                        statsFiltradas.cargaPorAbogado.map((item, idx) => {
                          const puntos = item.puntosActivos || 0
                          const esDisponible = puntos < 50
                          const esAlta = puntos >= 160

                          return (
                            <tr key={item.abogado?.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                                    {item.abogado?.nombre?.charAt(0) || 'A'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{item.abogado?.nombre}</p>
                                    <p className="text-[10px] text-slate-400">Especialista Legal DGNNA</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  {item.casosActivos}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-blue-600">
                                {item.casosResueltos}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                                {item.casosCerrados}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span className="font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                  {puntos} pts
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {esDisponible ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    🟢 Disponible
                                  </span>
                                ) : esAlta ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    🟡 Carga Completa
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    🔵 En Capacidad
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No hay registros para este período seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2 Columnas: Carga por Revisor Legal + Distribución por Complejidad */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Carga por Revisor Legal */}
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Carga por Revisor Legal</h3>
                      <p className="text-xs text-slate-500">{labelPeriodo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {revisoresFiltrados && revisoresFiltrados.length > 0 ? (
                      revisoresFiltrados.map(rev => {
                        const iniciales = rev.nombre
                          ?.split(' ')
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase() || 'R'

                        return (
                          <div
                            key={rev.revisorId}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                {iniciales}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-xs truncate">{rev.nombre}</p>
                                <p className="text-[10px] text-slate-400">Revisor Asignado</p>
                              </div>
                            </div>
                            <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/60 text-xs">
                              <span className="text-slate-500 font-medium">Asignados en período:</span>
                              <span className="text-xl font-black text-purple-700">{rev.totalCasos}</span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-400 col-span-2 text-center py-4">Sin datos de revisores</p>
                    )}
                  </div>
                </div>

                {/* Por Complejidad Jurídica */}
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Distribución por Complejidad Jurídica</h3>
                      <p className="text-xs text-slate-500">{labelPeriodo}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {statsFiltradas?.casosPorComplejidad && statsFiltradas.casosPorComplejidad.length > 0 ? (
                      statsFiltradas.casosPorComplejidad.map((comp, i) => {
                        const total = statsFiltradas.totalCasos || 1
                        const pct = Math.round((comp.cantidad / total) * 100)
                        const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-indigo-600']

                        return (
                          <div key={comp.nombre} className="text-xs">
                            <div className="flex justify-between font-bold text-slate-700 mb-1">
                              <span>{comp.nombre}</span>
                              <span className="text-slate-900">
                                {comp.cantidad} casos ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${colors[i % colors.length]} h-2 rounded-full`}
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">Sin datos de complejidad para este período</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Distribución por Procedencia */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Top Órganos de Procedencia</h3>
                    <p className="text-xs text-slate-500">Dependencias con mayor volumen de apelaciones en {labelPeriodo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {statsFiltradas?.casosPorProcedencia && statsFiltradas.casosPorProcedencia.length > 0 ? (
                    statsFiltradas.casosPorProcedencia.slice(0, 10).map((proc, i) => (
                      <div
                        key={proc.nombre || i}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors"
                      >
                        <p className="text-xl font-black text-slate-900">{proc.cantidad}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate" title={proc.nombre}>
                          {proc.nombre}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 col-span-5 text-center py-4">Sin datos de procedencia para este período</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 4: POI Y PRESUPUESTO PP 0117
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'poi' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Presupuesto PIM Asignado</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">S/ 18,450,200</p>
                  <p className="text-xs text-slate-500 mt-1">Programa Presupuestal 0117</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Ejecución Financiera (Devengado)</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {periodo === 'mes'
                      ? 'S/ 1,549,800 (8.4%)'
                      : periodo === 'trimestre'
                      ? 'S/ 4,815,000 (26.1%)'
                      : 'S/ 14,465,000 (78.4%)'}
                  </p>
                  <p className="text-xs text-emerald-600 font-bold mt-1">Avance correspondiente a {labelPeriodo}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Saldo Presupuestal Restante</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">S/ 3,985,200</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Comprometido al IV Trimestre</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                  📊 Metas Físicas: DGNNA Sede Central vs 25 Unidades de Protección Especial (UPE) · {labelPeriodo}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                    <h4 className="font-extrabold text-blue-900 mb-2">🏛️ Sede Central DGNNA</h4>
                    <p className="text-slate-600 mb-3">Atención técnica, supervisión y normas directivas.</p>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Meta: {periodo === 'mes' ? '100' : periodo === 'trimestre' ? '300' : '1,200'} atenciones</span>
                      <span className="text-blue-700">88.5% alcanzado</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88.5%' }} />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <h4 className="font-extrabold text-emerald-900 mb-2">📍 25 UPE Regionales</h4>
                    <p className="text-slate-600 mb-3">Intervenciones directas y acogimiento familiar.</p>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Meta: {periodo === 'mes' ? '375' : periodo === 'trimestre' ? '1,125' : '4,500'} NNA</span>
                      <span className="text-emerald-700">76.2% alcanzado</span>
                    </div>
                    <div className="w-full bg-emerald-200 rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '76.2%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 5: PROYECTOS DE LEY (CONGRESO)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'proyectos-ley' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Iniciativas Recibidas</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">28</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Congreso de la República</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Opinión Favorable</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">16</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Fortalece derechos de NNA</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Con Observaciones</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">9</p>
                  <p className="text-xs text-amber-600 font-medium mt-1">Ajustes técnicos sugeridos</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Pendiente / Urgente</p>
                  <p className="text-3xl font-black text-red-600 mt-1">3</p>
                  <p className="text-xs text-red-600 font-bold mt-1">Plazo de envío &lt; 48 horas</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                  📜 Iniciativas Parlamentarias con Plazo Próximo
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-red-900">PL 7842/2026-CR · Comisión de la Mujer</span>
                      <p className="text-slate-700 mt-0.5">Modificación de la Ley de Adopciones y Tutela Especial.</p>
                    </div>
                    <span className="font-bold text-red-700 bg-white px-2.5 py-1 rounded-md border border-red-200">
                      ⏰ Vence en 48 horas
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">PL 7610/2026-CR · Comisión de Justicia</span>
                      <p className="text-slate-600 mt-0.5">Sanciones frente a la sustracción ilícita de menores.</p>
                    </div>
                    <span className="font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      🟢 Opinión Favorable lista
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 6: TRANSPARENCIA
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'transparencia' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Solicitudes Ciudadanas</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">45</p>
                  <p className="text-xs text-slate-500 mt-1">Ley N.° 27806</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Atendidas en Plazo</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">43</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">95.5% de cumplimiento</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">En Trámite (Dentro de Plazo)</p>
                  <p className="text-3xl font-black text-blue-600 mt-1">2</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Plazo legal de 7 días hábiles</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 7: INFORMES PARA DESPACHO MINISTERIAL (Claro y Oficial)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'informes' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 text-slate-900 p-8 rounded-3xl border border-blue-200/80 shadow-sm">
                <div className="max-w-2xl">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                    Rendición de Cuentas Ministerial
                  </span>
                  <h3 className="text-2xl font-black mt-3 text-slate-900">
                    Generador de Informes Ejecutivos Oficiales
                  </h3>
                  <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                    Descarga en formato formal y estructurado el consolidado de gestión de la DGNNA correspondiente a {labelPeriodo} para reuniones con el Despacho Ministerial.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3 border border-blue-100">
                      📑
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">Ayuda Memoria para la Ministra</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Resumen ejecutivo de 2 páginas con los hitos del {labelPeriodo}, casos emblemáticos y alertas prioritarias.
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / Exportar PDF</span>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 border border-indigo-100">
                      📊
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">Balance Estadístico La Haya</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Reporte de Sustracción Internacional para envío al Ministerio de Relaciones Exteriores (Cancillería).
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Reporte</span>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 border border-emerald-100">
                      💰
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">Estado Presupuestal PP 0117</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Ejecución física y financiera mensual comparativa para la Oficina General de Planeamiento y Presupuesto.
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar Excel / PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  )
}
