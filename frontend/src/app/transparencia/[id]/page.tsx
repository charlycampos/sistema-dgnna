'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transparenciaSchema, TransparenciaFormValues } from '@/lib/validations'
import { clasificarAlerta, diasHabilesRestantes } from '@/lib/calcular-plazo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ArrowLeft, Pencil, Save, X, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'
import type { TransparenciaRegistro } from '@/types'

const DIRECCIONES = ['DPNNA', 'DSLD', 'DA', 'DPE', 'DGNNA'] as const
const CATEGORIAS  = ['Estadística', 'Expediente', 'Informe', 'Resolución', 'Otro']

const toDateValue = (v: unknown): string => {
  if (!v) return ''
  try { return new Date(v as string).toISOString().split('T')[0] } catch { return '' }
}
const fromDateValue = (s: string): Date | null => {
  if (!s) return null
  const d = new Date(s); return isNaN(d.getTime()) ? null : d
}
const formatFecha = (f: unknown) => {
  if (!f) return '—'
  try { return format(new Date(f as string), 'dd/MM/yyyy', { locale: es }) } catch { return '—' }
}

export default function TransparenciaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const [id, setId] = useState('')
  const [registro, setRegistro] = useState<TransparenciaRegistro | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving]     = useState(false)
  const { canWrite, me }        = useMe()

  useEffect(() => {
    params.then(p => { setId(p.id); setEditMode(searchParams.get('edit') === 'true') })
  }, [params, searchParams])

  useEffect(() => { if (id) fetchRegistro() }, [id])

  const form = useForm<TransparenciaFormValues>({
    resolver: zodResolver(transparenciaSchema) as any,
  })

  const fetchRegistro = async () => {
    try {
      const res  = await fetch(`/api/transparencia/${id}`)
      const data = await res.json()
      if (!res.ok) { toast.error('No se pudo cargar el registro'); return }
      setRegistro(data)
      form.reset({
        numeroExpediente:   data.numeroExpediente,
        fechaIngreso:       data.fechaIngreso ? new Date(data.fechaIngreso) : new Date(),
        documentoIngreso:   data.documentoIngreso ?? '',
        direccion:          data.direccion,
        estado:             data.estado,
        fechaAtencion:      data.fechaAtencion ? new Date(data.fechaAtencion) : null,
        asunto:             data.asunto,
        documentoRespuesta: data.documentoRespuesta ?? '',
        categoria:          data.categoria ?? '',
        observaciones:      data.observaciones ?? '',
      })
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: TransparenciaFormValues) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        fechaIngreso:  data.fechaIngreso instanceof Date ? data.fechaIngreso.toISOString() : data.fechaIngreso,
        fechaAtencion: data.fechaAtencion instanceof Date ? data.fechaAtencion.toISOString() : data.fechaAtencion ?? null,
      }
      const res = await fetch(`/api/transparencia/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.detail ?? 'Error al guardar'); return }
      toast.success('Registro actualizado')
      setRegistro(json)
      setEditMode(false)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  if (!registro) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Registro no encontrado.</p>
    </div>
  )

  const alerta = clasificarAlerta(registro.plazoVencimiento, registro.estado)
  const diasRestantes = registro.plazoVencimiento
    ? diasHabilesRestantes(new Date(registro.plazoVencimiento))
    : null

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">

        <header className="border-b bg-card sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center gap-4">
            <Link href="/transparencia">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{registro.numeroExpediente}</h1>
              <p className="text-muted-foreground text-sm">Detalle del pedido de información</p>
            </div>
            {canWrite('transparencia') && !editMode && (
              <Button onClick={() => setEditMode(true)} variant="outline" className="gap-2">
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
          </div>
        </header>

        <main className="px-6 py-6 max-w-3xl space-y-6">

          {/* Alerta de plazo */}
          {alerta && alerta !== 'normal' && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
              alerta === 'vencido' || alerta === 'urgente'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {alerta === 'vencido' || alerta === 'urgente'
                ? <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                : <Clock className="h-5 w-5 flex-shrink-0" />}
              <div>
                <p className="font-semibold">
                  {alerta === 'vencido'  && `Plazo vencido hace ${Math.abs(diasRestantes!)} día(s) hábil(es)`}
                  {alerta === 'urgente'  && 'El plazo vence hoy'}
                  {alerta === 'proximo'  && `Plazo próximo a vencer: ${diasRestantes} día(s) hábil(es)`}
                </p>
                <p className="text-sm">
                  Fecha límite: {formatFecha(registro.plazoVencimiento)} — Plazo legal: 10 días hábiles
                </p>
              </div>
            </div>
          )}

          {editMode ? (
            /* ── MODO EDICIÓN ── */
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Editar Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <FormField control={form.control} name="numeroExpediente" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° Expediente *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="fechaIngreso" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Ingreso *</FormLabel>
                        <FormControl>
                          <Input type="date" value={toDateValue(field.value)} onChange={e => field.onChange(fromDateValue(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="direccion" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {DIRECCIONES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="documentoIngreso" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documento de Ingreso</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="estado" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="En Proceso">En Proceso</SelectItem>
                            <SelectItem value="Atendido">Atendido</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="asunto" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Asunto *</FormLabel>
                        <FormControl><Textarea rows={3} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="fechaAtencion" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Atención</FormLabel>
                        <FormControl>
                          <Input type="date" value={toDateValue(field.value)} onChange={e => field.onChange(fromDateValue(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="documentoRespuesta" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documento de Respuesta</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="observaciones" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observaciones</FormLabel>
                        <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button type="submit" disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />{saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            /* ── MODO VISTA ── */
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Datos del Pedido</CardTitle>
                    <Badge variant={
                      registro.estado === 'Pendiente' ? 'secondary' :
                      registro.estado === 'En Proceso' ? 'default' : 'outline'
                    }>{registro.estado}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div><dt className="text-muted-foreground font-medium">N° Expediente</dt><dd className="font-semibold mt-0.5">{registro.numeroExpediente}</dd></div>
                    <div><dt className="text-muted-foreground font-medium">Fecha de Ingreso</dt><dd className="mt-0.5">{formatFecha(registro.fechaIngreso)}</dd></div>
                    <div><dt className="text-muted-foreground font-medium">Dirección</dt><dd className="mt-0.5"><Badge variant="outline">{registro.direccion}</Badge></dd></div>
                    <div><dt className="text-muted-foreground font-medium">Categoría</dt><dd className="mt-0.5">{registro.categoria || '—'}</dd></div>
                    <div><dt className="text-muted-foreground font-medium">Documento de Ingreso</dt><dd className="mt-0.5">{registro.documentoIngreso || '—'}</dd></div>
                    <div>
                      <dt className="text-muted-foreground font-medium">Plazo Vencimiento</dt>
                      <dd className="mt-0.5 font-semibold">
                        {formatFecha(registro.plazoVencimiento)}
                        {diasRestantes !== null && registro.estado !== 'Atendido' && (
                          <span className={`ml-2 text-xs font-normal ${diasRestantes < 0 ? 'text-red-600' : diasRestantes <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                            ({diasRestantes < 0 ? `vencido hace ${Math.abs(diasRestantes)}d` : `${diasRestantes}d háb.`})
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="md:col-span-2"><dt className="text-muted-foreground font-medium">Asunto</dt><dd className="mt-0.5">{registro.asunto}</dd></div>
                    {registro.observaciones && (
                      <div className="md:col-span-2"><dt className="text-muted-foreground font-medium">Observaciones</dt><dd className="mt-0.5">{registro.observaciones}</dd></div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Atención y Respuesta</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div><dt className="text-muted-foreground font-medium">Fecha de Atención</dt><dd className="mt-0.5">{formatFecha(registro.fechaAtencion)}</dd></div>
                    <div><dt className="text-muted-foreground font-medium">Documento de Respuesta</dt><dd className="mt-0.5">{registro.documentoRespuesta || '—'}</dd></div>
                    <div><dt className="text-muted-foreground font-medium">Creado por</dt><dd className="mt-0.5">{registro.creadoPor || '—'}</dd></div>
                    <div><dt className="text-muted-foreground font-medium">Fecha Registro</dt><dd className="mt-0.5">{formatFecha(registro.createdAt)}</dd></div>
                  </dl>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
