'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Filter, Eye, Pencil, Download, X, AlertTriangle, Clock, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'
import { clasificarAlerta, diasHabilesRestantes } from '@/lib/calcular-plazo'
import { descargarExcelTransparencia } from '@/lib/export-excel'
import type { TransparenciaRegistro } from '@/types'

const DIRECCIONES = ['DPNNA', 'DSLD', 'DA', 'DPE', 'DGNNA'] as const
const CATEGORIAS  = ['Estadística', 'Expediente', 'Informe', 'Resolución', 'Otro']

export default function TransparenciaPage() {
  const router = useRouter()
  const [registros, setRegistros] = useState<TransparenciaRegistro[]>([])
  const [filtered, setFiltered] = useState<TransparenciaRegistro[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm,    setSearchTerm]    = useState('')
  const [estadoFilter,  setEstadoFilter]  = useState('todos')
  const [dirFilter,     setDirFilter]     = useState('todos')
  const [fechaDesde,    setFechaDesde]    = useState('')
  const [fechaHasta,    setFechaHasta]    = useState('')

  const { canWrite, loading: meLoading, me, hasAccess } = useMe()

  useEffect(() => {
    if (!meLoading && me && !hasAccess('transparencia')) router.replace('/menu')
  }, [me, meLoading, hasAccess, router])

  useEffect(() => { fetchData() }, [])
  useEffect(() => { applyFilters() }, [searchTerm, estadoFilter, dirFilter, fechaDesde, fechaHasta, registros])

  const fetchData = async () => {
    try {
      const res  = await fetch('/api/transparencia')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.detail ?? 'Error al cargar registros')
        setRegistros([])
      } else {
        const lista = Array.isArray(data) ? data : []
        setRegistros(lista.sort((a: TransparenciaRegistro, b: TransparenciaRegistro) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
      }
    } catch {
      toast.error('No se pudo conectar con el servidor')
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...registros]
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      result = result.filter(r =>
        r.numeroExpediente?.toLowerCase().includes(t) ||
        r.asunto?.toLowerCase().includes(t) ||
        r.documentoIngreso?.toLowerCase().includes(t) ||
        r.categoria?.toLowerCase().includes(t)
      )
    }
    if (estadoFilter !== 'todos') result = result.filter(r => r.estado === estadoFilter)
    if (dirFilter    !== 'todos') result = result.filter(r => r.direccion === dirFilter)
    if (fechaDesde) {
      const desde = new Date(fechaDesde); desde.setHours(0,0,0,0)
      result = result.filter(r => new Date(r.fechaIngreso) >= desde)
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta); hasta.setHours(23,59,59,999)
      result = result.filter(r => new Date(r.fechaIngreso) <= hasta)
    }
    setFiltered(result)
  }

  const limpiarFiltros = () => {
    setSearchTerm(''); setEstadoFilter('todos'); setDirFilter('todos')
    setFechaDesde(''); setFechaHasta('')
  }

  const hayFiltros = searchTerm || estadoFilter !== 'todos' || dirFilter !== 'todos' || fechaDesde || fechaHasta

  const formatFecha = (f: string | Date | null | undefined) => {
    if (!f) return '—'
    try { return format(new Date(f), 'dd/MM/yyyy', { locale: es }) } catch { return '—' }
  }

  const getBadgeEstado = (estado: string): 'secondary' | 'default' | 'outline' => {
    if (estado === 'Pendiente')  return 'secondary'
    if (estado === 'En Proceso') return 'default'
    return 'outline'
  }

  // Renderiza el indicador de alerta de plazo
  const AlertaPlazoCell = ({ registro }: { registro: TransparenciaRegistro }) => {
    const alerta = clasificarAlerta(registro.plazoVencimiento, registro.estado)
    if (!alerta || alerta === 'normal') {
      if (!registro.plazoVencimiento) return <span className="text-muted-foreground">—</span>
      const dias = diasHabilesRestantes(new Date(registro.plazoVencimiento))
      return (
        <span className="text-sm text-green-600">
          {formatFecha(registro.plazoVencimiento)}
          <span className="block text-xs text-muted-foreground">{dias}d háb.</span>
        </span>
      )
    }
    if (alerta === 'vencido') return (
      <span className="flex items-center gap-1 text-red-600 font-semibold text-xs">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        Vencido
        <span className="block">{formatFecha(registro.plazoVencimiento)}</span>
      </span>
    )
    if (alerta === 'urgente') return (
      <span className="flex items-center gap-1 text-red-500 font-semibold text-xs">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        ¡Hoy vence!
      </span>
    )
    // proximo
    const dias = diasHabilesRestantes(new Date(registro.plazoVencimiento!))
    return (
      <span className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
        {dias}d háb.
        <span className="block font-normal">{formatFecha(registro.plazoVencimiento)}</span>
      </span>
    )
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando registros...</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">

        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Ley de Transparencia</h1>
                <p className="text-muted-foreground text-sm">Pedidos de información — plazo: 10 días hábiles</p>
              </div>
              <div className="flex gap-2">
                <Link href="/transparencia/dashboard">
                  <Button variant="outline" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden md:inline">Dashboard</span>
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      <span className="hidden md:inline">Descargar Excel</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      if (!filtered.length) { toast.error('No hay datos para exportar'); return }
                      try { descargarExcelTransparencia(filtered); toast.success(`Excel (${filtered.length} registros) descargado`) }
                      catch { toast.error('Error al generar Excel') }
                    }}>
                      Exportar filtrados ({filtered.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (!registros.length) { toast.error('No hay datos para exportar'); return }
                      try { descargarExcelTransparencia(registros); toast.success(`Excel (${registros.length} registros) descargado`) }
                      catch { toast.error('Error al generar Excel') }
                    }}>
                      Exportar todos ({registros.length})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {canWrite('transparencia') && (
                  <Link href="/transparencia/nueva">
                    <Button>Registrar Pedido</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-6 py-6">

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filtros</CardTitle>
                  <CardDescription>Buscar y filtrar pedidos de información</CardDescription>
                </div>
                {hayFiltros && (
                  <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="gap-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" /> Limpiar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por expediente, asunto, documento..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                    <SelectItem value="Atendido">Atendido</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dirFilter} onValueChange={setDirFilter}>
                  <SelectTrigger><SelectValue placeholder="Dirección" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las direcciones</SelectItem>
                    {DIRECCIONES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Ingreso — Desde</Label>
                  <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={fechaHasta || undefined} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha Ingreso — Hasta</Label>
                  <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde || undefined} />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground pt-5">
                  <Filter className="h-4 w-4 flex-shrink-0" />
                  Mostrando <strong>{filtered.length}</strong> de {registros.length} registros
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla */}
          <Card>
            <CardHeader>
              <CardTitle>Bandeja de Pedidos</CardTitle>
              <CardDescription>
                {filtered.length === 0
                  ? 'No hay registros que coincidan con los filtros'
                  : `${filtered.length} registro(s) encontrado(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No se encontraron pedidos</p>
                  {canWrite('transparencia') && (
                    <Link href="/transparencia/nueva"><Button>Registrar Primer Pedido</Button></Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold">N° Expediente</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">F. Ingreso</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Dirección</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Categoría</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Asunto</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Plazo / Alerta</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => (
                        <tr
                          key={r.id}
                          className={`border-b transition-colors hover:bg-muted/50 ${
                            clasificarAlerta(r.plazoVencimiento, r.estado) === 'vencido'  ? 'bg-red-50/40' :
                            clasificarAlerta(r.plazoVencimiento, r.estado) === 'urgente'  ? 'bg-red-50/30' :
                            clasificarAlerta(r.plazoVencimiento, r.estado) === 'proximo'  ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium">{r.numeroExpediente}</td>
                          <td className="px-4 py-3 text-sm">{formatFecha(r.fechaIngreso)}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="outline">{r.direccion}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{r.categoria || '—'}</td>
                          <td className="px-4 py-3 text-sm max-w-xs">
                            <span className="line-clamp-2">{r.asunto}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={getBadgeEstado(r.estado)}>{r.estado}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <AlertaPlazoCell registro={r} />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-1">
                              <Link href={`/transparencia/${r.id}`}>
                                <Button variant="ghost" size="sm" title="Ver detalle"><Eye className="h-4 w-4" /></Button>
                              </Link>
                              {canWrite('transparencia') && (
                                <Link href={`/transparencia/${r.id}?edit=true`}>
                                  <Button variant="ghost" size="sm" title="Editar"><Pencil className="h-4 w-4" /></Button>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
