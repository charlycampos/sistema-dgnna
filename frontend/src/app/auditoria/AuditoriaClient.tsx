'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  Eye,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Activity,
  Layers,
  Scale,
  Globe,
  FileText,
  Eye as EyeIcon,
  CalendarDays,
  BarChart3,
  Users,
  ShieldCheck,
  X
} from 'lucide-react'
import type { SessionPayload } from '@/lib/auth'

interface DiffItem {
  campo: string
  antes: any
  despues: any
}

interface AuditoriaLog {
  id: string
  modulo: string
  tablaAfectada: string
  registroId: string
  codigoReferencia?: string
  accion: string
  camposCambiados?: string
  valoresPrevios?: string
  valoresNuevos?: string
  usuarioId: string
  usuarioNombre: string
  usuarioRol?: string
  ipOrigen?: string
  createdAt: string
  diffs?: DiffItem[]
}

interface AuditoriaKPIs {
  totalHoy: number
  totalModificaciones: number
  totalCreaciones: number
  totalEliminaciones: number
  totalSeguridad: number
  totalGeneral: number
  porModulo: Record<string, number>
}

interface Props {
  session: SessionPayload
}

const MODULOS_CONFIG = [
  { id: 'todos', label: 'Todos (Consolidado)', icon: <Layers className="w-3.5 h-3.5" />, color: 'bg-slate-800 text-white' },
  { id: 'normativa', label: 'Consulta Normativa (IA / Búsquedas)', icon: <Scale className="w-3.5 h-3.5" />, color: 'bg-violet-600 text-white' },
  { id: 'sustracion', label: 'Sustracción Int.', icon: <Globe className="w-3.5 h-3.5" />, color: 'bg-blue-600 text-white' },
  { id: 'apelaciones', label: 'Apelaciones', icon: <Scale className="w-3.5 h-3.5" />, color: 'bg-indigo-600 text-white' },
  { id: 'proyectos-ley', label: 'Proyectos de Ley', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-amber-600 text-white' },
  { id: 'transparencia', label: 'Transparencia', icon: <EyeIcon className="w-3.5 h-3.5" />, color: 'bg-cyan-600 text-white' },
  { id: 'sala', label: 'Salas de Reunión', icon: <CalendarDays className="w-3.5 h-3.5" />, color: 'bg-emerald-600 text-white' },
  { id: 'poi', label: 'POI - PP0117', icon: <BarChart3 className="w-3.5 h-3.5" />, color: 'bg-purple-600 text-white' },
  { id: 'prevenir-proteger', label: 'Prevenir / Mapa', icon: <ShieldAlert className="w-3.5 h-3.5" />, color: 'bg-rose-600 text-white' },
  { id: 'usuarios', label: 'Seguridad / Usuarios', icon: <Users className="w-3.5 h-3.5" />, color: 'bg-teal-600 text-white' },
]

export default function AuditoriaClient({ session }: Props) {
  const [logs, setLogs] = useState<AuditoriaLog[]>([])
  const [stats, setStats] = useState<AuditoriaKPIs | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [exporting, setExporting] = useState<boolean>(false)

  // Filtros
  const [selectedModulo, setSelectedModulo] = useState<string>('todos')
  const [selectedAccion, setSelectedAccion] = useState<string>('TODAS')
  const [temporalRange, setTemporalRange] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalRecords, setTotalRecords] = useState<number>(0)
  const limit = 20

  // Modal de diferencias
  const [modalLog, setModalLog] = useState<AuditoriaLog | null>(null)

  // Cargar estadísticas
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/auditoria/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error al cargar estadísticas de auditoría:', err)
    }
  }, [])

  // Cargar logs con filtros
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedModulo !== 'todos') params.append('modulo', selectedModulo)
      if (selectedAccion !== 'TODAS') params.append('accion', selectedAccion)
      if (searchQuery.trim()) params.append('busqueda', searchQuery.trim())
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      // Rango de fechas
      const hoy = new Date()
      if (temporalRange === 'hoy') {
        const strHoy = hoy.toISOString().split('T')[0]
        params.append('fechaDesde', strHoy)
      } else if (temporalRange === '7dias') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        params.append('fechaDesde', d.toISOString().split('T')[0])
      } else if (temporalRange === 'mes') {
        const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        params.append('fechaDesde', d.toISOString().split('T')[0])
      }

      const res = await fetch(`/api/auditoria?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.items || [])
        setTotalRecords(data.total || 0)
        setTotalPages(Math.ceil((data.total || 0) / limit) || 1)
      } else {
        toast.error('No se pudieron cargar los registros de auditoría')
      }
    } catch (err) {
      console.error('Error al consultar auditoría:', err)
      toast.error('Error de conexión al consultar auditoría')
    } finally {
      setLoading(false)
    }
  }, [selectedModulo, selectedAccion, searchQuery, temporalRange, page])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (selectedModulo !== 'todos') params.append('modulo', selectedModulo)
      if (selectedAccion !== 'TODAS') params.append('accion', selectedAccion)
      
      const hoy = new Date()
      if (temporalRange === 'hoy') {
        params.append('fechaDesde', hoy.toISOString().split('T')[0])
      } else if (temporalRange === '7dias') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        params.append('fechaDesde', d.toISOString().split('T')[0])
      }

      const res = await fetch(`/api/auditoria/exportar/excel?${params.toString()}`)
      if (!res.ok) throw new Error('Error al generar Excel')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria_dgnna_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Reporte de auditoría exportado exitosamente')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo exportar el reporte a Excel')
    } finally {
      setExporting(false)
    }
  }

  const renderBadgeAccion = (accion: string) => {
    switch (accion.toUpperCase()) {
      case 'CREAR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            🟢 CREAR
          </span>
        )
      case 'MODIFICAR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            🔵 MODIFICAR
          </span>
        )
      case 'ELIMINAR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            🔴 ELIMINAR
          </span>
        )
      case 'PERMISOS':
      case 'LOGIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🟠 {accion.toUpperCase()}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {accion}
          </span>
        )
    }
  }

  const formatFecha = (fechaIso: string) => {
    try {
      const d = new Date(fechaIso)
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return fechaIso
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* BARRA SUPERIOR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/menu"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Volver al menú principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-lg font-black text-slate-900">Auditoría y Trazabilidad del Sistema</h1>
              </div>
              <p className="text-xs text-slate-500">
                Registro inmutable de actividades, modificaciones y control de cambios en los 7 módulos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                fetchStats()
                fetchLogs()
              }}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || logs.length === 0}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exportando...' : 'Exportar Excel'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
        {/* TARJETAS DE INDICADORES (KPIS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Eventos de Hoy</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalHoy ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total en la jornada</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Modificaciones</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1">{stats?.totalModificaciones ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Actualizaciones de datos</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Creaciones Nuevas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats?.totalCreaciones ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Expedientes ingresados</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Eliminaciones / Alertas</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats?.totalEliminaciones ?? 0}</div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Registros eliminados</div>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS POR MÓDULO (1-CLIC) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Filtrar por Módulo
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Total auditado: <b>{totalRecords}</b> registros
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {MODULOS_CONFIG.map((mod) => {
              const isActive = selectedModulo === mod.id
              const count = mod.id === 'todos' 
                ? stats?.totalGeneral ?? 0 
                : stats?.porModulo?.[mod.id] ?? 0

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    setSelectedModulo(mod.id)
                    setPage(1)
                  }}
                  className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mod.icon}
                  <span>{mod.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* FILTROS ADICIONALES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            {/* Buscador */}
            <div className="relative">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Búsqueda por Expediente / Usuario
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Ej: CASO-2026, Carlos..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* Acción */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo de Acción</label>
              <select
                value={selectedAccion}
                onChange={(e) => {
                  setSelectedAccion(e.target.value)
                  setPage(1)
                }}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="TODAS">Todas las acciones</option>
                <option value="CREAR">🟢 Solo Creaciones (CREAR)</option>
                <option value="MODIFICAR">🔵 Solo Modificaciones (MODIFICAR)</option>
                <option value="ELIMINAR">🔴 Solo Eliminaciones (ELIMINAR)</option>
                <option value="PERMISOS">🟠 Seguridad y Permisos</option>
              </select>
            </div>

            {/* Rango temporal */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Período de Tiempo</label>
              <select
                value={temporalRange}
                onChange={(e) => {
                  setTemporalRange(e.target.value)
                  setPage(1)
                }}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="todos">Todo el historial</option>
                <option value="hoy">Hoy</option>
                <option value="7dias">Últimos 7 días</option>
                <option value="mes">Este mes</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE AUDITORÍA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-3">Módulo</th>
                  <th className="py-3 px-3">Expediente / Ref.</th>
                  <th className="py-3 px-3 text-center">Acción</th>
                  <th className="py-3 px-4">Campos Modificados</th>
                  <th className="py-3 px-4">Usuario Responsable</th>
                  <th className="py-3 px-4 text-right">Comparativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Cargando registros de auditoría...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No se encontraron eventos de auditoría con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatFecha(log.createdAt)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                        {log.modulo.toUpperCase()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-semibold text-indigo-600">
                        {log.codigoReferencia || log.registroId}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {renderBadgeAccion(log.accion)}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {log.camposCambiados ? (
                          <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {log.camposCambiados}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{log.usuarioNombre}</div>
                        <div className="text-[10px] text-slate-400">{log.usuarioRol || 'Usuario'}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setModalLog(log)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver Cambios</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          {!loading && logs.length > 0 && (
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div>
                Página <b>{page}</b> de <b>{totalPages}</b> (Total: <b>{totalRecords}</b> eventos)
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 font-medium transition"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg font-mono">
                  {page}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 font-medium transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE COMPARACIÓN DE CAMBIOS (DIFF VIEWER) */}
      {modalLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header del Modal */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <Eye className="w-4 h-4 text-indigo-300" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">
                    Detalle de Cambios — {modalLog.codigoReferencia || modalLog.registroId}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Módulo: <span className="font-semibold uppercase">{modalLog.modulo}</span> | Tabla: {modalLog.tablaAfectada}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadatos del Evento */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Usuario</span>
                <span className="font-semibold text-slate-800">{modalLog.usuarioNombre}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Rol</span>
                <span className="text-slate-700">{modalLog.usuarioRol || 'Especialista'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha / Hora</span>
                <span className="font-semibold text-slate-800 font-mono text-[11px]">
                  {formatFecha(modalLog.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Dirección IP</span>
                <span className="text-slate-700 font-mono text-[11px]">{modalLog.ipOrigen || '127.0.0.1'}</span>
              </div>
            </div>

            {/* Tabla Comparativa: Antes vs Después */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {modalLog.diffs && modalLog.diffs.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Campo Modificado</th>
                      <th className="py-2.5 px-3 w-1/3 text-rose-700 bg-rose-50/50">Valor Anterior ❌</th>
                      <th className="py-2.5 px-3 w-1/3 text-emerald-700 bg-emerald-50/50">Valor Nuevo ✅</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalLog.diffs.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {d.campo}
                        </td>
                        <td className="py-2.5 px-3 bg-rose-50/40 text-rose-800 line-through font-mono text-[11px] break-all">
                          {d.antes !== null && d.antes !== undefined ? String(d.antes) : '(Vacío / No definido)'}
                        </td>
                        <td className="py-2.5 px-3 bg-emerald-50/40 text-emerald-800 font-bold font-mono text-[11px] break-all">
                          {d.despues !== null && d.despues !== undefined ? String(d.despues) : '(Vacío / Eliminado)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 rounded-xl">
                  {modalLog.valoresNuevos ? (
                    <div className="text-left space-y-2">
                      <div className="font-semibold text-slate-700">Snapshot de Registro:</div>
                      <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] overflow-x-auto font-mono">
                        {JSON.stringify(JSON.parse(modalLog.valoresNuevos || '{}'), null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <span>No hay detalles estructurados de diferencias para este evento.</span>
                  )}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
