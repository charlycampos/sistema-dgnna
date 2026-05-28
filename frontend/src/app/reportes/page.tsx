'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts'
import {
    Download, Calendar as CalendarIcon, Filter, TrendingUp, Users,
    Scale, FileText, CheckCircle2, Clock, AlertCircle, Activity
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import { DatosReporte } from '@/types'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// ─────────────────────────────────────────────
// Colores corporativos
// ─────────────────────────────────────────────
const PALETTE = {
    blue:   '#2563eb',
    green:  '#16a34a',
    orange: '#ea580c',
    purple: '#7c3aed',
    sky:    '#0ea5e9',
    teal:   '#0d9488',
    rose:   '#e11d48',
    amber:  '#d97706',
}
const COMPLEJIDAD_COLORS = [PALETTE.blue, PALETTE.green, PALETTE.orange, PALETTE.purple, PALETTE.sky]

interface RechartsTooltipProps {
    active?: boolean
    payload?: Array<{ dataKey: string; value: number; payload?: any }>
    label?: string
}

// ─────────────────────────────────────────────
// Tooltip personalizado para productividad
// ─────────────────────────────────────────────
const TooltipProductividad = ({ active, payload, label }: RechartsTooltipProps) => {
    if (active && payload && payload.length) {
        const asignados = payload.find((p) => p.dataKey === 'asignados')?.value ?? 0
        const atendidos = payload.find((p) => p.dataKey === 'atendidos')?.value ?? 0
        const puntos    = (payload[0]?.payload as any)?.puntos ?? 0
        const eficiencia = asignados > 0 ? Math.round((atendidos / asignados) * 100) : 0
        return (
            <div className="rounded-lg border bg-white shadow-lg p-3 text-sm">
                <p className="font-semibold text-gray-800 mb-2">{label}</p>
                <p className="text-gray-500">Asignados: <span className="font-bold text-gray-700">{asignados}</span></p>
                <p className="text-green-600">Atendidos: <span className="font-bold">{atendidos}</span></p>
                <p className="text-blue-600">Puntos Totales: <span className="font-bold">{puntos}</span></p>
                <p className="text-blue-600 mt-1 border-t pt-1">Eficiencia: <span className="font-bold">{eficiencia}%</span></p>
            </div>
        )
    }
    return null
}

// ─────────────────────────────────────────────
// Tooltip para tendencia
// ─────────────────────────────────────────────
const TooltipTendencia = ({ active, payload, label }: RechartsTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-white shadow-lg p-3 text-sm">
                <p className="font-semibold text-gray-700 mb-1">📅 {label}</p>
                <p className="text-blue-600">Ingresos: <span className="font-bold">{payload[0]?.value}</span></p>
            </div>
        )
    }
    return null
}

export default function ReportesPage() {
    const [periodo, setPeriodo] = useState<string>('mes')
    const [fechaInicio, setFechaInicio] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [fechaFin, setFechaFin] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [data, setData] = useState<DatosReporte | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const hoy = new Date()
        let inicio = new Date()
        let fin = new Date()

        switch (periodo) {
            case 'hoy':
                inicio = hoy; fin = hoy; break
            case 'semana':
                inicio = subDays(hoy, 7); fin = hoy; break
            case 'mes':
                inicio = startOfMonth(hoy); fin = hoy; break
            case 'mes_anterior':
                const mesAnterior = subDays(startOfMonth(hoy), 1)
                inicio = startOfMonth(mesAnterior); fin = endOfMonth(mesAnterior); break
            case 'anio':
                inicio = startOfYear(hoy); fin = hoy; break
            case 'personalizado':
                return
        }

        if (periodo !== 'personalizado') {
            setFechaInicio(format(inicio, 'yyyy-MM-dd'))
            setFechaFin(format(fin, 'yyyy-MM-dd'))
        }
    }, [periodo])

    useEffect(() => {
        if (fechaInicio && fechaFin) fetchReporte()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechaInicio, fechaFin])

    const fetchReporte = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin })
            const res = await fetch(`/api/reportes?${params}`)
            if (!res.ok) throw new Error('Error al cargar reporte')
            setData(await res.json())
        } catch (error) {
            console.error(error)
            toast.error('Error al cargar los datos del reporte')
        } finally {
            setLoading(false)
        }
    }

    const exportarReporteExcel = () => {
        if (!data) return
        const wb = XLSX.utils.book_new()
        const resumenData = [
            { Métricas: 'Total Casos',              Valor: data.resumen.total },
            { Métricas: 'Atendidos',                Valor: data.resumen.atendidos },
            { Métricas: 'Pendientes',               Valor: data.resumen.pendientes },
            { Métricas: 'Tiempo Promedio (Días)',    Valor: data.resumen.promedioAtencionXDias },
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData),             'Resumen')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.productividadAbogados), 'Productividad')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.topProcedencias),       'Procedencias')
        XLSX.writeFile(wb, `Reporte_Gestion_${fechaInicio}_al_${fechaFin}.xlsx`)
        toast.success('Reporte exportado correctamente')
    }

    if (!data || loading) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Activity className="h-10 w-10 text-blue-600 mx-auto animate-pulse" />
                    <p className="text-gray-600 font-medium">Cargando reporte...</p>
                </div>
            </div>
        )
    }

    const tasaAtencion = data.resumen.total > 0
        ? Math.round((data.resumen.atendidos / data.resumen.total) * 100)
        : 0

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* ─── Header ─── */}
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Link href="/">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="h-6 w-6 text-blue-600" />
                                    Reportes y Estadísticas
                                </h1>
                                <p className="text-sm text-gray-500">Análisis de productividad y carga procesal</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-gray-50 p-2 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <Select value={periodo} onValueChange={setPeriodo}>
                                    <SelectTrigger className="w-[140px] h-9 bg-white">
                                        <SelectValue placeholder="Periodo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hoy">Hoy</SelectItem>
                                        <SelectItem value="semana">Últimos 7 días</SelectItem>
                                        <SelectItem value="mes">Este Mes</SelectItem>
                                        <SelectItem value="mes_anterior">Mes Anterior</SelectItem>
                                        <SelectItem value="anio">Este Año</SelectItem>
                                        <SelectItem value="personalizado">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => { setFechaInicio(e.target.value); setPeriodo('personalizado') }}
                                    className="w-auto h-9 bg-white"
                                />
                                <span className="text-gray-400">-</span>
                                <Input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => { setFechaFin(e.target.value); setPeriodo('personalizado') }}
                                    className="w-auto h-9 bg-white"
                                />
                            </div>

                            <Button onClick={exportarReporteExcel} variant="outline" size="sm" className="h-9 gap-2 ml-auto md:ml-0">
                                <Download className="h-4 w-4" />
                                Exportar
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">

                {/* ─── KPI Cards ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total */}
                    <Card className="bg-white border border-blue-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Ingresos</p>
                                    <h3 className="text-4xl font-bold text-gray-900 mt-1">{data.resumen.total}</h3>
                                    <p className="text-xs text-gray-400 mt-1">En el período</p>
                                </div>
                                <div className="p-2.5 bg-blue-50 rounded-xl">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Atendidos */}
                    <Card className="bg-white border border-green-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Atendidos</p>
                                    <h3 className="text-4xl font-bold text-green-700 mt-1">{data.resumen.atendidos}</h3>
                                    <p className="text-xs text-green-500 mt-1 font-medium">{tasaAtencion}% del total</p>
                                </div>
                                <div className="p-2.5 bg-green-50 rounded-xl">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pendientes */}
                    <Card className="bg-white border border-orange-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendientes</p>
                                    <h3 className="text-4xl font-bold text-orange-600 mt-1">{data.resumen.pendientes}</h3>
                                    <p className="text-xs text-orange-400 mt-1">
                                        {data.resumen.total > 0 ? Math.round((data.resumen.pendientes / data.resumen.total) * 100) : 0}% del total
                                    </p>
                                </div>
                                <div className="p-2.5 bg-orange-50 rounded-xl">
                                    <AlertCircle className="h-6 w-6 text-orange-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Promedio */}
                    <Card className="bg-white border border-purple-100 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prom. Atención</p>
                                    <h3 className="text-4xl font-bold text-purple-700 mt-1">
                                        {data.resumen.promedioAtencionXDias}
                                    </h3>
                                    <p className="text-xs text-purple-400 mt-1">días por caso</p>
                                </div>
                                <div className="p-2.5 bg-purple-50 rounded-xl">
                                    <Clock className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Fila 2: Productividad + Tendencia ─── */}
                <div className="grid lg:grid-cols-5 gap-6">

                    {/* Productividad por Abogado – ocupa 3 cols */}
                    <Card className="lg:col-span-3 bg-white shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-5 w-5 text-blue-600" />
                                Productividad por Abogado
                            </CardTitle>
                            <CardDescription>
                                Casos asignados vs. atendidos · La barra verde indica resolución
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.productividadAbogados.length === 0 ? (
                                <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                                    No hay datos en este período
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart
                                        data={data.productividadAbogados}
                                        layout="vertical"
                                        margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                                        barGap={4}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            allowDecimals={false}
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            dataKey="nombre"
                                            type="category"
                                            width={110}
                                            tick={{ fontSize: 12 }}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<TooltipProductividad />} />
                                        <Legend
                                            formatter={(value) => value === 'asignados' ? 'Asignados' : 'Atendidos'}
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                        <Bar dataKey="asignados" name="asignados" fill="#dbeafe" radius={[0, 4, 4, 0]} barSize={14} />
                                        <Bar dataKey="atendidos" name="atendidos" fill={PALETTE.green} radius={[0, 4, 4, 0]} barSize={14} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tasa de Resolución – ocupa 2 cols */}
                    <Card className="lg:col-span-2 bg-white shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="h-5 w-5 text-green-600" />
                                Tasa de Resolución
                            </CardTitle>
                            <CardDescription>
                                % de casos atendidos sobre el total del período
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center h-[280px] gap-4">
                                {/* Radial circular */}
                                <div className="relative">
                                    <ResponsiveContainer width={200} height={200}>
                                        <RadialBarChart
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="65%"
                                            outerRadius="90%"
                                            data={[{ value: tasaAtencion, fill: PALETTE.green }]}
                                            startAngle={90}
                                            endAngle={90 - 360 * (tasaAtencion / 100)}
                                        >
                                            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-bold text-gray-900">{tasaAtencion}%</span>
                                        <span className="text-xs text-gray-500">Resueltos</span>
                                    </div>
                                </div>

                                {/* Leyenda simple */}
                                <div className="flex gap-6 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 rounded-full bg-green-600"></span>
                                        <span className="text-gray-600">Atendidos <strong>{data.resumen.atendidos}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 rounded-full bg-orange-400"></span>
                                        <span className="text-gray-600">Pendientes <strong>{data.resumen.pendientes}</strong></span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Fila 3: Tendencia + Complejidad + Procedencias ─── */}
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Tendencia de Ingresos – ocupa 2 cols */}
                    <Card className="lg:col-span-2 bg-white shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                Tendencia de Ingresos
                            </CardTitle>
                            <CardDescription>
                                Número de casos registrados por día en el período
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.evolucionSemanal.length === 0 ? (
                                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                                    No hay datos en este período
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart
                                        data={data.evolucionSemanal}
                                        margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={PALETTE.blue} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="fecha"
                                            tick={{ fontSize: 11 }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11 }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={24}
                                        />
                                        <Tooltip content={<TooltipTendencia />} />
                                        <Area
                                            type="monotone"
                                            dataKey="cantidad"
                                            stroke={PALETTE.blue}
                                            strokeWidth={2.5}
                                            fill="url(#gradBlue)"
                                            dot={{ r: 4, fill: PALETTE.blue, strokeWidth: 0 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Complejidad de Casos – ocupa 1 col */}
                    <Card className="lg:col-span-1 bg-white shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Scale className="h-5 w-5 text-purple-600" />
                                Complejidad de Casos
                            </CardTitle>
                            <CardDescription>
                                Distribución por nivel jurídico
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.distribucionComplejidad.length === 0 ? (
                                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                                    Sin datos
                                </div>
                            ) : (
                                <div className="h-[250px] flex flex-col justify-center gap-3">
                                    {data.distribucionComplejidad.map((item, i) => {
                                        const total = data.distribucionComplejidad.reduce((s, x) => s + x.cantidad, 0)
                                        const pct = total > 0 ? Math.round((item.cantidad / total) * 100) : 0
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: COMPLEJIDAD_COLORS[i % COMPLEJIDAD_COLORS.length] }}
                                                        />
                                                        <span className="text-gray-700 font-medium">{item.nombre}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-900">
                                                        {item.cantidad} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: COMPLEJIDAD_COLORS[i % COMPLEJIDAD_COLORS.length]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Fila 4: Top Procedencias ─── */}
                <Card className="bg-white shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarIcon className="h-5 w-5 text-teal-600" />
                            Top Procedencias
                        </CardTitle>
                        <CardDescription>
                            Dependencias (UPE / Unidades) con mayor volumen de apelaciones en el período
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.topProcedencias.length === 0 ? (
                            <p className="text-center text-gray-400 py-10 text-sm">No hay datos registrados en este período</p>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                                {data.topProcedencias.map((item, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 w-5 text-right">#{i + 1}</span>
                                                <span className="font-medium text-gray-800 truncate max-w-[200px]">{item.nombre}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="font-bold text-gray-900">{item.cantidad}</span>
                                                <span className="text-xs text-gray-400 w-10 text-right">{item.porcentaje}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                                            <div
                                                className="h-2.5 rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${item.porcentaje}%`,
                                                    backgroundColor: COMPLEJIDAD_COLORS[i % COMPLEJIDAD_COLORS.length]
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </main>
        </div>
    )
}
