'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ApelacionConRelaciones, Abogado } from '@/types'
import { Search, Filter, Eye, Pencil, Download, X, Menu, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { descargarExcelApelaciones } from '@/lib/export-excel'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'

export default function ApelacionesPage() {
    const router = useRouter()
    const [apelaciones, setApelaciones] = useState<ApelacionConRelaciones[]>([])
    const [filteredApelaciones, setFilteredApelaciones] = useState<ApelacionConRelaciones[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [estadoFilter, setEstadoFilter] = useState<string>('todos')
    const [abogadoFilter, setAbogadoFilter] = useState<string>('todos')
    const [fechaDesde, setFechaDesde] = useState<string>('')
    const [fechaHasta, setFechaHasta] = useState<string>('')
    const [abogados, setAbogados] = useState<Abogado[]>([])
    const { canWrite, loading: meLoading, me, hasAccess } = useMe()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

    const toggleRow = (id: string) => {
        setExpandedRowId(prev => prev === id ? null : id)
    }

    useEffect(() => {
        const handleCollapseChange = (e: Event) => {
            const customEvent = e as CustomEvent
            setSidebarCollapsed(customEvent.detail)
        }
        window.addEventListener('sidebar-collapse-changed', handleCollapseChange)
        return () => window.removeEventListener('sidebar-collapse-changed', handleCollapseChange)
    }, [])

    // Guard de acceso: solo admins y usuarios con módulo 'apelaciones'
    useEffect(() => {
        if (!meLoading && me && !hasAccess('apelaciones')) {
            router.replace('/menu')
        }
    }, [me, meLoading, hasAccess, router])

    useEffect(() => { fetchData() }, [])

    useEffect(() => {
        filterApelaciones()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, estadoFilter, abogadoFilter, fechaDesde, fechaHasta, apelaciones])

    const fetchData = async () => {
        try {
            const [apelacionesRes, abogadosRes] = await Promise.all([
                fetch('/api/apelaciones'),
                fetch('/api/abogados'),
            ])
            const apelacionesData = await apelacionesRes.json()
            const abogadosData = await abogadosRes.json()

            if (!apelacionesRes.ok) {
                console.error('Error del backend:', apelacionesData)
                toast.error(apelacionesData?.detail ?? apelacionesData?.error ?? 'Error al cargar apelaciones')
                setApelaciones([])
                setFilteredApelaciones([])
            } else {
                const lista = Array.isArray(apelacionesData) ? apelacionesData : []
                const listaOrdenada = [...lista].sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    if (dateB !== dateA) {
                        return dateB - dateA
                    }
                    return (b.id || '').localeCompare(a.id || '')
                })
                setApelaciones(listaOrdenada)
                setFilteredApelaciones(listaOrdenada)
            }
            setAbogados(Array.isArray(abogadosData) ? abogadosData : [])
        } catch (error) {
            console.error('Error al cargar datos:', error)
            toast.error('No se pudo conectar con el servidor. ¿Está corriendo el backend?')
            setApelaciones([])
            setFilteredApelaciones([])
        } finally {
            setLoading(false)
        }
    }

    const filterApelaciones = () => {
        let filtered = [...apelaciones]

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase()
            filtered = filtered.filter(
                (a) =>
                    (a.numeroExpediente && a.numeroExpediente.toLowerCase().includes(lowerTerm)) ||
                    (a.apelante && a.apelante.toLowerCase().includes(lowerTerm)) ||
                    (a.nnaCar && a.nnaCar.toLowerCase().includes(lowerTerm)) ||
                    (a.procedencia && a.procedencia.toLowerCase().includes(lowerTerm)) ||
                    (a.abogado?.nombre && a.abogado.nombre.toLowerCase().includes(lowerTerm)) ||
                    (a.estado && a.estado.toLowerCase().includes(lowerTerm)) ||
                    (a.complejidad?.nombre && a.complejidad.nombre.toLowerCase().includes(lowerTerm)) ||
                    (a.documento && a.documento.toLowerCase().includes(lowerTerm)) ||
                    (a.asunto && a.asunto.toLowerCase().includes(lowerTerm))
            )
        }

        if (estadoFilter !== 'todos') {
            filtered = filtered.filter((a) => a.estado === estadoFilter)
        }

        if (abogadoFilter !== 'todos') {
            filtered = filtered.filter((a) => a.abogadoId === abogadoFilter)
        }

        if (fechaDesde) {
            const desde = new Date(fechaDesde)
            desde.setHours(0, 0, 0, 0)
            filtered = filtered.filter((a) => {
                const fi = new Date(a.fechaIngreso)
                return fi >= desde
            })
        }

        if (fechaHasta) {
            const hasta = new Date(fechaHasta)
            hasta.setHours(23, 59, 59, 999)
            filtered = filtered.filter((a) => {
                const fi = new Date(a.fechaIngreso)
                return fi <= hasta
            })
        }

        setFilteredApelaciones(filtered)
    }

    const limpiarFiltros = () => {
        setSearchTerm('')
        setEstadoFilter('todos')
        setAbogadoFilter('todos')
        setFechaDesde('')
        setFechaHasta('')
    }

    const hayFiltrosActivos = searchTerm || estadoFilter !== 'todos' || abogadoFilter !== 'todos' || fechaDesde || fechaHasta

    const getEstadoBadgeVariant = (estado: string): 'secondary' | 'default' | 'outline' => {
        switch (estado) {
            case 'Pendiente': return 'secondary'
            case 'Resuelto': return 'default'
            case 'Atendido': return 'outline'
            default: return 'default'
        }
    }

    const formatFecha = (fecha: string | Date | null | undefined) => {
        if (!fecha) return '-'
        try {
            const d = fecha instanceof Date ? fecha : new Date(fecha)
            return format(d, 'dd/MM/yyyy', { locale: es })
        } catch { return '-' }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando apelaciones...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-background overflow-hidden w-full">
            <AppSidebar />
            <div className={`flex-1 ml-0 flex flex-col min-h-screen max-w-full overflow-hidden transition-all duration-300 ease-in-out ${
                sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-64'
            }`}>
                {/* Header */}
                <header className="border-b bg-card sticky top-0 z-30">
                    <div className="px-4 py-4 md:px-6">
                        <div className="flex items-center gap-3 md:gap-4">
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
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl md:text-2xl font-bold truncate">Apelaciones</h1>
                                <p className="text-muted-foreground text-sm">Gestión de todos los expedientes</p>
                            </div>
                            <div className="flex gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="gap-2">
                                            <Download className="h-4 w-4" />
                                            <span className="hidden md:inline">Descargar Excel</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                if (filteredApelaciones.length === 0) { toast.error('No hay datos para exportar'); return }
                                                try { descargarExcelApelaciones(filteredApelaciones); toast.success('Excel (filtrados) descargado correctamente') }
                                                catch (error) { console.error('Error al exportar:', error); toast.error('Error al generar el archivo Excel') }
                                            }}
                                        >
                                            Exportar filtrados ({filteredApelaciones.length})
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                if (apelaciones.length === 0) { toast.error('No hay datos para exportar'); return }
                                                try { descargarExcelApelaciones(apelaciones); toast.success('Excel (todos) descargado correctamente') }
                                                catch (error) { console.error('Error al exportar:', error); toast.error('Error al generar el archivo Excel') }
                                            }}
                                        >
                                            Exportar todos ({apelaciones.length})
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {canWrite('apelaciones') && (
                                    <Link href="/apelaciones/nueva">
                                        <Button>Registrar Nueva Apelación</Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="px-2 sm:px-4 md:px-6 py-6 overflow-hidden">
                    {/* Filtros */}
                    <Card className="mb-6">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Filtros</CardTitle>
                                    <CardDescription>Buscar y filtrar apelaciones</CardDescription>
                                </div>
                                {hayFiltrosActivos && (
                                    <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground hover:text-foreground gap-1">
                                        <X className="h-3.5 w-3.5" />
                                        Limpiar filtros
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Fila 1: búsqueda + estado + abogado */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="relative md:col-span-2">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por expediente, apelante, abogado, procedencia..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los estados</SelectItem>
                                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                                        <SelectItem value="Resuelto">Resuelto</SelectItem>
                                        <SelectItem value="Atendido">Atendido</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={abogadoFilter} onValueChange={setAbogadoFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por abogado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos los abogados</SelectItem>
                                        {abogados.filter(a => a.activo).map((abogado) => (
                                            <SelectItem key={abogado.id} value={abogado.id}>
                                                {abogado.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fila 2: rango de fechas */}
                            <div className="grid gap-4 md:grid-cols-4 items-end">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Fecha de Ingreso — Desde</Label>
                                    <Input
                                        type="date"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                        max={fechaHasta || undefined}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Fecha de Ingreso — Hasta</Label>
                                    <Input
                                        type="date"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                        min={fechaDesde || undefined}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground pt-5">
                                    <Filter className="h-4 w-4 flex-shrink-0" />
                                    <span>Mostrando <strong>{filteredApelaciones.length}</strong> de {apelaciones.length} apelaciones</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabla */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lista de Apelaciones</CardTitle>
                            <CardDescription>
                                {filteredApelaciones.length === 0 ? 'No hay apelaciones que coincidan con los filtros' : `${filteredApelaciones.length} apelaciones encontradas`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 md:px-6">
                            {filteredApelaciones.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-muted-foreground mb-4">No se encontraron apelaciones</p>
                                    {canWrite('apelaciones') && (
                                        <Link href="/apelaciones/nueva">
                                            <Button>Registrar Primera Apelación</Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-auto max-h-[600px] relative border rounded-md w-full">
                                    <table className="w-full border-collapse table-fixed md:table-auto">
                                        <thead className="sticky top-0 bg-background z-10 shadow-[0_1.5px_0_0_rgba(0,0,0,0.1)]">
                                            <tr className="border-b">
                                                <th className="px-2 py-3 text-center md:hidden w-[40px] shrink-0"></th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold w-[45%] md:w-auto">Expediente</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">F. Asignación</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">F. Ingreso</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden lg:table-cell">F. Ingreso MIMP</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">Apelante / NNA o CAR</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden lg:table-cell">Procedencia</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden lg:table-cell">Complejidad</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">Abogado</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold w-[90px] md:w-auto">Estado</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold w-[80px] md:w-auto">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredApelaciones.map((apelacion) => {
                                                const isExpanded = expandedRowId === apelacion.id
                                                return (
                                                    <Fragment key={apelacion.id}>
                                                        <tr className="border-b hover:bg-muted/50 transition-colors">
                                                            <td className="px-2 py-3 text-center md:hidden w-[40px]">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-muted rounded-full"
                                                                    onClick={() => toggleRow(apelacion.id || '')}
                                                                >
                                                                    {isExpanded ? (
                                                                        <Minus className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                                                                    ) : (
                                                                        <Plus className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                                                                    )}
                                                                </Button>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-medium break-all max-w-[130px] md:max-w-none">{apelacion.numeroExpediente}</td>
                                                            <td className="px-4 py-3 text-sm hidden md:table-cell">{formatFecha(apelacion.fechaAsignacion)}</td>
                                                            <td className="px-4 py-3 text-sm hidden md:table-cell">{formatFecha(apelacion.fechaIngreso)}</td>
                                                            <td className="px-4 py-3 text-sm hidden lg:table-cell">{formatFecha(apelacion.fechaIngresoMIMP)}</td>
                                                            <td className="px-4 py-3 text-sm hidden md:table-cell">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-xs md:text-sm">
                                                                        {apelacion.apelantes && apelacion.apelantes.length > 0
                                                                            ? apelacion.apelantes.map((ap: any) => 
                                                                                ap.tipo === "institucion" 
                                                                                    ? ap.institucion 
                                                                                    : [ap.nombres, ap.apellidoPaterno, ap.apellidoMaterno].filter(Boolean).join(" ")
                                                                              ).filter(Boolean).join(", ")
                                                                            : apelacion.apelante
                                                                        }
                                                                    </span>
                                                                    {apelacion.nnas && apelacion.nnas.length > 0 ? (
                                                                        <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                                                                            {apelacion.nnas.map((nna: any) => {
                                                                                if (nna.tipo === "institucion") return nna.institucion;
                                                                                const name = [nna.nombres, nna.primerApellido, nna.segundoApellido].filter(Boolean).join(" ");
                                                                                const edadStr = nna.edad ? ` (${nna.edad} años)` : "";
                                                                                return name + edadStr;
                                                                            }).filter(Boolean).join(", ")}
                                                                        </span>
                                                                    ) : apelacion.nnaCar ? (
                                                                        <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{apelacion.nnaCar}</span>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm hidden lg:table-cell">{apelacion.procedencia}</td>
                                                            <td className="px-4 py-3 text-sm hidden lg:table-cell">{apelacion.complejidad?.nombre}</td>
                                                            <td className="px-4 py-3 text-sm hidden md:table-cell">{apelacion.abogado?.nombre}</td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <Badge variant={getEstadoBadgeVariant(apelacion.estado)}>
                                                                    {apelacion.estado}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <div className="flex gap-1">
                                                                    <Link href={`/apelaciones/${apelacion.id}`}>
                                                                        <Button variant="ghost" size="sm" title="Ver detalle">
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                    {canWrite('apelaciones') && (
                                                                        <Link href={`/apelaciones/${apelacion.id}?edit=true`}>
                                                                            <Button variant="ghost" size="sm" title="Editar">
                                                                                <Pencil className="h-4 w-4" />
                                                                            </Button>
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="md:hidden bg-muted/20 border-b animate-in slide-in-from-top-2 duration-200">
                                                                <td colSpan={4} className="px-4 py-3 text-sm">
                                                                    <div className="flex flex-col gap-3 p-4 bg-muted/40 rounded-lg border">
                                                                        <div>
                                                                            <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Fecha de Ingreso / Asignación:</span>
                                                                            <span className="text-xs">
                                                                                Ingreso: {formatFecha(apelacion.fechaIngreso)} | Asignación: {formatFecha(apelacion.fechaAsignacion)}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Apelante:</span>
                                                                            <span className="text-xs">
                                                                                {apelacion.apelantes && apelacion.apelantes.length > 0
                                                                                    ? apelacion.apelantes.map((ap: any) => 
                                                                                        ap.tipo === "institucion" 
                                                                                            ? ap.institucion 
                                                                                            : [ap.nombres, ap.apellidoPaterno, ap.apellidoMaterno].filter(Boolean).join(" ")
                                                                                      ).filter(Boolean).join(", ")
                                                                                    : apelacion.apelante || '-'
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        {(apelacion.nnas && apelacion.nnas.length > 0) || apelacion.nnaCar ? (
                                                                            <div>
                                                                                <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">NNA o CAR:</span>
                                                                                <span className="text-xs">
                                                                                    {apelacion.nnas && apelacion.nnas.length > 0 ? (
                                                                                        apelacion.nnas.map((nna: any) => {
                                                                                            if (nna.tipo === "institucion") return nna.institucion;
                                                                                            const name = [nna.nombres, nna.primerApellido, nna.segundoApellido].filter(Boolean).join(" ");
                                                                                            const edadStr = nna.edad ? ` (${nna.edad} años)` : "";
                                                                                            return name + edadStr;
                                                                                        }).filter(Boolean).join(", ")
                                                                                    ) : apelacion.nnaCar || '-'}
                                                                                </span>
                                                                            </div>
                                                                        ) : null}
                                                                        <div>
                                                                            <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Abogado Asignado:</span>
                                                                            <span className="text-xs">{apelacion.abogado?.nombre || 'No asignado'}</span>
                                                                        </div>
                                                                        {apelacion.procedencia && (
                                                                            <div>
                                                                                <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Procedencia:</span>
                                                                                <span className="text-xs">{apelacion.procedencia}</span>
                                                                            </div>
                                                                        )}
                                                                        {apelacion.complejidad?.nombre && (
                                                                            <div>
                                                                                <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Complejidad Jurídica:</span>
                                                                                <span className="text-xs">{apelacion.complejidad.nombre}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                )
                                            })}
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
