'use client'

import { AlertCircle, AlertTriangle, CheckCircle2, LoaderCircle, RotateCw, Scale } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AsignacionAutomaticaPreview, ComplejidadJuridica } from '@/types'

interface PanelAsignacionNuevaProps {
  preview: AsignacionAutomaticaPreview | null
  complejidades: ComplejidadJuridica[]
  complejidadId?: string
  folios?: number
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function PanelAsignacionNueva({ preview, complejidades, complejidadId, folios, loading, error, onRetry }: PanelAsignacionNuevaProps) {
  const complejidad = complejidades.find((item) => item.id === complejidadId)
  const foliosValidos = Number.isInteger(folios) && (folios ?? 0) >= 1
  let datoPendiente = 'Seleccione la complejidad jurídica e ingrese la cantidad de folios.'
  if (complejidadId && !foliosValidos) datoPendiente = 'Ingrese una cantidad de folios válida.'
  if (!complejidadId && foliosValidos) datoPendiente = 'Seleccione la complejidad jurídica.'

  if (loading) return <Card className="sticky top-4" aria-live="polite" aria-busy="true"><CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Calculando la distribución de la nueva modalidad…</CardContent></Card>

  if (error) return (
    <Card className="sticky top-4 overflow-hidden border-red-300">
      <CardHeader className="border-b border-red-200 bg-red-50">
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700"><AlertCircle className="h-4 w-4" aria-hidden="true" /></span><div><CardTitle className="text-base text-red-950">No se pudo calcular la asignación</CardTitle><CardDescription className="mt-1 text-red-800" role="alert">{error}</CardDescription></div></div>
      </CardHeader>
      <CardContent className="p-5"><p className="mb-3 text-sm text-muted-foreground">No se asignará una especialista hasta obtener una propuesta válida.</p><Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar cálculo</Button></CardContent>
    </Card>
  )

  if (!preview) return (
    <Card className="sticky top-4 overflow-hidden border-amber-300" aria-live="polite">
      <CardHeader className="border-b border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700"><AlertTriangle className="h-4 w-4" aria-hidden="true" /></span><div><CardTitle className="text-base text-amber-950">Asignación · Nueva modalidad</CardTitle><CardDescription className="mt-1 text-amber-800">Vista previa pendiente</CardDescription></div></div>
      </CardHeader>
      <CardContent className="p-5"><p className="text-sm font-medium text-amber-950">{datoPendiente}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Al completar los datos se mostrará la especialista propuesta y la distribución vigente de esta modalidad.</p></CardContent>
    </Card>
  )

  const turnoReferencia = preview.abogados.find((item) => item.abogado.id === preview.turnoReferenciaId)?.abogado.nombre
  const complejidadNombre = complejidad?.nombre ?? complejidadId ?? 'Complejidad seleccionada'
  return (
    <Card className="sticky top-4 overflow-hidden">
      <CardHeader className="border-b bg-card pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3"><span className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-700"><Scale className="h-4 w-4" aria-hidden="true" /></span><div><CardTitle className="text-base">Asignación · Nueva modalidad</CardTitle><CardDescription className="mt-1">Secuencia #{preview.siguienteSecuencia}</CardDescription></div></div>
          <span className="whitespace-nowrap rounded-full border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-800">Vista previa</span>
        </div>
        <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-3" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Especialista propuesta</div>
          <p className="mt-1 text-lg font-bold text-green-950">{preview.abogadoNombre}</p><p className="mt-1 text-xs text-muted-foreground">Criterio: {preview.criterio}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2" aria-label="Datos considerados para la asignación">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{complejidadNombre}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{folios} folios</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${preview.esMayor500 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{preview.esMayor500 ? 'Expediente voluminoso' : 'Volumen estándar'}</span>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <div className="border-b bg-slate-50 px-3 py-2"><p className="text-xs font-semibold text-slate-700">Distribución vigente</p></div>
          <div><table className="w-full text-xs"><caption className="sr-only">Carga de especialistas en la nueva modalidad</caption><thead className="text-muted-foreground"><tr className="border-b"><th scope="col" className="px-3 py-2 text-left font-medium">Especialista</th><th scope="col" className="px-1 py-2 text-center font-medium">Total</th><th scope="col" className="px-1 py-2 text-center font-medium">Complejidad</th><th scope="col" className="px-2 py-2 text-center font-medium">+500</th></tr></thead>
            <tbody>{preview.abogados.map((item) => { const propuesta = item.abogado.id === preview.abogadoId; return <tr key={item.abogado.id} className={`border-b last:border-0 ${propuesta ? 'bg-green-50' : ''}`}><th scope="row" className="px-3 py-2.5 text-left font-medium"><span className="flex items-center gap-2">{propuesta && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Especialista propuesta" />}<span className={propuesta ? 'font-semibold text-green-900' : ''}>{item.abogado.nombre}</span></span></th><td className="px-2 py-2.5 text-center font-semibold">{item.total}</td><td className="px-2 py-2.5 text-center font-semibold">{item.porComplejidad[complejidadId ?? ''] ?? 0}</td><td className="px-3 py-2.5 text-center font-semibold">{item.mayores500}</td></tr> })}</tbody>
          </table></div>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600"><RotateCw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><p><span className="font-semibold text-slate-700">Turno circular de referencia:</span> {turnoReferencia ?? 'Sin asignaciones previas'}.</p></div>
        <a href="/apelaciones/asignacion" target="_blank" rel="noreferrer" aria-label="Ver tablero completo de la nueva modalidad; abre en una pestaña nueva" className="block text-center text-xs font-semibold text-blue-600 underline hover:text-blue-800">Ver tablero completo de la nueva modalidad ↗</a>
      </CardContent>
    </Card>
  )
}
