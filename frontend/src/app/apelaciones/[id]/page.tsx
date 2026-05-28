'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apelacionSchema, type ApelacionFormValues } from '@/lib/validations'
import { calcularPuntosExtension } from '@/lib/calcular-puntos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
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
import { ArrowLeft, Save, Trash2, FileText, CheckCircle2, Plus, User, Building } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Abogado, ComplejidadJuridica, ApelacionConRelaciones, Procedencia, Revisor, CargaRevisor } from '@/types'
import type { z } from 'zod'
import { Appellant, serializeAppellants, deserializeAppellants, NnaCarItem, serializeNnaCar, deserializeNnaCar } from '@/lib/utils'

const dateToValue = (v: unknown): string => {
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0]
    return ''
}
const valueToDate = (str: string): Date | null => {
    if (!str || str.length < 10) return null
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
}

interface CargaRevisorData {
    revisorId: string
    nombre: string
    totalCasos: number
    casosPendientes: number
    casosResueltos: number
    casosAtendidos: number
}

export default function ApelacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [apelacion, setApelacion] = useState<ApelacionConRelaciones | null>(null)
    const [abogados, setAbogados] = useState<Abogado[]>([])
    const [complejidades, setComplejidades] = useState<ComplejidadJuridica[]>([])
    const [procedencias, setProcedencias] = useState<Procedencia[]>([])
    const [revisores, setRevisores] = useState<Revisor[]>([])
    const [cargaRevisores, setCargaRevisores] = useState<CargaRevisorData[]>([])
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true')
    const [showConfirmGuardar, setShowConfirmGuardar] = useState(false)
    const [showExitoModal, setShowExitoModal] = useState(false)
    const [pendingData, setPendingData] = useState<ApelacionFormValues | null>(null)

    const form = useForm<ApelacionFormValues>({
        resolver: zodResolver(apelacionSchema) as any,
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

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const fetchData = async () => {
        try {
            const [apelacionRes, abogadosRes, complejidadesRes, procedenciasRes, revisoresRes, revisorCargaRes] = await Promise.all([
                fetch(`/api/apelaciones/${id}`),
                fetch('/api/abogados'),
                fetch('/api/complejidad'),
                fetch('/api/procedencia'),
                fetch('/api/revisor'),
                fetch('/api/revisor/carga'),
            ])

            if (!apelacionRes.ok) {
                throw new Error('Apelación no encontrada')
            }

            const apelacionData = await apelacionRes.json()
            const abogadosData = await abogadosRes.json()
            const complejidadesData = await complejidadesRes.json()
            const procedenciasData = await procedenciasRes.json()
            const revisoresData = await revisoresRes.json()
            const revisorCargaData = await revisorCargaRes.json()

            setApelacion(apelacionData)
            const deserialized = deserializeAppellants(apelacionData.apelante || '')
            setAppellants(deserialized)
            if (deserialized.length > 0) {
                setTipoApelante(deserialized[0].tipo)
            }
            const deserializedNna = deserializeNnaCar(apelacionData.nnaCar || '')
            setNnaItems(deserializedNna)
            if (deserializedNna.length > 0) {
                setTipoNna(deserializedNna[0].tipo)
            }
            setAbogados(abogadosData.filter((a: Abogado) => a.activo))
            setComplejidades(complejidadesData.filter((c: ComplejidadJuridica) => c.activo))
            setProcedencias(procedenciasData.filter((p: Procedencia) => p.activo))
            setRevisores(Array.isArray(revisoresData) ? revisoresData.filter((r: Revisor) => r.activo) : [])
            setCargaRevisores(Array.isArray(revisorCargaData) ? revisorCargaData : [])

            // Cargar datos en el formulario
            form.reset({
                numeroExpediente: apelacionData.numeroExpediente,
                fechaIngreso: new Date(apelacionData.fechaIngreso),
                fechaIngresoMIMP: apelacionData.fechaIngresoMIMP ? new Date(apelacionData.fechaIngresoMIMP) : null,
                plazoVencimiento: apelacionData.plazoVencimiento ? new Date(apelacionData.plazoVencimiento) : null,
                apelante: apelacionData.apelante || '',
                nnaCar: apelacionData.nnaCar || '',
                procedencia: apelacionData.procedencia,
                documento: apelacionData.documento || '',
                asunto: apelacionData.asunto || '',
                folios: Number(apelacionData.folios),
                complejidadId: apelacionData.complejidadId,
                abogadoId: apelacionData.abogadoId,
                fechaAsignacion: new Date(apelacionData.fechaAsignacion),
                estado: apelacionData.estado,
                numeroResolucion: apelacionData.numeroResolucion || '',
                documentoAtencion: apelacionData.documentoAtencion || '',
                cargos: apelacionData.cargos || '',
                observaciones: apelacionData.observaciones || '',
                revisorId: apelacionData.revisorId || null,
            })
        } catch (error) {
            console.error('Error al cargar datos:', error)
            alert('Error al cargar la apelación')
            router.push('/apelaciones')
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = (data: ApelacionFormValues) => {
        setPendingData(data)
        setShowConfirmGuardar(true)
    }

    const confirmarGuardado = async () => {
        if (!pendingData) return
        setShowConfirmGuardar(false)
        setSaving(true)
        try {
            const response = await fetch(`/api/apelaciones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...pendingData,
                    fechaIngreso: pendingData.fechaIngreso.toISOString(),
                    fechaAsignacion: pendingData.fechaAsignacion.toISOString(),
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al actualizar apelación')
            }

            const updatedApelacion = await response.json()
            setApelacion(updatedApelacion)
            setIsEditing(false)
            setShowExitoModal(true)
        } catch (error) {
            console.error('Error:', error)
            alert(error instanceof Error ? error.message : 'Error al actualizar apelación')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('¿Está seguro de eliminar esta apelación? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            const response = await fetch(`/api/apelaciones/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Error al eliminar apelación')
            }

            alert('Apelación eliminada correctamente')
            router.push('/apelaciones')
        } catch (error) {
            console.error('Error:', error)
            alert('Error al eliminar apelación')
        }
    }

    const folios = form.watch('folios')
    const complejidadId = form.watch('complejidadId')
    const estado = form.watch('estado')

    const puntosExtension = calcularPuntosExtension(folios || 0)
    const complejidadSeleccionada = complejidades.find((c) => c.id === complejidadId)
    const puntosComplejidad = complejidadSeleccionada?.puntos || 0
    const puntosTotal = puntosExtension + puntosComplejidad

    const getEstadoBadgeVariant = (estado: string): 'secondary' | 'default' | 'outline' => {
        switch (estado) {
            case 'Pendiente':
                return 'secondary'
            case 'Resuelto':
                return 'default'
            case 'Atendido':
                return 'outline'
            default:
                return 'default'
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando apelación...</p>
                </div>
            </div>
        )
    }

    if (!apelacion) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">Apelación no encontrada</p>
            </div>
        )
    }

    return (
        <>
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/apelaciones">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-primary" />
                                <div>
                                    <h1 className="text-3xl font-bold">{apelacion.numeroExpediente}</h1>
                                    <p className="text-muted-foreground">{apelacion.apelante}</p>
                                </div>
                                <Badge variant={getEstadoBadgeVariant(apelacion.estado)}>
                                    {apelacion.estado}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isEditing ? (
                                <>
                                    <Button onClick={() => setIsEditing(true)}>Editar</Button>
                                    <Button variant="destructive" onClick={handleDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" onClick={() => {
                                    setIsEditing(false)
                                    fetchData()
                                }}>
                                    Cancelar Edición
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Contenido Principal */}
                    <div className="lg:col-span-2">
                        {!isEditing ? (
                            // Vista de Solo Lectura
                            <div className="space-y-6">
                                {/* Información Básica */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Información Básica</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Número de Expediente</p>
                                            <p className="font-semibold">{apelacion.numeroExpediente}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                                            <p className="font-semibold">
                                                {format(new Date(apelacion.fechaIngreso), 'dd/MM/yyyy', { locale: es })}
                                            </p>
                                        </div>
                                        {apelacion.fechaIngresoMIMP && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Fecha Ingreso MIMP</p>
                                                <p className="font-semibold">
                                                    {format(new Date(apelacion.fechaIngresoMIMP), 'dd/MM/yyyy', { locale: es })}
                                                </p>
                                            </div>
                                        )}
                                        {apelacion.plazoVencimiento && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Plazo de Vencimiento</p>
                                                <p className="font-semibold">
                                                    {format(new Date(apelacion.plazoVencimiento), 'dd/MM/yyyy', { locale: es })}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Apelante(s)</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {deserializeAppellants(apelacion.apelante || '').map((app, idx) => (
                                                    <div key={idx} className="text-xs font-medium bg-secondary text-secondary-foreground border rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                                                        {app.tipo === 'natural' ? (
                                                            <>
                                                                <User className="h-3.5 w-3.5 text-primary" />
                                                                <span>{app.nombres} {app.apellidoPaterno} {app.apellidoMaterno}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Building className="h-3.5 w-3.5 text-primary" />
                                                                <span>{app.institucion}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {apelacion.nnaCar && (
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">NNA / CAR</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {deserializeNnaCar(apelacion.nnaCar).map((nna, idx) => (
                                                        <div key={idx} className="text-xs font-medium bg-secondary text-secondary-foreground border rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                                                            {nna.tipo === 'natural' ? (
                                                                <>
                                                                    <User className="h-3.5 w-3.5 text-primary" />
                                                                    <span>
                                                                        {nna.nombres} {nna.primerApellido} {nna.segundoApellido}
                                                                        {nna.edad ? ` (${nna.edad} años)` : ''}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Building className="h-3.5 w-3.5 text-primary" />
                                                                    <span>{nna.institucion}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-muted-foreground">Procedencia</p>
                                            <p className="font-semibold">{apelacion.procedencia}</p>
                                        </div>
                                        {apelacion.documento && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Número de Documento</p>
                                                <p className="font-semibold">{apelacion.documento}</p>
                                            </div>
                                        )}
                                        {apelacion.asunto && (
                                            <div className="md:col-span-2">
                                                <p className="text-sm text-muted-foreground">Asunto</p>
                                                <p className="font-semibold">{apelacion.asunto}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Triaje */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Triaje</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Cantidad de Folios</p>
                                            <p className="font-semibold">{apelacion.folios}</p>
                                            <p className="text-xs text-muted-foreground">Puntos: {apelacion.puntosExtension}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Complejidad Jurídica</p>
                                            <p className="font-semibold">{apelacion.complejidad.nombre}</p>
                                            <p className="text-xs text-muted-foreground">Puntos: {apelacion.puntosComplejidad}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Asignación */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Asignación</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Abogado Asignado</p>
                                            <p className="font-semibold">{apelacion.abogado.nombre}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Estado</p>
                                            <Badge variant={getEstadoBadgeVariant(apelacion.estado)}>
                                                {apelacion.estado}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Fecha Asignación</p>
                                            <p className="font-semibold">{format(new Date(apelacion.fechaAsignacion), 'dd/MM/yyyy', { locale: es })}</p>
                                        </div>
                                        {apelacion.revisor && (
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Revisado por</p>
                                                    <p className="font-semibold">{apelacion.revisor.nombre}</p>
                                                </div>
                                                {apelacion.fechaRevisor && (
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Fecha Revisor</p>
                                                        <p className="font-semibold">{format(new Date(apelacion.fechaRevisor), 'dd/MM/yyyy', { locale: es })}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Resolución / Atención */}
                                {(apelacion.estado === 'Resuelto' || apelacion.estado === 'Atendido') && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Atención / Resolución</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid gap-4 md:grid-cols-3">

                                            {apelacion.numeroResolucion && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Nº de Resolución</p>
                                                    <p className="font-semibold">{apelacion.numeroResolucion}</p>
                                                </div>
                                            )}
                                            {apelacion.documentoAtencion && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Doc. Atención</p>
                                                    <p className="font-semibold">{apelacion.documentoAtencion}</p>
                                                </div>
                                            )}
                                            {apelacion.cargos && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Cargos</p>
                                                    <p className="font-semibold">{apelacion.cargos}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Observaciones */}
                                {apelacion.observaciones && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Observaciones</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="whitespace-pre-wrap">{apelacion.observaciones}</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            // Formulario de Edición
                            <Card>
                                <CardHeader>
                                    <CardTitle>Editar Apelación</CardTitle>
                                    <CardDescription>Modifique los datos del expediente</CardDescription>
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
                                                                    <Input {...field} />
                                                                </FormControl>
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
                                                                                <label className="text-[10px] font-medium text-muted-foreground md:hidden">Nombre de la Institución / Entidad (CAR) *</label>
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
                                                                            <SelectItem key={p.id} value={p.nombre}>
                                                                                {p.nombre}
                                                                            </SelectItem>
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
                                                                <FormLabel>Documento</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
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
                                                            <FormLabel>Asunto</FormLabel>
                                                            <FormControl>
                                                                <Textarea className="min-h-[100px]" {...field} />
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
                                                                <FormDescription>
                                                                    Puntos por extensión: {puntosExtension}
                                                                </FormDescription>
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
                                                                            <SelectValue />
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
                                                                <FormDescription>
                                                                    Puntos por complejidad: {puntosComplejidad}
                                                                </FormDescription>
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
                                                        name="abogadoId"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Abogado Asignado *</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {abogados.map((abogado) => (
                                                                            <SelectItem key={abogado.id} value={abogado.id}>
                                                                                {abogado.nombre}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

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
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name="estado"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Estado *</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
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

                                                    <FormField
                                                        control={form.control}
                                                        name="revisorId"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Revisado por</FormLabel>
                                                                <Select
                                                                    onValueChange={(v) => field.onChange(v === '__ninguno__' ? null : v)}
                                                                    value={field.value ?? '__ninguno__'}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Sin revisor asignado" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="__ninguno__">— Sin revisor —</SelectItem>
                                                                        {revisores.map((r) => {
                                                                            const carga = cargaRevisores.find(c => c.revisorId === r.id);
                                                                            const count = carga ? carga.totalCasos : 0;
                                                                            return (
                                                                                <SelectItem key={r.id} value={r.id}>
                                                                                    {r.nombre} ({count} {count === 1 ? 'caso' : 'casos'})
                                                                                </SelectItem>
                                                                            );
                                                                        })}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* Resolución */}
                                            {(estado === 'Resuelto' || estado === 'Atendido') && (
                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-semibold">Resolución</h3>

                                                    <div className="grid gap-4 md:grid-cols-3">

                                                        <FormField
                                                            control={form.control}
                                                            name="numeroResolucion"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Nº de Resolución</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="documentoAtencion"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Documento Atención</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="cargos"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Cargos</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Seleccione estado de cargos" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                                                                            <SelectItem value="Recibidos">Recibidos</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Observaciones */}
                                            <FormField
                                                control={form.control}
                                                name="observaciones"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Observaciones</FormLabel>
                                                        <FormControl>
                                                            <Textarea className="min-h-[80px]" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Botones */}
                                            <div className="flex gap-4">
                                                <Button type="submit" disabled={saving}>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Panel Lateral */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 flex flex-col gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumen</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Puntos Totales:</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {isEditing ? puntosTotal : apelacion.puntosTotal}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-border" />

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Extensión:</span>
                                            <span className="font-semibold">
                                                {isEditing ? puntosExtension : apelacion.puntosExtension} pts
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Complejidad:</span>
                                            <span className="font-semibold">
                                                {isEditing ? puntosComplejidad : apelacion.puntosComplejidad} pts
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-border" />

                                    <div className="space-y-2 text-sm">
                                        <p className="text-muted-foreground">
                                            <strong>Creado:</strong>{' '}
                                            {format(new Date(apelacion.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </p>
                                        <p className="text-muted-foreground">
                                            <strong>Actualizado:</strong>{' '}
                                            {format(new Date(apelacion.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Carga por Revisor */}
                            <Card className="bg-white">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-50 rounded-lg">
                                            <CheckCircle2 className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-semibold">Carga por Revisor</CardTitle>
                                            <p className="text-[11px] text-muted-foreground">Casos asignados a cada revisor</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {cargaRevisores.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-2">Sin datos de revisores</p>
                                    ) : (
                                        cargaRevisores.map((item) => {
                                            const initials = item.nombre
                                                .split(' ')
                                                .slice(0, 2)
                                                .map((n: string) => n[0])
                                                .join('')
                                                .toUpperCase();
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
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        {/* Modal de confirmación de guardado */}
        <AlertDialog open={showConfirmGuardar} onOpenChange={setShowConfirmGuardar}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-lg">
                        <Save className="h-5 w-5 text-primary" />
                        ¿Desea guardar los cambios?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Está a punto de actualizar el expediente:</p>
                            <div className="rounded-lg border bg-muted/50 px-4 py-3">
                                <p className="font-semibold text-foreground">{apelacion?.numeroExpediente}</p>
                                <p className="text-xs mt-0.5">{apelacion?.apelante}</p>
                            </div>
                            <p>Esta acción actualizará los datos en el sistema. ¿Desea continuar?</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>No, cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmarGuardado}>
                        Sí, guardar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Modal de éxito */}
        <AlertDialog open={showExitoModal} onOpenChange={setShowExitoModal}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-lg text-green-600">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        Registro actualizado correctamente
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Los cambios del expediente han sido guardados exitosamente.</p>
                            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                                <p className="font-semibold text-foreground">{apelacion?.numeroExpediente}</p>
                                <p className="text-xs mt-0.5 text-green-700">Actualizado el {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setShowExitoModal(false)}>
                        Aceptar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
