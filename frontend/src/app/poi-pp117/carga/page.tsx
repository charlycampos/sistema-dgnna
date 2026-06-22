'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'
import { Upload, Trash2, FileSpreadsheet, CheckCircle2 } from 'lucide-react'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const MESES_CORTO = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']

interface CargaMes {
  id: string; mes: number; anio: number; mesNombre: string
  nombreArchivo: string; totalFilas: number; cargadoPor: string; createdAt: string
}

export default function PoiCargaPage() {
  const router = useRouter()
  const { me, loading, hasAccess, canWrite } = useMe()
  const [cargas, setCargas] = useState<CargaMes[]>([])
  const [cargandoMeses, setCargandoMeses] = useState(true)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mesSubida, setMesSubida] = useState('')
  const [anioSubida, setAnioSubida] = useState(new Date().getFullYear().toString())
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    if (!loading && me && !hasAccess('poi-pp117')) router.replace('/menu')
  }, [me, loading, hasAccess, router])

  const fetchMeses = useCallback(async () => {
    setCargandoMeses(true)
    try {
      const res = await fetch('/api/poi-pp117/meses')
      if (res.ok) setCargas(await res.json())
    } catch { toast.error('Error al cargar los períodos disponibles') }
    finally { setCargandoMeses(false) }
  }, [])

  useEffect(() => { fetchMeses() }, [fetchMeses])

  const handleSubir = async () => {
    if (!archivo || !mesSubida || !anioSubida) {
      toast.error('Selecciona el archivo, mes y año')
      return
    }
    const mesNum = parseInt(mesSubida)
    const anioNum = parseInt(anioSubida)
    const yaExiste = cargas.some(c => c.mes === mesNum && c.anio === anioNum)
    if (yaExiste) {
      const ok = confirm(`Ya existe una carga para ${MESES[mesNum - 1]} ${anioNum}. ¿Deseas reemplazarla?`)
      if (!ok) return
    }

    setSubiendo(true)
    const form = new FormData()
    form.append('archivo', archivo)
    try {
      const url = `/api/poi-pp117/cargar?mes=${mesNum}&anio=${anioNum}&reemplazar=${yaExiste}`
      const res = await fetch(url, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.detail ?? 'Error al cargar el archivo'); return }
      toast.success(`${data.mensaje} — ${data.filasGuardadas} registros guardados`)
      setArchivo(null)
      ;(document.getElementById('input-archivo') as HTMLInputElement).value = ''
      await fetchMeses()
    } catch { toast.error('Error al subir el archivo') }
    finally { setSubiendo(false) }
  }

  const handleEliminar = async (carga: CargaMes) => {
    if (!confirm(`¿Eliminar la carga de ${carga.mesNombre} ${carga.anio}?`)) return
    const res = await fetch(`/api/poi-pp117/carga/${carga.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Carga eliminada'); fetchMeses() }
    else toast.error('Error al eliminar')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">

        <header className="border-b bg-card sticky top-0 z-30">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold">Carga mensual</h1>
            <p className="text-muted-foreground text-sm">Sube el archivo DATA-POI para procesarlo y guardarlo en el sistema</p>
          </div>
        </header>

        <main className="px-6 py-6 space-y-6">

          {/* Períodos cargados */}
          <Card>
            <CardHeader>
              <CardTitle>Períodos disponibles</CardTitle>
              <CardDescription>Archivos DATA-POI ya procesados en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {cargandoMeses ? (
                <div className="py-6 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : cargas.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay archivos cargados aún</p>
                  <p className="text-sm mt-1">Usa el formulario de abajo para subir el primer archivo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-semibold">Período</th>
                        <th className="px-4 py-2 text-left font-semibold">Archivo</th>
                        <th className="px-4 py-2 text-left font-semibold">Registros</th>
                        <th className="px-4 py-2 text-left font-semibold">Cargado por</th>
                        <th className="px-4 py-2 text-left font-semibold">Fecha carga</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargas.map(c => (
                        <tr key={c.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-semibold">
                              {c.mesNombre} {c.anio}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate" title={c.nombreArchivo}>
                            {c.nombreArchivo}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-blue-600 font-semibold">{c.totalFilas?.toLocaleString()}</span>
                            <span className="text-muted-foreground text-xs ml-1">filas</span>
                          </td>
                          <td className="px-4 py-3">{c.cargadoPor ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PE') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {canWrite('poi-pp117') && (
                              <Button variant="ghost" size="sm" onClick={() => handleEliminar(c)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de carga */}
          {canWrite('poi-pp117') && (
            <Card>
              <CardHeader>
                <CardTitle>Cargar nuevo archivo</CardTitle>
                <CardDescription>
                  Sube el archivo <strong>DATA-POI PLIEGO MES AÑO.xlsx</strong>.
                  Se usa la hoja <code className="bg-muted px-1 rounded text-xs">POI_Por_ActividadOperativaAnual</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Mes de evaluación</Label>
                    <Select value={mesSubida} onValueChange={setMesSubida}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Año</Label>
                    <Select value={anioSubida} onValueChange={setAnioSubida}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(a => (
                          <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Archivo DATA-POI (.xlsx)</Label>
                    <input
                      id="input-archivo"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:text-xs file:bg-muted file:cursor-pointer"
                    />
                  </div>
                </div>

                {archivo && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Archivo listo: <strong>{archivo.name}</strong>
                  </div>
                )}

                <Button onClick={handleSubir} disabled={subiendo || !archivo || !mesSubida} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {subiendo ? 'Procesando...' : 'Procesar y Guardar'}
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
