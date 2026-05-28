'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apelacionSchema } from '@/lib/validations'
import { calcularPuntosExtension } from '@/lib/calcular-puntos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, User, Building } from 'lucide-react'
import Link from 'next/link'
import type { ComplejidadJuridica, CargaAbogado, Procedencia } from '@/types'
import type { z } from 'zod'
import { PanelAsignacion } from '@/components/panel-asignacion'
import { toast } from 'sonner'
import { Appellant, serializeAppellants, deserializeAppellants, NnaCarItem, serializeNnaCar, deserializeNnaCar } from '@/lib/utils'

type ApelacionFormValues = z.infer<typeof apelacionSchema>

const dateToValue = (v: unknown): string => {
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0]
    return ''
}
const valueToDate = (str: string): Date | null => {
    if (!str || str.length < 10) return null
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
}

export default function NuevaApelacionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pendingData, setPendingData] = useState<ApelacionFormValues | null>(null)
    const [complejidades, setComplejidades] = useState<ComplejidadJuridica[]>([])
    const [procedencias, setProcedencias] = useState<Procedencia[]>([])
    const [cargaAbogados, setCargaAbogados] = useState<CargaAbogado[]>([])
    const [expedienteDuplicado, setExpedienteDuplicado] = useState(false)
    const [expedientesExistentes, setExpedientesExistentes] = useState<string[]>([])

    const form = useForm<ApelacionFormValues>({
        resolver: zodResolver(apelacionSchema) as any,
        defaultValues: {
            numeroExpediente: '',
            fechaIngreso: new Date(),
            fechaIngresoMIMP: null,
            plazoVencimiento: null,
            apelante: '',
            nnaCar: '',
            procedencia: '',
            documento: '',
            asunto: '',
            folios: 1,
            complejidadId: '',
            abogadoId: '',
            fechaAsignacion: new Date(),
            estado: 'Pendiente',
            observaciones: '',
        },
    })

    const [tipoApelante, setTipoApelante] = useState<'natural' | 'institucion'>('natural')
    const [appellants, setAppellants] = useState<Appellant[]>([
        { tipo: 'natural', nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '' }
    ])

    useEffect(() => {
        form.setValue('apelante', serializeAppellants(appellants), { shouldValidate: true })
    }, [appellants, form])

    const handleTipoApelanteChange = (tipo: 'natural' | 'institucion') => {
        setTipoApelante(tipo)
        setAppellants(appellants.map(() => ({
            tipo,
            nombres: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            documento: '',
            institucion: ''
        })))
    }

    const addAppellant = () => {
        setAppellants([
            ...appellants,
            { tipo: tipoApelante, nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '', institucion: '' }
        ])
    }

    const removeAppellant = (index: number) => {
        if (appellants.length > 1) {
            const newAppellants = appellants.filter((_, i) => i !== index)
            setAppellants(newAppellants)
        }
    }

    const updateAppellant = (index: number, fields: Partial<Appellant>) => {
        const newAppellants = [...appellants]
        newAppellants[index] = { ...newAppellants[index], ...fields }
        setAppellants(newAppellants)
    }

    const [tipoNna, setTipoNna] = useState<'natural' | 'institucion'>('natural')
    const [nnaItems, setNnaItems] = useState<NnaCarItem[]>([
        { tipo: 'natural', nombres: '', primerApellido: '', segundoApellido: '', edad: '' }
    ])

    useEffect(() => {
        form.setValue('nnaCar', serializeNnaCar(nnaItems), { shouldValidate: true })
    }, [nnaItems, form])

    const handleTipoNnaChange = (tipo: 'natural' | 'institucion') => {
        setTipoNna(tipo)
        setNnaItems(nnaItems.map(() => ({
            tipo,
            nombres: '',
            primerApellido: '',
            segundoApellido: '',
            edad: '',
            institucion: ''
        })))
    }

    const addNnaItem = () => {
        setNnaItems([
            ...nnaItems,
            { tipo: tipoNna, nombres: '', primerApellido: '', segundoApellido: '', edad: '', institucion: '' }
        ])
    }

    const removeNnaItem = (index: number) => {
        if (nnaItems.length > 1) {
            const newItems = nnaItems.filter((_, i) => i !== index)
            setNnaItems(newItems)
        }
    }

    const updateNnaItem = (index: number, fields: Partial<NnaCarItem>) => {
        const newItems = [...nnaItems]
        newItems[index] = { ...newItems[index], ...fields }
        setNnaItems(newItems)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchCatalogos() }, [])

    const fetchCatalogos = async () => {
        try {
            const [complejidadesRes, dashboardRes, apelacionesRes, procedenciasRes] = await Promise.all([
                fetch('/api/complejidad'),
                fetch('/api/dashboard'),
                fetch('/api/apelaciones'),
                fetch('/api/procedencia'),
            ])
            const complejidadesData = await complejidadesRes.json()
            const dashboardData = await dashboardRes.json()
            const apelacionesData = await apelacionesRes.json()
            const procedenciasData = await procedenciasRes.json()

            const complejidadesActivas = complejidadesData.filter((c: ComplejidadJuridica) => c.activo)
            setComplejidades(complejidadesActivas)
            setCargaAbogados(dashboardData.cargaPorAbogado || [])
            setProcedencias(procedenciasData.filter((p: Procedencia) => p.activo))

            if (Array.isArray(apelacionesData)) {
                setExpedientesExistentes(apelacionesData.map((a: { numeroExpediente?: string }) => a.numeroExpediente ? a.numeroExpediente.toLowerCase() : ''))
            }
            if (complejidadesActivas.length > 0) {
                form.setValue('complejidadId', complejidadesActivas[0].id)
            }
        } catch (error) {
            console.error('Error al cargar catálogos:', error)
        }
    }

    const verificarDuplicado = (valor: string) => {
        if (!valor) { setExpedienteDuplicado(false); return }
        const existe = expedientesExistentes.includes(valor.toLowerCase())
        setExpedienteDuplicado(existe)
        if (existe) toast.warning(`El expediente "${valor}" ya está registrado en el sistema`)
    }

    const onSubmit = async (data: ApelacionFormValues) => {
        if (expedienteDuplicado) {
            toast.error('Este expediente ya existe. Verifique el número antes de continuar.')
            return
        }
        setPendingData(data)
        setShowConfirmModal(true)
    }

    const confirmarGuardado = async () => {
        if (!pendingData) return
        setShowConfirmModal(false)
        setLoading(true)
        try {
            const response = await fetch('/api/apelaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...pendingData,
                    fechaIngreso: pendingData.fechaIngreso.toISOString(),
                    fechaAsignacion: pendingData.fechaAsignacion.toISOString(),
                }),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al registrar apelación')
            }
            toast.success('Apelación registrada correctamente')
            router.push('/apelaciones')
        } catch (error) {
            console.error('Error:', error)
            toast.error(error instanceof Error ? error.message : 'Error al registrar apelación')
        } finally {
            setLoading(false)
        }
    }

    const folios = form.watch('folios')
    const complejidadId = form.watch('complejidadId')
    const puntosExtension = calcularPuntosExtension(folios || 0)
    const complejidadSeleccionada = complejidades.find((c) => c.id === complejidadId)
    const puntosComplejidad = complejidadSeleccionada?.puntos || 0
    const puntosTotal = puntosExtension + puntosComplejidad

    const abogadoAsignado = cargaAbogados.length > 0
        ? cargaAbogados.reduce((min, curr) => curr.puntosActivos < min.puntosActivos ? curr : min)
        : null

    useEffect(() => {
        if (abogadoAsignado) form.setValue('abogadoId', abogadoAsignado.abogado.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abogadoAsignado?.abogado.id])

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/apelaciones">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Registrar Nueva Apelación</h1>
                            <p className="text-muted-foreground">Complete el formulario para registrar una nueva apelación</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Datos de la Apelación</CardTitle>
                                <CardDescription>Ingrese la información del expediente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                        {/* Información Básica */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Información Básica</h3>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="numeroExpediente"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Número de Expediente *</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input
                                                                        placeholder="UPETACNA20250000557"
                                                                        {...field}
                                                                        onBlur={(e) => {
                                                                            field.onBlur()
                                                                            verificarDuplicado(e.target.value)
                                                                        }}
                                                                        className={expedienteDuplicado ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
                                                                    />
                                                                    {expedienteDuplicado && (
                                                                        <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                                                    )}
                                                                </div>
                                                            </FormControl>
                                                            {expedienteDuplicado && (
                                                                <p className="text-sm text-amber-600 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Este expediente ya existe en el sistema
                                                                </p>
                                                            )}
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="fechaIngreso"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fecha de Ingreso *</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value) ?? new Date())}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="fechaIngresoMIMP"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fecha Ingreso MIMP</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value))}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="plazoVencimiento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Plazo de Vencimiento</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value))}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-foreground">Registro de Apelantes</h4>
                                                        <p className="text-xs text-muted-foreground">Registre uno o más apelantes involucrados</p>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary w-fit">
                                                        {appellants.length} {appellants.length === 1 ? 'Apelante' : 'Apelantes'}
                                                    </span>
                                                </div>

                                                {/* Selector de Naturaleza (Toggle Estilizado) fuera de la grilla */}
                                                <div className="flex flex-col gap-1.5 bg-muted/20 p-3 rounded-lg border">
                                                    <span className="text-xs font-semibold text-muted-foreground">Tipo de Apelante:</span>
                                                    <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-lg border max-w-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoApelanteChange('natural')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoApelante === 'natural'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <User className="h-3.5 w-3.5" />
                                                            Persona Natural
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoApelanteChange('institucion')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoApelante === 'institucion'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Building className="h-3.5 w-3.5" />
                                                            Institución / Entidad
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Contenedor de Grilla Tabular */}
                                                <div className="border rounded-lg bg-card/30 p-4 shadow-sm space-y-3">
                                                    {/* Encabezados de Columna (Ocultos en móvil) */}
                                                    <div className="hidden md:grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-muted-foreground">
                                                        <div className="col-span-11">
                                                            {tipoApelante === 'natural' ? (
                                                                <div className="grid grid-cols-11 gap-2">
                                                                    <div className="col-span-4">Nombres *</div>
                                                                    <div className="col-span-4">Apellido Paterno *</div>
                                                                    <div className="col-span-3">Apellido Materno</div>
                                                                </div>
                                                            ) : (
                                                                <div>Nombre de la Institución o Entidad *</div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1 text-center">Acciones</div>
                                                    </div>

                                                    {/* Filas Dinámicas */}
                                                    <div className="space-y-3">
                                                        {appellants.map((app, index) => (
                                                            <div 
                                                                key={index} 
                                                                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 md:p-0 border md:border-0 rounded-lg md:rounded-none bg-muted/20 md:bg-transparent relative"
                                                            >
                                                                {/* Campos de Entrada */}
                                                                <div className="col-span-1 md:col-span-11">
                                                                    {tipoApelante === 'natural' ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-11 gap-2">
                                                                            <div className="space-y-1 sm:col-span-4">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Nombres *</label>
                                                                                <Input
                                                                                    placeholder="Nombres *"
                                                                                    value={app.nombres || ''}
                                                                                    onChange={(e) => updateAppellant(index, { nombres: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-4">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Apellido Paterno *</label>
                                                                                <Input
                                                                                    placeholder="Ap. Paterno *"
                                                                                    value={app.apellidoPaterno || ''}
                                                                                    onChange={(e) => updateAppellant(index, { apellidoPaterno: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Apellido Materno</label>
                                                                                <Input
                                                                                    placeholder="Ap. Materno"
                                                                                    value={app.apellidoMaterno || ''}
                                                                                    onChange={(e) => updateAppellant(index, { apellidoMaterno: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-medium text-muted-foreground md:hidden">Nombre de la Institución / Entidad *</label>
                                                                            <Input
                                                                                placeholder="Nombre de la Institución o Entidad * (ej: MINJUS, Fiscalía, CAR, etc.)"
                                                                                value={app.institucion || ''}
                                                                                onChange={(e) => updateAppellant(index, { institucion: e.target.value })}
                                                                                className="h-9 text-xs w-full"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Botón de Eliminar */}
                                                                <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0">
                                                                    {appellants.length > 1 ? (
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                                            onClick={() => removeAppellant(index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : (
                                                                        <div className="h-8 w-8 hidden md:block" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Botón de Agregar al final de la grilla */}
                                                    <div className="flex justify-end pt-2 border-t mt-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addAppellant}
                                                            className="border-dashed hover:border-primary/50 text-xs flex items-center gap-1.5 h-8 font-medium shadow-none hover:bg-primary/5 text-primary"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Agregar otro Apelante
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Campo oculto para cumplir con react-hook-form y validaciones */}
                                                <FormField
                                                    control={form.control}
                                                    name="apelante"
                                                    render={({ field }) => (
                                                        <FormItem className="hidden">
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-foreground">Niño, Niña, Adolescente o CAR</h4>
                                                        <p className="text-xs text-muted-foreground">Registre los datos de los NNA o centros involucrados</p>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary w-fit">
                                                        {nnaItems.length} {nnaItems.length === 1 ? 'Registro' : 'Registros'}
                                                    </span>
                                                </div>

                                                {/* Selector de Naturaleza (Toggle Estilizado) */}
                                                <div className="flex flex-col gap-1.5 bg-muted/20 p-3 rounded-lg border">
                                                    <span className="text-xs font-semibold text-muted-foreground">Tipo de Registro:</span>
                                                    <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-lg border max-w-md">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoNnaChange('natural')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoNna === 'natural'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <User className="h-3.5 w-3.5" />
                                                            Niño/a o Adolescente (NNA)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoNnaChange('institucion')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoNna === 'institucion'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Building className="h-3.5 w-3.5" />
                                                            Centro o Institución (CAR)
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Contenedor de Grilla Tabular */}
                                                <div className="border rounded-lg bg-card/30 p-4 shadow-sm space-y-3">
                                                    {/* Encabezados de Columna (Ocultos en móvil) */}
                                                    <div className="hidden md:grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-muted-foreground">
                                                        <div className="col-span-11">
                                                            {tipoNna === 'natural' ? (
                                                                <div className="grid grid-cols-11 gap-2">
                                                                    <div className="col-span-3">Nombres *</div>
                                                                    <div className="col-span-3">Primer Apellido *</div>
                                                                    <div className="col-span-3">Segundo Apellido</div>
                                                                    <div className="col-span-2">Edad</div>
                                                                </div>
                                                            ) : (
                                                                <div>Nombre de la Institución/Entidad (CAR) *</div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1 text-center">Acciones</div>
                                                    </div>

                                                    {/* Filas Dinámicas */}
                                                    <div className="space-y-3">
                                                        {nnaItems.map((item, index) => (
                                                            <div 
                                                                key={index} 
                                                                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 md:p-0 border md:border-0 rounded-lg md:rounded-none bg-muted/20 md:bg-transparent relative"
                                                            >
                                                                {/* Campos de Entrada */}
                                                                <div className="col-span-1 md:col-span-11">
                                                                    {tipoNna === 'natural' ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-11 gap-2">
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Nombres *</label>
                                                                                <Input
                                                                                    placeholder="Nombres *"
                                                                                    value={item.nombres || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { nombres: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Primer Apellido *</label>
                                                                                <Input
                                                                                    placeholder="Primer Apellido *"
                                                                                    value={item.primerApellido || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { primerApellido: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Segundo Apellido</label>
                                                                                <Input
                                                                                    placeholder="Segundo Apellido"
                                                                                    value={item.segundoApellido || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { segundoApellido: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-2">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Edad</label>
                                                                                <Input
                                                                                    placeholder="Edad"
                                                                                    value={item.edad || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { edad: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-medium text-muted-foreground md:hidden">Nombre de la Institución / Entidad *</label>
                                                                            <Input
                                                                                placeholder="Nombre de la Institución o Entidad (CAR) * (ej: CAR San Miguel, CAR Virgen de Fátima, etc.)"
                                                                                value={item.institucion || ''}
                                                                                onChange={(e) => updateNnaItem(index, { institucion: e.target.value })}
                                                                                className="h-9 text-xs w-full"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Botón de Eliminar */}
                                                                <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0">
                                                                    {nnaItems.length > 1 ? (
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                                            onClick={() => removeNnaItem(index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : (
                                                                        <div className="h-8 w-8 hidden md:block" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Botón de Agregar al final de la grilla */}
                                                    <div className="flex justify-end pt-2 border-t mt-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addNnaItem}
                                                            className="border-dashed hover:border-primary/50 text-xs flex items-center gap-1.5 h-8 font-medium shadow-none hover:bg-primary/5 text-primary"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Agregar otro {tipoNna === 'natural' ? 'NNA' : 'CAR'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Campo oculto para cumplir con react-hook-form y validaciones */}
                                                <FormField
                                                    control={form.control}
                                                    name="nnaCar"
                                                    render={({ field }) => (
                                                        <FormItem className="hidden">
                                                            <FormControl>
                                                                <Input {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="procedencia"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Procedencia *</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Seleccione procedencia" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {procedencias.map((p) => (
                                                                        <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="documento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Documento *</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Nº de nota o documento de ingreso" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="asunto"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Asunto *</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="Descripción del asunto de la apelación" className="min-h-[100px]" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Triaje */}
                                        <div className="space-y-4">
                                                <h3 className="text-lg font-semibold">Triaje</h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name="folios"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Cantidad de Folios *</FormLabel>
                                                                <FormControl>
                                                                    <Input 
                                                                        type="number" 
                                                                        min="1" 
                                                                        {...field} 
                                                                        value={isNaN(field.value) ? '' : field.value}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value);
                                                                            field.onChange(isNaN(val) ? 0 : val);
                                                                        }} 
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>Puntos por extensión: {puntosExtension}</FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="complejidadId"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Complejidad Jurídica *</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Seleccione complejidad" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {complejidades.map((comp) => (
                                                                            <SelectItem key={comp.id} value={comp.id}>
                                                                                {comp.nombre} ({comp.puntos} pts)
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormDescription>Puntos por complejidad: {puntosComplejidad}</FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                        {/* Asignación */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Asignación</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="fechaAsignacion"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fecha de Asignación *</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value) ?? new Date())}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="estado"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Estado *</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                                                    <SelectItem value="Resuelto">Resuelto</SelectItem>
                                                                    <SelectItem value="Atendido">Atendido</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Observaciones */}
                                        <FormField
                                            control={form.control}
                                            name="observaciones"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Observaciones</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Notas adicionales sobre el caso" className="min-h-[80px]" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Botones */}
                                        <div className="flex gap-4">
                                            <Button type="submit" disabled={loading}>
                                                <Save className="mr-2 h-4 w-4" />
                                                {loading ? 'Guardando...' : 'Guardar Apelación'}
                                            </Button>
                                            <Link href="/apelaciones">
                                                <Button type="button" variant="outline">Cancelar</Button>
                                            </Link>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Panel Lateral */}
                    <div className="lg:col-span-1 space-y-6">
                        <PanelAsignacion cargaAbogados={cargaAbogados} />

                        {/* Resumen de Puntos */}
                        <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle>Resumen de Puntos</CardTitle>
                                    <CardDescription>Cálculo automático del triaje</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Folios:</span>
                                            <span className="font-medium">{folios || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Puntos por extensión:</span>
                                            <span className="font-semibold">{puntosExtension}</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border" />
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Complejidad:</span>
                                            <span className="font-medium">{complejidadSeleccionada?.nombre || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Puntos por complejidad:</span>
                                            <span className="font-semibold">{puntosComplejidad}</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border" />
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Total de Puntos:</span>
                                        <span className="text-2xl font-bold text-primary">{puntosTotal}</span>
                                    </div>
                                    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                                        <p className="font-medium mb-1">Rango de puntos:</p>
                                        <p>Mínimo: 2 puntos</p>
                                        <p>Máximo: 8 puntos</p>
                                    </div>
                                </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Modal de confirmación */}
            <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar asignación</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm">
                                <p>La apelación será asignada automáticamente a:</p>
                                {abogadoAsignado && (
                                    <div className="rounded-lg border bg-muted/50 px-4 py-3">
                                        <p className="font-semibold text-foreground text-base">{abogadoAsignado.abogado.nombre}</p>
                                        <p className="text-muted-foreground text-xs mt-0.5">{abogadoAsignado.puntosActivos} pts activos actualmente</p>
                                    </div>
                                )}
                                <p className="text-muted-foreground">¿Desea continuar y guardar la apelación?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarGuardado}>Confirmar y guardar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
