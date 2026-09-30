'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft, Inbox, Clock, CheckCircle, AlertTriangle, Timer, RefreshCw,
  Calendar, Filter, CalendarDays, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'
import { clasificarAlerta, diasHabilesRestantes } from '@/lib/calcular-plazo'
import type { TransparenciaRegistro } from '@/types'

// Paleta de colores para gráficos de barras simples
const COLORES_DIR = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981']
const COLORES_CAT = ['#06b6d4','#f97316','#84cc16','#e879f9','#fb7185','#34d399']

const MESES = [
  { value: 'todos', label: 'Todos los meses' },
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
]

function BarraHorizontal({
  label, valor, total, color,
}: { label: string; valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-muted-foreground">{valor} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

type TipoPeriodo = 'ano' | 'mes' | 'rango' | 'todos'

export default function TransparenciaDashboardPage() {
  const router = useRouter()
  const { me, meLoading, hasAccess } = useMe() as any
  const [registros, setRegistros] = useState<TransparenciaRegistro[]>([])
  const [loading, setLoading]     = useState(true)

  // Filtros de Periodo
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('ano')
  const [selectedAnio, setSelectedAnio] = useState<string>('2026')
  const [selectedMes, setSelectedMes]   = useState<string>('todos')
  const [fechaDesde, setFechaDesde]     = useState<string>('')
  const [fechaHasta, setFechaHasta]     = useState<string>('')

  useEffect(() => {
    if (!meLoading && me && !hasAccess('transparencia')) router.replace('/menu')
  }, [me, meLoading, hasAccess, router])

  useEffect(() => { fetchRegistros() }, [])

  const fetchRegistros = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/transparencia')
      const json = await res.json()
      if (!res.ok) { toast.error('Error al cargar datos del dashboard'); return }
      setRegistros(Array.isArray(json) ? json : [])
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // Lista dinámica de años disponibles a partir de los datos
  const aniosDisponibles = useMemo(() => {
    const set = new Set<string>()
    set.add('2026')
    registros.forEach(r => {
      const f = r.fechaIngreso || r.createdAt
      if (f) {
        const y = new Date(f).getFullYear()
        if (!isNaN(y)) set.add(String(y))
      }
    })
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [registros])

  // Filtrado reactivo de pedidos según el periodo elegido
  const pedidosFiltrados = useMemo(() => {
    if (tipoPeriodo === 'todos') return registros

    return registros.filter(r => {
      const fStr = r.fechaIngreso || r.createdAt
      if (!fStr) return false
      const f = new Date(fStr)
      if (isNaN(f.getTime())) return false

      if (tipoPeriodo === 'ano') {
        const matchesAnio = selectedAnio === 'todos' || String(f.getFullYear()) === selectedAnio
        if (!matchesAnio) return false
        if (selectedMes !== 'todos') {
          return f.getMonth() === Number(selectedMes)
        }
        return true
      }

      if (tipoPeriodo === 'mes') {
        const now = new Date()
        return f.getFullYear() === now.getFullYear() && f.getMonth() === now.getMonth()
      }

      if (tipoPeriodo === 'rango') {
        if (fechaDesde) {
          const d = new Date(fechaDesde); d.setHours(0,0,0,0)
          if (f < d) return false
        }
        if (fechaHasta) {
          const h = new Date(fechaHasta); h.setHours(23,59,59,999)
          if (f > h) return false
        }
        return true
      }

      return true
    })
  }, [registros, tipoPeriodo, selectedAnio, selectedMes, fechaDesde, fechaHasta])

  // Estadísticas calculadas reactivamente
  const dashboardCalculado = useMemo(() => {
    const total = pedidosFiltrados.length
    const pendientes = pedidosFiltrados.filter(r => r.estado === 'Pendiente').length
    const enProceso = pedidosFiltrados.filter(r => r.estado === 'En Proceso').length
    const atendidos = pedidosFiltrados.filter(r => r.estado === 'Atendido').length

    let vencidos = 0
    let proximosVencer = 0

    pedidosFiltrados.forEach(r => {
      const alerta = clasificarAlerta(r.plazoVencimiento, r.estado)
      if (alerta === 'vencido') vencidos++
      if (alerta === 'proximo' || alerta === 'urgente') proximosVencer++
    })

    // Por Dirección
    const dirMap: Record<string, number> = {}
    pedidosFiltrados.forEach(r => {
      const rawDir: any = r.direccion
      const dirs: string[] = Array.isArray(rawDir)
        ? rawDir
        : (typeof rawDir === 'string' ? rawDir.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      
      if (dirs.length === 0) {
        dirMap['Sin dirección'] = (dirMap['Sin dirección'] || 0) + 1
      } else {
        dirs.forEach((d: string) => {
          dirMap[d] = (dirMap[d] || 0) + 1
        })
      }
    })

    const porDireccion = Object.entries(dirMap).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
    })).sort((a, b) => b.cantidad - a.cantidad)

    // Por Categoría
    const catMap: Record<string, number> = {}
    pedidosFiltrados.forEach(r => {
      const rawCat: any = r.categoria
      const cats: string[] = Array.isArray(rawCat)
        ? rawCat
        : (typeof rawCat === 'string' ? rawCat.split(',').map((s: string) => s.trim()).filter(Boolean) : [])

      if (cats.length === 0) {
        catMap['Sin categoría'] = (catMap['Sin categoría'] || 0) + 1
      } else {
        cats.forEach((c: string) => {
          catMap[c] = (catMap[c] || 0) + 1
        })
      }
    })

    const porCategoria = Object.entries(catMap).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
    })).sort((a, b) => b.cantidad - a.cantidad)

    return {
      total,
      pendientes,
      enProceso,
      atendidos,
      vencidos,
      proximosVencer,
      porDireccion,
      porCategoria,
    }
  }, [pedidosFiltrados])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  const stats = [
    {
      label:   'Total Pedidos',
      valor:   dashboardCalculado.total,
      icon:    <Inbox className="h-5 w-5" />,
      color:   'text-blue-600',
      bg:      'bg-blue-50',
    },
    {
      label:   'Pendientes',
      valor:   dashboardCalculado.pendientes,
      icon:    <Clock className="h-5 w-5" />,
      color:   'text-amber-600',
      bg:      'bg-amber-50',
    },
    {
      label:   'En Proceso',
      valor:   dashboardCalculado.enProceso,
      icon:    <Timer className="h-5 w-5" />,
      color:   'text-purple-600',
      bg:      'bg-purple-50',
    },
    {
      label:   'Atendidos',
      valor:   dashboardCalculado.atendidos,
      icon:    <CheckCircle className="h-5 w-5" />,
      color:   'text-green-600',
      bg:      'bg-green-50',
    },
    {
      label:   'Vencidos',
      valor:   dashboardCalculado.vencidos,
      icon:    <AlertTriangle className="h-5 w-5" />,
      color:   'text-red-600',
      bg:      'bg-red-50',
    },
    {
      label:   'Próximos a vencer (≤3d)',
      valor:   dashboardCalculado.proximosVencer,
      icon:    <AlertTriangle className="h-5 w-5" />,
      color:   'text-orange-600',
      bg:      'bg-orange-50',
    },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen">

        <header className="border-b bg-card sticky top-0 z-30">
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/transparencia">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Bandeja
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Dashboard — Transparencia</h1>
                <p className="text-muted-foreground text-sm">Resumen y métricas de pedidos de información</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchRegistros} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Actualizar
              </Button>
            </div>
          </div>
        </header>

        <main className="px-6 py-6 space-y-6">

          {/* BARRA ERGONÓMICA DE FILTRO DE PERIODO */}
          <Card className="border-muted/80 shadow-sm bg-card/60 backdrop-blur">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Botonera de 1-clic con iconos */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Periodo:
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoPeriodo === 'ano' ? 'default' : 'outline'}
                    onClick={() => { setTipoPeriodo('ano'); setSelectedMes('todos') }}
                    className="h-8 text-xs font-medium"
                  >
                    Por Año / Mes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoPeriodo === 'mes' ? 'default' : 'outline'}
                    onClick={() => setTipoPeriodo('mes')}
                    className="h-8 text-xs font-medium"
                  >
                    Este Mes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoPeriodo === 'rango' ? 'default' : 'outline'}
                    onClick={() => setTipoPeriodo('rango')}
                    className="h-8 text-xs font-medium"
                  >
                    Rango Fechas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoPeriodo === 'todos' ? 'default' : 'outline'}
                    onClick={() => setTipoPeriodo('todos')}
                    className="h-8 text-xs font-medium"
                  >
                    Histórico Completo
                  </Button>
                </div>

                {/* Selectores específicos según modo */}
                <div className="flex flex-wrap items-center gap-3">
                  {tipoPeriodo === 'ano' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Año:</span>
                        <Select value={selectedAnio} onValueChange={setSelectedAnio}>
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue placeholder="Año" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            {aniosDisponibles.map(y => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Mes:</span>
                        <Select value={selectedMes} onValueChange={setSelectedMes}>
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue placeholder="Mes" />
                          </SelectTrigger>
                          <SelectContent>
                            {MESES.map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {tipoPeriodo === 'rango' && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Desde:</span>
                        <Input
                          type="date"
                          value={fechaDesde}
                          onChange={(e) => setFechaDesde(e.target.value)}
                          className="h-8 text-xs w-36"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Hasta:</span>
                        <Input
                          type="date"
                          value={fechaHasta}
                          onChange={(e) => setFechaHasta(e.target.value)}
                          className="h-8 text-xs w-36"
                        />
                      </div>
                    </div>
                  )}

                  {/* Resumen del filtro activo */}
                  <div className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md flex items-center gap-1">
                    <span>Filtrando:</span>
                    <strong className="text-foreground">
                      {dashboardCalculado.total} de {registros.length} pedidos
                    </strong>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Cards de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map(s => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-4">
                  <div className={`inline-flex p-2 rounded-lg ${s.bg} ${s.color} mb-3`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold">{s.valor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Por Dirección */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por Dirección</CardTitle>
                <CardDescription>Distribución en el periodo seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardCalculado.porDireccion && dashboardCalculado.porDireccion.length > 0
                  ? dashboardCalculado.porDireccion.map((item, i) => (
                      <BarraHorizontal
                        key={item.nombre}
                        label={item.nombre}
                        valor={item.cantidad}
                        total={dashboardCalculado.total}
                        color={COLORES_DIR[i % COLORES_DIR.length]}
                      />
                    ))
                  : <p className="text-sm text-muted-foreground">Sin datos en el periodo</p>
                }
              </CardContent>
            </Card>

            {/* Por Categoría */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por Categoría</CardTitle>
                <CardDescription>Clasificación en el periodo seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardCalculado.porCategoria && dashboardCalculado.porCategoria.length > 0
                  ? dashboardCalculado.porCategoria.map((item, i) => (
                      <BarraHorizontal
                        key={item.nombre}
                        label={item.nombre}
                        valor={item.cantidad}
                        total={dashboardCalculado.total}
                        color={COLORES_CAT[i % COLORES_CAT.length]}
                      />
                    ))
                  : <p className="text-sm text-muted-foreground">Sin datos en el periodo</p>
                }
              </CardContent>
            </Card>

          </div>

          {/* Alerta resumen */}
          {dashboardCalculado.vencidos > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 pt-5">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">
                    {dashboardCalculado.vencidos} pedido(s) con plazo vencido en este periodo
                  </p>
                  <p className="text-sm text-red-700">
                    Revisar la bandeja y actualizar su estado o documento de respuesta.
                  </p>
                </div>
                <Link href="/transparencia?estado=Pendiente" className="ml-auto">
                  <Button variant="destructive" size="sm">Ver pendientes</Button>
                </Link>
              </CardContent>
            </Card>
          )}

        </main>
      </div>
    </div>
  )
}
