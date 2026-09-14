'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle, Building2, CheckCircle2, Clock, MapPin, Phone, RefreshCw, Search,
} from 'lucide-react'

interface Institucion {
  id: string
  nombre: string
  tipo: string
  direccion?: string | null
  telefono?: string | null
  horario?: string | null
  acreditacion?: string | null
}

interface Cobertura {
  instituciones: Institucion[]
  distritos: Record<string, number[]>
  totalesDep: Record<string, number>
  totalesProv: Record<string, number>
}

interface Opcion { codigo: string; nombre: string }
interface DistritoOpcion extends Opcion { provincia: string }

const TODOS = 'todos'

function badgeAcreditacion(valor?: string | null) {
  if (!valor) return null
  const clase = valor === 'Acreditada'
    ? 'bg-green-100 text-green-700 hover:bg-green-100'
    : valor === 'Inoperativa'
      ? 'bg-red-100 text-red-700 hover:bg-red-100'
      : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
  return <Badge className={clase}>{valor}</Badge>
}

export default function Servicios() {
  const [cobertura, setCobertura] = useState<Cobertura | null>(null)
  const [departamentos, setDepartamentos] = useState<Opcion[]>([])
  const [provincias, setProvincias] = useState<Opcion[]>([])
  const [distritos, setDistritos] = useState<DistritoOpcion[]>([])
  const [departamento, setDepartamento] = useState('')
  const [provincia, setProvincia] = useState(TODOS)
  const [distrito, setDistrito] = useState(TODOS)
  const [tipo, setTipo] = useState(TODOS)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    Promise.all([
      fetch('/api/mapa/cobertura').then(r => {
        if (!r.ok) throw new Error('No se pudo cargar la cobertura de servicios')
        return r.json() as Promise<Cobertura>
      }),
      fetch('/api/mapa/ubigeo/departamentos').then(r => {
        if (!r.ok) throw new Error('No se pudo cargar el catálogo territorial')
        return r.json() as Promise<Opcion[]>
      }),
    ]).then(([datos, deps]) => {
      if (!activo) return
      setCobertura(datos)
      setDepartamentos(deps)
    }).catch((e: unknown) => {
      if (activo) setError(e instanceof Error ? e.message : 'Ocurrió un error al cargar los servicios')
    }).finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [intento])

  useEffect(() => {
    setProvincia(TODOS)
    setDistrito(TODOS)
    setProvincias([])
    setDistritos([])
    if (!departamento) return
    fetch(`/api/mapa/ubigeo/provincias?dep=${departamento}`)
      .then(r => r.ok ? r.json() as Promise<Opcion[]> : [])
      .then(setProvincias).catch(() => setProvincias([]))
  }, [departamento])

  useEffect(() => {
    setDistrito(TODOS)
    setDistritos([])
    if (!departamento || provincia === TODOS) return
    fetch(`/api/mapa/ubigeo/distritos?dep=${departamento}&prov=${provincia}`)
      .then(r => r.ok ? r.json() as Promise<DistritoOpcion[]> : [])
      .then(setDistritos).catch(() => setDistritos([]))
  }, [departamento, provincia])

  const indicesAmbito = useMemo(() => {
    const indices = new Set<number>()
    if (!cobertura || !departamento) return indices
    const prefijo = distrito !== TODOS
      ? distrito
      : provincia !== TODOS ? departamento + provincia : departamento
    Object.entries(cobertura.distritos).forEach(([ubigeo, ids]) => {
      if (ubigeo.startsWith(prefijo)) ids.forEach(id => indices.add(id))
    })
    return indices
  }, [cobertura, departamento, provincia, distrito])

  const institucionesAmbito = useMemo(() => {
    if (!cobertura) return []
    const unicas = new Map<string, Institucion>()
    indicesAmbito.forEach(indice => {
      const institucion = cobertura.instituciones[indice]
      if (institucion) unicas.set(institucion.id, institucion)
    })
    return Array.from(unicas.values()).sort((a, b) =>
      a.tipo.localeCompare(b.tipo, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
  }, [cobertura, indicesAmbito])

  const resumen = useMemo(() => {
    const agrupado = new Map<string, number>()
    institucionesAmbito.forEach(i => agrupado.set(i.tipo || 'Otro', (agrupado.get(i.tipo || 'Otro') ?? 0) + 1))
    return Array.from(agrupado, ([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
  }, [institucionesAmbito])

  const listado = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')
    return institucionesAmbito.filter(i => {
      if (tipo !== TODOS && i.tipo.toLocaleLowerCase('es') !== tipo.toLocaleLowerCase('es')) return false
      if (!termino) return true
      return [i.nombre, i.tipo, i.direccion, i.telefono, i.horario]
        .some(valor => valor?.toLocaleLowerCase('es').includes(termino))
    })
  }, [institucionesAmbito, tipo, busqueda])

  const nombreDepartamento = departamentos.find(d => d.codigo === departamento)?.nombre
  const nombreProvincia = provincias.find(p => p.codigo === provincia)?.nombre
  const nombreDistrito = distritos.find(d => d.codigo === distrito)?.nombre
  const nombreAmbito = nombreDistrito ?? nombreProvincia ?? nombreDepartamento

  if (cargando) return <div className="py-16 text-center text-sm text-muted-foreground">Cargando directorio de servicios…</div>
  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700" role="alert">
      <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> {error}</div>
      <Button variant="outline" size="sm" onClick={() => { setError(''); setCargando(true); setIntento(valor => valor + 1) }}>
        <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5" /> Directorio territorial de servicios
          </CardTitle>
          <p className="text-sm text-slate-200">Selecciona un departamento para conocer sus servicios disponibles.</p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={departamento} onValueChange={setDepartamento}>
            <SelectTrigger aria-label="Departamento"><SelectValue placeholder="Departamento *" /></SelectTrigger>
            <SelectContent>{departamentos.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={provincia} onValueChange={setProvincia} disabled={!departamento}>
            <SelectTrigger aria-label="Provincia"><SelectValue placeholder="Todas las provincias" /></SelectTrigger>
            <SelectContent><SelectItem value={TODOS}>Todas las provincias</SelectItem>{provincias.map(p => <SelectItem key={p.codigo} value={p.codigo}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={distrito} onValueChange={setDistrito} disabled={!departamento || provincia === TODOS}>
            <SelectTrigger aria-label="Distrito"><SelectValue placeholder="Todos los distritos" /></SelectTrigger>
            <SelectContent><SelectItem value={TODOS}>Todos los distritos</SelectItem>{distritos.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tipo} onValueChange={setTipo} disabled={!departamento}>
            <SelectTrigger aria-label="Tipo de servicio"><SelectValue placeholder="Todos los servicios" /></SelectTrigger>
            <SelectContent><SelectItem value={TODOS}>Todos los servicios</SelectItem>{resumen.map(r => <SelectItem key={r.nombre} value={r.nombre}>{r.nombre} ({r.cantidad})</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!departamento ? (
        <div className="rounded-xl border border-dashed bg-slate-50 px-5 py-14 text-center">
          <MapPin className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          <p className="font-semibold text-slate-700">Elige un departamento para comenzar</p>
          <p className="mt-1 text-sm text-muted-foreground">Luego podrás precisar la provincia y el distrito.</p>
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-sm text-muted-foreground">Servicios disponibles en</p><h2 className="text-2xl font-bold text-slate-900">{nombreAmbito}</h2></div>
              <Badge className="bg-green-100 px-3 py-1 text-green-700 hover:bg-green-100">{institucionesAmbito.length} sedes activas</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {resumen.map(item => (
                <button key={item.nombre} type="button" aria-pressed={tipo === item.nombre}
                  aria-label={`Filtrar por ${item.nombre}: ${item.cantidad} sedes`}
                  onClick={() => setTipo(tipo === item.nombre ? TODOS : item.nombre)}
                  className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tipo === item.nombre ? 'border-green-500 bg-green-50 ring-2 ring-green-100' : 'bg-white'}`}>
                  <span className="text-2xl font-bold text-slate-900">{item.cantidad}</span>
                  <span className="mt-1 block text-sm font-medium text-slate-600">{item.nombre}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold" aria-live="polite">Directorio <span className="text-sm font-normal text-muted-foreground">({listado.length} servicios encontrados)</span></h3>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, dirección o teléfono" className="pl-9" />
              </div>
            </div>
            {listado.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No se encontraron servicios para los filtros seleccionados.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listado.map(i => (
                  <Card key={i.id} className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3"><Badge variant="outline">{i.tipo}</Badge>{badgeAcreditacion(i.acreditacion)}</div>
                      <h4 className="font-semibold leading-snug text-slate-900">{i.nombre}</h4>
                      <div className="space-y-2 text-sm text-slate-600">
                        {i.direccion && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{i.direccion}</span></p>}
                        {i.telefono && <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{i.telefono}</span></p>}
                        {i.horario && <p className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{i.horario}</span></p>}
                      </div>
                      <p className="flex items-center gap-1.5 border-t pt-3 text-xs font-medium text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Servicio activo</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
