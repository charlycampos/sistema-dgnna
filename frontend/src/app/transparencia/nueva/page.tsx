'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transparenciaSchema, TransparenciaFormValues } from '@/lib/validations'
import { calcularPlazoHabiles } from '@/lib/calcular-plazo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ArrowLeft, Save, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMe } from '@/lib/use-me'

const DIRECCIONES = ['DPNNA', 'DSLD', 'DA', 'DPE', 'DGNNA'] as const
const CATEGORIAS  = ['Estadística', 'Expediente', 'Informe', 'Resolución', 'Otro']

const toDateValue = (v: unknown): string => {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0]
  return ''
}
const fromDateValue = (s: string): Date | null => {
  if (!s || s.length < 10) return null
  const d = new Date(s); return isNaN(d.getTime()) ? null : d
}

export default function NuevaTransparenciaPage() {
  const router = useRouter()
  const { me, canWrite, loading: meLoading } = useMe()
  const [saving, setSaving] = useState(false)
  const [plazoCalculado, setPlazoCalculado] = useState<Date | null>(null)

  const form = useForm<TransparenciaFormValues>({
    resolver: zodResolver(transparenciaSchema) as any,
    defaultValues: {
      numeroExpediente:   '',
      fechaIngreso:       new Date(),
      documentoIngreso:   '',
      direccion:          undefined,
      estado:             'Pendiente',
      fechaAtencion:      null,
      asunto:             '',
      documentoRespuesta: '',
      categoria:          '',
      observaciones:      '',
    },
  })

  const fechaIngresoWatch = form.watch('fechaIngreso')

  useEffect(() => {
    if (fechaIngresoWatch) {
      setPlazoCalculado(calcularPlazoHabiles(new Date(fechaIngresoWatch), 10))
    }
  }, [fechaIngresoWatch])

  const onSubmit = async (data: TransparenciaFormValues) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        fechaIngreso:  data.fechaIngreso instanceof Date ? data.fechaIngreso.toISOString() : data.fechaIngreso,
        fechaAtencion: data.fechaAtencion instanceof Date ? data.fechaAtencion.toISOString() : data.fechaAtencion ?? null,
        creadoPor: me?.nombre ?? null,
      }
      const res = await fetch('/api/transparencia', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.detail ?? 'Error al guardar')
        return
      }
      toast.success('Pedido registrado correctamente')
      router.push('/transparencia')
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setSaving(false)
    }
  }

  if (!meLoading && me && !canWrite('transparencia')) {
    router.replace('/transparencia'); return null
  }

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
              <h1 className="text-xl font-bold">Nuevo Pedido — Ley de Transparencia</h1>
              <p className="text-muted-foreground text-sm">Plazo de respuesta: 10 días hábiles</p>
            </div>
          </div>
        </header>

        <main className="px-6 py-6 max-w-3xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Datos del pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Datos del Pedido</CardTitle>
                  <CardDescription>Información principal del pedido de información</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <FormField control={form.control} name="numeroExpediente" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Expediente *</FormLabel>
                      <FormControl><Input placeholder="Ej. EXP-2024-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="fechaIngreso" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Ingreso *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={toDateValue(field.value)}
                          onChange={e => field.onChange(fromDateValue(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Plazo calculado */}
                  {plazoCalculado && (
                    <div className="md:col-span-2 flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <CalendarClock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Fecha límite de respuesta</p>
                        <p className="text-lg font-bold text-blue-700">
                          {format(plazoCalculado, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                        <p className="text-xs text-blue-600">10 días hábiles desde la fecha de ingreso</p>
                      </div>
                    </div>
                  )}

                  <FormField control={form.control} name="direccion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar dirección" /></SelectTrigger></FormControl>
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
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger></FormControl>
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
                      <FormControl><Input placeholder="Ej. OFICIO-2024-123" {...field} value={field.value ?? ''} /></FormControl>
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
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del pedido de información..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </CardContent>
              </Card>

              {/* Atención */}
              <Card>
                <CardHeader>
                  <CardTitle>Atención y Respuesta</CardTitle>
                  <CardDescription>Datos de la respuesta (completar al atender)</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <FormField control={form.control} name="fechaAtencion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Atención</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={toDateValue(field.value)}
                          onChange={e => field.onChange(fromDateValue(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="documentoRespuesta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento de Respuesta</FormLabel>
                      <FormControl><Input placeholder="Ej. INFORME-2024-045" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="observaciones" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observaciones</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observaciones adicionales..." rows={3} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Guardando...' : 'Registrar Pedido'}
                </Button>
                <Link href="/transparencia">
                  <Button type="button" variant="outline">Cancelar</Button>
                </Link>
              </div>

            </form>
          </Form>
        </main>
      </div>
    </div>
  )
}
