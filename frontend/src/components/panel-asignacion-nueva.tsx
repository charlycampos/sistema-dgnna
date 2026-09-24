'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AsignacionAutomaticaPreview, ComplejidadJuridica } from '@/types'

const colores = ['border-blue-600 bg-blue-50', 'border-green-600 bg-green-50', 'border-amber-600 bg-amber-50', 'border-red-600 bg-red-50']

export function PanelAsignacionNueva({ preview, complejidades, loading }: { preview: AsignacionAutomaticaPreview | null, complejidades: ComplejidadJuridica[], loading: boolean }) {
  if (loading) return <Card><CardContent className="p-5 text-sm text-muted-foreground">Calculando asignación…</CardContent></Card>
  if (!preview) return <Card><CardContent className="p-5 text-sm text-muted-foreground">Complete complejidad jurídica y folios para ver la asignación.</CardContent></Card>
  const nombre = (id: string) => complejidades.find(c => c.id === id)?.nombre || id
  return <Card className="sticky top-4 overflow-hidden"><CardHeader className="bg-green-50 border-b border-green-200"><CardTitle className="text-base text-green-900">Asignación automática · sin puntos</CardTitle><CardDescription>Propuesta: <strong>{preview.abogadoNombre}</strong> · {preview.criterio}</CardDescription></CardHeader><CardContent className="p-4 space-y-4">
    <div className="text-xs text-muted-foreground">Secuencia nueva #{preview.siguienteSecuencia}. El backend valida esta propuesta al guardar.</div>
    {preview.abogados.map((item, index) => <div key={item.abogado.id} className={`rounded-lg border p-3 ${item.abogado.id === preview.abogadoId ? 'border-green-400 bg-green-50' : ''}`}>
      <div className="flex justify-between gap-2"><strong className="text-sm">{item.abogado.nombre}</strong><span className="font-bold">{item.total}</span></div>
      <div className="mt-2 flex min-h-9 items-end overflow-x-auto" aria-label={`Últimas asignaciones de ${item.abogado.nombre}`}>
        {item.ultimasAsignaciones.length ? item.ultimasAsignaciones.map(e => <span key={e.secuencia} title={`#${e.secuencia} · ${nombre(e.complejidadId)} · ${e.folios} folios`} className={`-ml-1 inline-grid h-8 min-w-8 place-items-center rounded-full border-4 text-[9px] font-bold ${colores[complejidades.findIndex(c => c.id === e.complejidadId) % colores.length]} ${e.esMayor500 ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>#{e.secuencia}</span>) : <span className="text-xs text-muted-foreground">Pila vacía</span>}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>Últimas {Math.min(10, item.total)} de {item.total}</span><span>&gt;500: {item.mayores500}</span></div>
    </div>)}
  </CardContent></Card>
}
