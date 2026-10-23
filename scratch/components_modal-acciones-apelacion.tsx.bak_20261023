'use client'

import React, { useState, useEffect } from 'react'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RESULTADOS_RESOLUCION } from '@/lib/validations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import type { ApelacionConRelaciones, Abogado, Revisor } from '@/types'
import { 
    Eye, 
    UserCheck, 
    Search, 
    CheckCircle2, 
    Send, 
    Save, 
    Scale, 
    Calendar, 
    FileText, 
    AlertCircle,
    Building,
    User
} from 'lucide-react'

export type TipoModalAccion = 'ficha' | 'abogado' | 'revisor' | 'resuelto' | 'atendido' | null

interface ModalAccionesApelacionProps {
    tipoModal: TipoModalAccion
    apelacion: ApelacionConRelaciones | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    abogados: Abogado[]
    revisores: Revisor[]
    cargaRevisores?: { revisorId: string; totalCasos: number }[]
}

const formatDateSafe = (d: string | Date | null | undefined): string => {
    if (!d) return ''
    try {
        const dateObj = typeof d === 'string' ? new Date(d) : d
        if (isNaN(dateObj.getTime())) return ''
        return dateObj.toISOString().split('T')[0]
    } catch {
        return ''
    }
}

const formatDisplayDate = (d: string | Date | null | undefined): string => {
    if (!d) return '—'
    try {
        const dateObj = typeof d === 'string' ? new Date(d) : d
        if (isNaN(dateObj.getTime())) return '—'
        return format(dateObj, 'dd/MM/yyyy', { locale: es })
    } catch {
        return '—'
    }
}

export function ModalAccionesApelacion({
    tipoModal,
    apelacion,
    isOpen,
    onClose,
    onSuccess,
    abogados,
    revisores,
    cargaRevisores = [],
}: ModalAccionesApelacionProps) {
    const [saving, setSaving] = useState(false)

    // Campos formulario
    const [abogadoId, setAbogadoId] = useState<string>('')
    const [fechaAsignacion, setFechaAsignacion] = useState<string>('')

    const [fechaCambioResuelto, setFechaCambioResuelto] = useState<string>('')
    const [revisorId, setRevisorId] = useState<string>('')
    const [fechaRevisor, setFechaRevisor] = useState<string>('')

    const [numeroResolucion, setNumeroResolucion] = useState<string>('')
    const [fechaResolucion, setFechaResolucion] = useState<string>('')
    const [resultadoResolucion, setResultadoResolucion] = useState<string>('')

    const [documentoAtencion, setDocumentoAtencion] = useState<string>('')
    const [cargos, setCargos] = useState<string>('Pendiente')
    const [observaciones, setObservaciones] = useState<string>('')

    useEffect(() => {
        if (!apelacion || !isOpen) return

        setAbogadoId(apelacion.abogadoId || '')
        setFechaAsignacion(formatDateSafe(apelacion.fechaAsignacion) || formatDateSafe(new Date()))

        setFechaCambioResuelto(formatDateSafe(apelacion.fechaCambioResuelto) || '')
        setRevisorId(apelacion.revisorId || '__ninguno__')
        setFechaRevisor(formatDateSafe(apelacion.fechaRevisor) || formatDateSafe(new Date()))

        setNumeroResolucion(apelacion.numeroResolucion || '')
        setFechaResolucion(formatDateSafe(apelacion.fechaResolucion) || formatDateSafe(new Date()))
        setResultadoResolucion(apelacion.resultadoResolucion || '__ninguno__')

        setDocumentoAtencion(apelacion.documentoAtencion || '')
        setCargos(apelacion.cargos || 'Pendiente')
        setObservaciones(apelacion.observaciones || '')
    }, [apelacion, isOpen, tipoModal])

    if (!isOpen || !apelacion) return null

    // Helper apelantes
    const apelantesTexto = apelacion.apelantes && apelacion.apelantes.length > 0
        ? apelacion.apelantes.map(a => a.tipo === 'institucion' ? a.institucion : [a.nombres, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ')).filter(Boolean).join(', ')
        : (apelacion.apelante || '—')

    // Helper NNAs
    const nnasTexto = apelacion.nnas && apelacion.nnas.length > 0
        ? apelacion.nnas.map(n => {
            if (n.tipo === 'institucion') return n.institucion || 'CAR'
            const nombre = [n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ')
            return n.edad ? `${nombre} (${n.edad} años)` : nombre
        }).filter(Boolean).join(', ')
        : (apelacion.nnaCar || '—')

    // Filtrar únicamente abogados activos (o el actualmente asignado al expediente si ya tenía uno)
    const abogadosActivos = abogados.filter(a => Boolean(a.activo) || (Boolean(apelacion.abogadoId) && a.id === apelacion.abogadoId))
    // Filtrar únicamente revisores activos (o el actualmente asignado al expediente si ya tenía uno)
    const revisoresActivos = revisores.filter(r => Boolean(r.activo) || (Boolean(apelacion.revisorId) && r.id === apelacion.revisorId))

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'Pendiente': return <Badge variant="secondary">Pendiente</Badge>
            case 'Resuelto': return <Badge variant="default">Resuelto</Badge>
            case 'Atendido': return <Badge variant="atendido">Atendido</Badge>
            case 'Observado': return <Badge variant="outline">Observado</Badge>
            default: return <Badge variant="default">{estado}</Badge>
        }
    }

    // Cabecera compartida del caso
    const renderTarjetaResumenCaso = () => (
        <div className="bg-muted/40 border rounded-lg p-3 text-xs space-y-1.5 my-3">
            <div className="flex items-center justify-between border-b pb-1.5 font-semibold text-foreground">
                <span className="flex items-center gap-1 text-primary">
                    <Scale className="h-3.5 w-3.5" />
                    Expediente: {apelacion.numeroExpediente}
                </span>
                <div>{getEstadoBadge(apelacion.estado)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground pt-1">
                <div>
                    <span className="font-medium text-foreground">Apelante(s): </span>
                    <span className="truncate inline-block max-w-[220px] align-bottom">{apelantesTexto}</span>
                </div>
                <div>
                    <span className="font-medium text-foreground">NNA / CAR: </span>
                    <span className="truncate inline-block max-w-[220px] align-bottom">{nnasTexto}</span>
                </div>
                <div>
                    <span className="font-medium text-foreground">Complejidad Jurídica: </span>
                    <span className="text-foreground font-semibold">{apelacion.complejidad?.nombre || '—'}</span>
                </div>
                <div>
                    <span className="font-medium text-foreground">Procedencia: </span>
                    <span>{apelacion.procedencia || '—'}</span>
                </div>
            </div>
        </div>
    )

    // Manejar envío de formularios
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Payload base existente
            const payload: any = {
                numeroExpediente: apelacion.numeroExpediente,
                fechaIngreso: new Date(apelacion.fechaIngreso).toISOString(),
                fechaIngresoMIMP: apelacion.fechaIngresoMIMP ? new Date(apelacion.fechaIngresoMIMP).toISOString() : null,
                plazoVencimiento: apelacion.plazoVencimiento ? new Date(apelacion.plazoVencimiento).toISOString() : null,
                apelante: apelacion.apelante,
                nnaCar: apelacion.nnaCar,
                procedencia: apelacion.procedencia,
                documento: apelacion.documento,
                asunto: apelacion.asunto,
                folios: apelacion.folios,
                complejidadId: apelacion.complejidadId,
                abogadoId: apelacion.abogadoId,
                fechaAsignacion: new Date(apelacion.fechaAsignacion).toISOString(),
                estado: apelacion.estado,
                numeroResolucion: apelacion.numeroResolucion,
                resultadoResolucion: apelacion.resultadoResolucion,
                fechaResolucion: apelacion.fechaResolucion ? new Date(apelacion.fechaResolucion).toISOString() : null,
                fechaCambioResuelto: apelacion.fechaCambioResuelto ? new Date(apelacion.fechaCambioResuelto).toISOString() : null,
                revisorId: apelacion.revisorId,
                fechaRevisor: apelacion.fechaRevisor ? new Date(apelacion.fechaRevisor).toISOString() : null,
                documentoAtencion: apelacion.documentoAtencion,
                cargos: apelacion.cargos,
                observaciones: observaciones || apelacion.observaciones,
            }

            if (tipoModal === 'abogado') {
                if (!abogadoId) {
                    toast.error('Debe seleccionar un abogado')
                    setSaving(false)
                    return
                }
                payload.abogadoId = abogadoId
                payload.fechaAsignacion = new Date(`${fechaAsignacion}T12:00:00`).toISOString()
            } else if (tipoModal === 'revisor') {
                if (!revisorId || revisorId === '__ninguno__') {
                    toast.error('Debe seleccionar un revisor')
                    setSaving(false)
                    return
                }
                payload.revisorId = revisorId
                payload.fechaRevisor = fechaRevisor ? new Date(`${fechaRevisor}T12:00:00`).toISOString() : new Date().toISOString()
                if (fechaCambioResuelto) {
                    payload.fechaCambioResuelto = new Date(`${fechaCambioResuelto}T12:00:00`).toISOString()
                }
            } else if (tipoModal === 'resuelto') {
                if (!numeroResolucion.trim()) {
                    toast.error('Debe ingresar el Nº de Resolución')
                    setSaving(false)
                    return
                }
                payload.estado = 'Resuelto'
                payload.numeroResolucion = numeroResolucion.trim()
                payload.fechaResolucion = fechaResolucion ? new Date(`${fechaResolucion}T12:00:00`).toISOString() : new Date().toISOString()
                payload.resultadoResolucion = resultadoResolucion === '__ninguno__' ? null : resultadoResolucion
                if (fechaCambioResuelto) {
                    payload.fechaCambioResuelto = new Date(`${fechaCambioResuelto}T12:00:00`).toISOString()
                }
            } else if (tipoModal === 'atendido') {
                if (!documentoAtencion.trim()) {
                    toast.error('Debe ingresar el Documento de Atención')
                    setSaving(false)
                    return
                }
                payload.estado = 'Atendido'
                payload.documentoAtencion = documentoAtencion.trim()
                payload.cargos = cargos
            }

            const res = await fetch(`/api/apelaciones/${apelacion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || err.error || 'Error al actualizar apelación')
            }

            toast.success(
                tipoModal === 'abogado' ? 'Abogado asignado correctamente' :
                tipoModal === 'revisor' ? 'Caso derivado al revisor correctamente' :
                tipoModal === 'resuelto' ? 'Caso pasado a Resuelto con éxito' :
                'Caso pasado a Atendido correctamente'
            )
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error:', error)
            toast.error(error instanceof Error ? error.message : 'Error al guardar los cambios')
        } finally {
            setSaving(false)
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                {/* 👁️ MODAL 0: FICHA RÁPIDA */}
                {tipoModal === 'ficha' && (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-lg">
                                <Eye className="h-5 w-5 text-primary" />
                                Ficha del Expediente: {apelacion.numeroExpediente}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Consulta rápida de todos los antecedentes y estado actual del caso.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-4 my-2 text-sm">
                            {renderTarjetaResumenCaso()}

                            <div className="border rounded-lg p-3 bg-card space-y-2">
                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Datos del Trámite
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Fecha Ingreso:</span>{' '}
                                        <span className="font-medium">{formatDisplayDate(apelacion.fechaIngreso)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Fecha Ingreso MIMP:</span>{' '}
                                        <span className="font-medium">{formatDisplayDate(apelacion.fechaIngresoMIMP)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Plazo Vencimiento:</span>{' '}
                                        <span className="font-medium">{formatDisplayDate(apelacion.plazoVencimiento)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Documento de Ingreso:</span>{' '}
                                        <span className="font-medium">{apelacion.documento || '—'}</span>
                                    </div>
                                </div>
                                {apelacion.asunto && (
                                    <div className="text-xs pt-1 border-t">
                                        <span className="text-muted-foreground block font-medium mb-0.5">Asunto / Petitorio:</span>
                                        <p className="text-foreground bg-muted/30 p-2 rounded border text-xs">{apelacion.asunto}</p>
                                    </div>
                                )}
                            </div>

                            <div className="border rounded-lg p-3 bg-card space-y-2">
                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <UserCheck className="h-3.5 w-3.5" /> Asignación y Revisión
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Abogado Asignado:</span>{' '}
                                        <span className="font-semibold text-foreground">{apelacion.abogado?.nombre || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">F. Asignación Abogado:</span>{' '}
                                        <span className="font-medium">{formatDisplayDate(apelacion.fechaAsignacion)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Revisado por:</span>{' '}
                                        <span className="font-semibold text-foreground">{apelacion.revisor?.nombre || '— Sin revisor —'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">F. Asignación Revisor:</span>{' '}
                                        <span className="font-medium">{formatDisplayDate(apelacion.fechaRevisor)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Fecha pase a Resuelto:</span>{' '}
                                        <span className="font-medium text-blue-700">{formatDisplayDate(apelacion.fechaCambioResuelto)}</span>
                                    </div>
                                </div>
                            </div>

                            {(apelacion.numeroResolucion || apelacion.fechaResolucion || apelacion.resultadoResolucion || apelacion.documentoAtencion || apelacion.cargos) && (
                                <div className="border rounded-lg p-3 bg-card space-y-2">
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolución y Cierre
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {apelacion.numeroResolucion && (
                                            <div>
                                                <span className="text-muted-foreground">Nº Resolución:</span>{' '}
                                                <span className="font-semibold">{apelacion.numeroResolucion}</span>
                                            </div>
                                        )}
                                        {apelacion.fechaResolucion && (
                                            <div>
                                                <span className="text-muted-foreground">Fecha Resolución:</span>{' '}
                                                <span>{formatDisplayDate(apelacion.fechaResolucion)}</span>
                                            </div>
                                        )}
                                        {apelacion.resultadoResolucion && (
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground">Resultado:</span>{' '}
                                                <span className="font-medium text-emerald-700">
                                                    {RESULTADOS_RESOLUCION.find(r => r.value === apelacion.resultadoResolucion)?.label || apelacion.resultadoResolucion}
                                                </span>
                                            </div>
                                        )}
                                        {apelacion.documentoAtencion && (
                                            <div>
                                                <span className="text-muted-foreground">Doc. Atención:</span>{' '}
                                                <span>{apelacion.documentoAtencion}</span>
                                            </div>
                                        )}
                                        {apelacion.cargos && (
                                            <div>
                                                <span className="text-muted-foreground">Cargos:</span>{' '}
                                                <span>{apelacion.cargos}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {apelacion.observaciones && (
                                <div className="text-xs text-muted-foreground border-t pt-2">
                                    <span className="font-semibold text-foreground">Observaciones: </span>
                                    {apelacion.observaciones}
                                </div>
                            )}
                        </div>

                        <AlertDialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cerrar Ficha
                            </Button>
                        </AlertDialogFooter>
                    </>
                )}

                {/* 👤 MODAL 1: CAMBIAR / REASIGNAR ABOGADO */}
                {tipoModal === 'abogado' && (
                    <form onSubmit={handleSubmit}>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-lg">
                                <UserCheck className="h-5 w-5 text-blue-600" />
                                Reasignar Abogado Responsable
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Modificar el profesional asignado a la elaboración del proyecto de resolución.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {renderTarjetaResumenCaso()}

                        <div className="space-y-4 my-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="abogadoSelect">Abogado Asignado *</Label>
                                <Select value={abogadoId} onValueChange={setAbogadoId}>
                                    <SelectTrigger id="abogadoSelect" className="w-full">
                                        <SelectValue placeholder="Seleccione abogado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {abogadosActivos.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="fechaAsig">Fecha de Asignación *</Label>
                                <Input
                                    id="fechaAsig"
                                    type="date"
                                    value={fechaAsignacion}
                                    onChange={(e) => setFechaAsignacion(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="obsAbogado">Observaciones (Opcional)</Label>
                                <Textarea
                                    id="obsAbogado"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Motivo de la reasignación o indicaciones especiales..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" onClick={onClose} disabled={saving}>
                                Cancelar
                            </AlertDialogCancel>
                            <Button type="submit" disabled={saving} className="gap-2">
                                <Save className="h-4 w-4" />
                                {saving ? 'Guardando...' : 'Guardar Abogado'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                )}

                {/* 🔍 MODAL 2: PASAR A REVISOR */}
                {tipoModal === 'revisor' && (
                    <form onSubmit={handleSubmit}>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-lg">
                                <Search className="h-5 w-5 text-purple-600" />
                                Derivar a Revisor (Control de Calidad)
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Asignar el revisor que validará el borrador del proyecto de resolución.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {renderTarjetaResumenCaso()}

                        <div className="space-y-4 my-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="fechaPaseRes">Fecha pase a Resuelto (Entrega del borrador)</Label>
                                <Input
                                    id="fechaPaseRes"
                                    type="date"
                                    value={fechaCambioResuelto}
                                    onChange={(e) => setFechaCambioResuelto(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Fecha en que el profesional concluyó la atención y entregó el proyecto.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="revisorSelect">Revisado por *</Label>
                                <Select value={revisorId} onValueChange={setRevisorId}>
                                    <SelectTrigger id="revisorSelect" className="w-full">
                                        <SelectValue placeholder="Seleccione un revisor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__ninguno__">— Seleccione revisor —</SelectItem>
                                        {revisoresActivos.map((r) => {
                                            const carga = cargaRevisores.find(c => c.revisorId === r.id)
                                            const total = carga ? carga.totalCasos : 0
                                            return (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.nombre} ({total} {total === 1 ? 'caso' : 'casos'})
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="fechaRev">Fecha Asignación Revisor *</Label>
                                    {fechaCambioResuelto && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setFechaRevisor(fechaCambioResuelto)}
                                                className="text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition-colors"
                                            >
                                                Mismo día
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    try {
                                                        const d = new Date(`${fechaCambioResuelto}T12:00:00`)
                                                        d.setDate(d.getDate() + 1)
                                                        setFechaRevisor(d.toISOString().split('T')[0])
                                                    } catch {}
                                                }}
                                                className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded transition-colors"
                                            >
                                                +1 día
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <Input
                                    id="fechaRev"
                                    type="date"
                                    value={fechaRevisor}
                                    onChange={(e) => setFechaRevisor(e.target.value)}
                                    required
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Fecha en que se derivó el expediente al revisor.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="obsRevisor">Observaciones para el Revisor (Opcional)</Label>
                                <Textarea
                                    id="obsRevisor"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Instrucciones o notas para la revisión..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" onClick={onClose} disabled={saving}>
                                Cancelar
                            </AlertDialogCancel>
                            <Button type="submit" disabled={saving} className="gap-2">
                                <Save className="h-4 w-4" />
                                {saving ? 'Guardando...' : 'Asignar Revisor'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                )}

                {/* ⚖️ MODAL 3: PASAR A RESUELTO */}
                {tipoModal === 'resuelto' && (
                    <form onSubmit={handleSubmit}>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-lg">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                Pasar a Resuelto (Resolución Oficial)
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Registrar los datos de la resolución oficial emitida por la Dirección.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {renderTarjetaResumenCaso()}

                        <div className="space-y-4 my-4">
                            <div className="p-2.5 rounded-md bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
                                <span className="font-semibold text-blue-900">Estado resultante:</span>
                                <Badge variant="default" className="shadow-xs font-bold">
                                    RESUELTO
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="numResolucion">Nº de Resolución *</Label>
                                    <Input
                                        id="numResolucion"
                                        placeholder="Ej: RD N° 0045-2026-MIMP-DGNNA"
                                        value={numeroResolucion}
                                        onChange={(e) => setNumeroResolucion(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="fResolucion">Fecha de resolución *</Label>
                                    <Input
                                        id="fResolucion"
                                        type="date"
                                        value={fechaResolucion}
                                        onChange={(e) => setFechaResolucion(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="resResolucion">Resultado de la resolución *</Label>
                                <Select value={resultadoResolucion} onValueChange={setResultadoResolucion}>
                                    <SelectTrigger id="resResolucion" className="w-full">
                                        <SelectValue placeholder="Seleccione un resultado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__ninguno__">— Sin resultado registrado —</SelectItem>
                                        {RESULTADOS_RESOLUCION.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="fPaseResConfirm">Fecha pase a Resuelto (Confirmación)</Label>
                                <Input
                                    id="fPaseResConfirm"
                                    type="date"
                                    value={fechaCambioResuelto}
                                    onChange={(e) => setFechaCambioResuelto(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="obsResuelto">Observaciones (Opcional)</Label>
                                <Textarea
                                    id="obsResuelto"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Notas del pronunciamiento..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" onClick={onClose} disabled={saving}>
                                Cancelar
                            </AlertDialogCancel>
                            <Button type="submit" disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Save className="h-4 w-4" />
                                {saving ? 'Guardando...' : 'Pasar a Resuelto'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                )}

                {/* 📬 MODAL 4: PASAR A ATENDIDO */}
                {tipoModal === 'atendido' && (
                    <form onSubmit={handleSubmit}>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-lg">
                                <Send className="h-5 w-5 text-emerald-600" />
                                Pasar a Atendido (Cierre y Notificación)
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Registrar el oficio de atención y cargos de notificación para el archivo del caso.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {renderTarjetaResumenCaso()}

                        <div className="space-y-4 my-4">
                            <div className="p-2.5 rounded-md bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                                <span className="font-semibold text-emerald-900">Estado resultante:</span>
                                <Badge variant="atendido" className="shadow-xs font-bold">
                                    ATENDIDO
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="docAtencion">Documento Atención *</Label>
                                    <Input
                                        id="docAtencion"
                                        placeholder="Ej: Oficio N° 0120-2026-MIMP-DGNNA"
                                        value={documentoAtencion}
                                        onChange={(e) => setDocumentoAtencion(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="cargosSelect">Cargos de Notificación *</Label>
                                    <Select value={cargos} onValueChange={setCargos}>
                                        <SelectTrigger id="cargosSelect" className="w-full">
                                            <SelectValue placeholder="Seleccione estado de cargos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                                            <SelectItem value="Recibidos">Recibidos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="obsAtendido">Observaciones Finales / Archivo (Opcional)</Label>
                                <Textarea
                                    id="obsAtendido"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Detalles sobre entrega a mesa de partes o devolución a UPE..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" onClick={onClose} disabled={saving}>
                                Cancelar
                            </AlertDialogCancel>
                            <Button type="submit" disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                <Save className="h-4 w-4" />
                                {saving ? 'Guardando...' : 'Pasar a Atendido'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                )}
            </AlertDialogContent>
        </AlertDialog>
    )
}
