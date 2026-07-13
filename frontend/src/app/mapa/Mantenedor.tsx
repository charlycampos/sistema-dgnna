'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, X, CheckSquare, Square, MapPin } from 'lucide-react'
import SelectorMapaGoogle from './SelectorMapaGoogle'

/* ── Tipos ─────────────────────────────────────────────────────── */
interface InstitucionFila {
  id: string; nombre: string; tipo: string; direccion?: string
  departamento?: string; telefono?: string; horario?: string
  lat?: number | null; lng?: number | null; estado: string
  acreditacion?: string | null; nDistritos: number
}
interface Opcion { codigo: string; nombre: string }
interface DistritoOpcion { codigo: string; provincia: string; nombre: string }

const TIPOS_SUGERIDOS = ['UPE', 'CAR', 'DEMUNA', 'CEM', 'Otro']

const FORM_VACIO = {
  nombre: '', tipo: 'UPE', direccion: '', departamento: '',
  telefono: '', horario: '', lat: '', lng: '', estado: 'activo',
  acreditacion: 'ninguna',
}

const ACREDITACIONES = ['Acreditada', 'No acreditada', 'Inoperativa']

const FILAS_POR_PAGINA = 25

function BadgeAcreditacion({ valor }: { valor?: string | null }) {
  if (!valor) return <span className="text-muted-foreground">—</span>
  const color = valor === 'Acreditada' ? 'bg-green-600'
    : valor === 'Inoperativa' ? 'bg-red-600' : 'bg-gray-400'
  return <Badge className={color}>{valor}</Badge>
}

export default function Mantenedor({ puedeEditar }: { puedeEditar: boolean }) {
  const formularioRef = useRef<HTMLDivElement>(null)
  const [filas, setFilas] = useState<InstitucionFila[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [pagina, setPagina] = useState(1)

  /* filtro por ubicación (departamento/provincia/distrito) */
  const [filtroDep, setFiltroDep] = useState('')
  const [filtroProv, setFiltroProv] = useState('')
  const [filtroDist, setFiltroDist] = useState('')
  const [filtroProvincias, setFiltroProvincias] = useState<Opcion[]>([])
  const [filtroDistritos, setFiltroDistritos] = useState<DistritoOpcion[]>([])
  const [coberturaPorId, setCoberturaPorId] = useState<Record<string, string[]>>({})

  /* formulario */
  const [editandoId, setEditandoId] = useState<string | null>(null)  // null = cerrado, '' = nuevo
  const [eliminando, setEliminando] = useState<InstitucionFila | null>(null)
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [form, setForm] = useState({ ...FORM_VACIO })
  const [cobertura, setCobertura] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)

  /* El formulario se muestra encima de la tabla. Al editar una fila situada más
     abajo, llévalo a la vista para que el clic no parezca no haber respondido. */
  useEffect(() => {
    if (editandoId === null) return
    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [editandoId])

  /* cascada ubigeo */
  const [departamentos, setDepartamentos] = useState<Opcion[]>([])
  const [depSel, setDepSel] = useState('')
  const [provincias, setProvincias] = useState<Opcion[]>([])
  const [provSel, setProvSel] = useState('')
  const [distritos, setDistritos] = useState<DistritoOpcion[]>([])

  const fetchFilas = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/mapa/instituciones')
      if (res.ok) setFilas(await res.json())
    } catch { toast.error('Error al cargar instituciones') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { fetchFilas() }, [fetchFilas])

  useEffect(() => {
    fetch('/api/mapa/ubigeo/departamentos')
      .then(r => r.ok ? r.json() : [])
      .then(setDepartamentos).catch(() => {})
  }, [])

  /* cobertura de cada institución (para poder filtrar el listado por dep/prov/distrito) */
  useEffect(() => {
    fetch('/api/mapa/cobertura')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const mapa: Record<string, string[]> = {}
        const insts: { id: string }[] = data.instituciones ?? []
        const distritos: Record<string, number[]> = data.distritos ?? {}
        Object.entries(distritos).forEach(([ubi, idxs]) => {
          idxs.forEach(i => {
            const id = insts[i]?.id
            if (!id) return
            if (!mapa[id]) mapa[id] = []
            mapa[id].push(ubi)
          })
        })
        setCoberturaPorId(mapa)
      }).catch(() => {})
  }, [])

  /* cascada ubigeo — filtro del listado */
  useEffect(() => {
    setFiltroProvincias([]); setFiltroProv(''); setFiltroDistritos([]); setFiltroDist('')
    if (!filtroDep) return
    fetch(`/api/mapa/ubigeo/provincias?dep=${filtroDep}`)
      .then(r => r.ok ? r.json() : [])
      .then(setFiltroProvincias).catch(() => {})
  }, [filtroDep])

  useEffect(() => {
    setFiltroDistritos([]); setFiltroDist('')
    if (!filtroDep || !filtroProv) return
    fetch(`/api/mapa/ubigeo/distritos?dep=${filtroDep}&prov=${filtroProv}`)
      .then(r => r.ok ? r.json() : [])
      .then((ds: DistritoOpcion[]) => setFiltroDistritos(ds))
      .catch(() => {})
  }, [filtroDep, filtroProv])

  useEffect(() => {
    setProvincias([]); setProvSel(''); setDistritos([])
    if (!depSel) return
    fetch(`/api/mapa/ubigeo/provincias?dep=${depSel}`)
      .then(r => r.ok ? r.json() : [])
      .then(setProvincias).catch(() => {})
  }, [depSel])

  useEffect(() => {
    setDistritos([])
    if (!depSel || !provSel) return
    fetch(`/api/mapa/ubigeo/distritos?dep=${depSel}&prov=${provSel}`)
      .then(r => r.ok ? r.json() : [])
      .then((ds: DistritoOpcion[]) => setDistritos(ds))
      .catch(() => {})
  }, [depSel, provSel])

  /* ── acciones ─────────────────────────────────────────────── */
  const abrirNuevo = () => {
    setForm({ ...FORM_VACIO })
    setCobertura(new Set())
    setEditandoId('')
    setDepSel(''); setProvSel('')
  }

  const abrirEditar = async (id: string) => {
    try {
      const res = await fetch(`/api/mapa/instituciones/${id}`)
      if (!res.ok) throw new Error()
      const d = await res.json()
      setForm({
        nombre: d.nombre ?? '', tipo: d.tipo ?? 'UPE',
        direccion: d.direccion ?? '', departamento: d.departamento ?? '',
        telefono: d.telefono ?? '', horario: d.horario ?? '',
        lat: d.lat != null ? String(d.lat) : '', lng: d.lng != null ? String(d.lng) : '',
        estado: d.estado ?? 'activo',
        acreditacion: d.acreditacion ?? 'ninguna',
      })
      setCobertura(new Set<string>(d.cobertura ?? []))
      setEditandoId(id)
      setDepSel(''); setProvSel('')
    } catch { toast.error('No se pudo cargar la institución') }
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.tipo.trim())   { toast.error('El tipo es obligatorio'); return }
    setGuardando(true)
    try {
      const body = JSON.stringify({
        nombre: form.nombre, tipo: form.tipo, direccion: form.direccion || null,
        departamento: form.departamento || null, telefono: form.telefono || null,
        horario: form.horario || null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        estado: form.estado,
        acreditacion: form.acreditacion !== 'ninguna' ? form.acreditacion : null,
        cobertura: Array.from(cobertura),
      })
      const res = editandoId === ''
        ? await fetch('/api/mapa/instituciones', { method: 'POST', body })
        : await fetch(`/api/mapa/instituciones/${editandoId}`, { method: 'PUT', body })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.detail ?? 'Error al guardar')
      }
      toast.success(editandoId === '' ? 'Institución creada' : 'Institución actualizada')
      setEditandoId(null)
      fetchFilas()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setGuardando(false) }
  }

  const eliminar = async (id: string) => {
    try {
      const res = await fetch(`/api/mapa/instituciones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Institución eliminada')
      if (editandoId === id) setEditandoId(null)
      fetchFilas()
    } catch { toast.error('No se pudo eliminar') }
  }

  /* cobertura: helpers */
  const toggleDistrito = (codigo: string) => {
    setCobertura(prev => {
      const nx = new Set(prev)
      if (nx.has(codigo)) nx.delete(codigo); else nx.add(codigo)
      return nx
    })
  }
  const provinciaCompleta = distritos.length > 0 && distritos.every(d => cobertura.has(d.codigo))
  const toggleProvincia = () => {
    setCobertura(prev => {
      const nx = new Set(prev)
      if (provinciaCompleta) distritos.forEach(d => nx.delete(d.codigo))
      else distritos.forEach(d => nx.add(d.codigo))
      return nx
    })
  }

  /* resumen de cobertura seleccionada, agrupado por dep-prov */
  const resumenCobertura = useMemo(() => {
    const grupos: Record<string, number> = {}
    cobertura.forEach(u => {
      const k = u.slice(0, 4)
      grupos[k] = (grupos[k] ?? 0) + 1
    })
    return Object.entries(grupos).sort()
  }, [cobertura])

  const tiposExistentes = useMemo(
    () => Array.from(new Set(filas.map(f => f.tipo))).sort(), [filas])

  const filasFiltradas = filas.filter(f => {
    if (filtroTipo !== 'todos' && f.tipo !== filtroTipo) return false
    if (!`${f.nombre} ${f.tipo} ${f.departamento ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroDist) {
      if (!coberturaPorId[f.id]?.includes(filtroDist)) return false
    } else if (filtroProv) {
      if (!coberturaPorId[f.id]?.some(u => u.startsWith(filtroDep + filtroProv))) return false
    } else if (filtroDep) {
      if (!coberturaPorId[f.id]?.some(u => u.startsWith(filtroDep))) return false
    }
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / FILAS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const filasPagina = filasFiltradas.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA, paginaActual * FILAS_POR_PAGINA)

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Formulario */}
      {editandoId !== null && (
        <Card ref={formularioRef} className="border-blue-200 scroll-mt-4">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>{editandoId === '' ? 'Nueva institución' : 'Editar institución'}</CardTitle>
              <CardDescription>Datos de la sede y ámbito de cobertura territorial</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditandoId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                       placeholder="Ej. UPE Lima Norte - Callao" />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <div className="flex gap-2">
                  <Select value={TIPOS_SUGERIDOS.includes(form.tipo) ? form.tipo : 'Otro'}
                          onValueChange={v => setForm({ ...form, tipo: v === 'Otro' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_SUGERIDOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!TIPOS_SUGERIDOS.includes(form.tipo) && (
                    <Input value={form.tipo} placeholder="Tipo personalizado"
                           onChange={e => setForm({ ...form, tipo: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Dirección de la sede</Label>
                <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Departamento (sede)</Label>
                <Input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Horario</Label>
                <Input value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Acreditación (opcional)</Label>
                <Select value={form.acreditacion}
                        onValueChange={v => setForm({ ...form, acreditacion: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">— No aplica —</SelectItem>
                    {ACREDITACIONES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Latitud (sede)</Label>
                <Input value={form.lat} placeholder="-12.0486"
                       onChange={e => setForm({ ...form, lat: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Longitud (sede)</Label>
                <div className="flex gap-2">
                  <Input value={form.lng} placeholder="-77.0340"
                         onChange={e => setForm({ ...form, lng: e.target.value })} />
                  <Button type="button" variant="outline" size="icon" title="Ubicar en el mapa"
                          onClick={() => setMapaAbierto(true)}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {mapaAbierto && (
              <SelectorMapaGoogle
                lat={form.lat ? parseFloat(form.lat) : null}
                lng={form.lng ? parseFloat(form.lng) : null}
                direccion={[form.direccion, form.departamento, 'Peru'].filter(Boolean).join(', ')}
                onCerrar={() => setMapaAbierto(false)}
                onConfirmar={(lat, lng) => {
                  setForm(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }))
                  setMapaAbierto(false)
                }}
              />
            )}

            {/* Cobertura territorial */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cobertura territorial</p>
                  <p className="text-sm text-muted-foreground">
                    Selecciona departamento y provincia, luego marca los distritos cubiertos
                  </p>
                </div>
                <Badge variant="secondary">{cobertura.size} distritos seleccionados</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Departamento</Label>
                  <Select value={depSel} onValueChange={setDepSel}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {departamentos.map(d =>
                        <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Provincia</Label>
                  <Select value={provSel} onValueChange={setProvSel} disabled={!depSel}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {provincias.map(p =>
                        <SelectItem key={p.codigo} value={p.codigo}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {distritos.length > 0 && (
                <div className="space-y-2">
                  <Button type="button" variant="outline" size="sm" onClick={toggleProvincia}>
                    {provinciaCompleta
                      ? <><Square className="h-4 w-4 mr-1" /> Quitar toda la provincia</>
                      : <><CheckSquare className="h-4 w-4 mr-1" /> Marcar toda la provincia</>}
                  </Button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 max-h-64 sm:max-h-56 overflow-y-auto border rounded p-2">
                    {distritos.map(d => (
                      <label key={d.codigo}
                             className="flex items-center gap-2.5 text-sm px-1.5 py-2 sm:py-0.5 rounded hover:bg-muted cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 accent-blue-600"
                               checked={cobertura.has(d.codigo)}
                               onChange={() => toggleDistrito(d.codigo)} />
                        {d.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {resumenCobertura.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {resumenCobertura.map(([pref, n]) => (
                    <Badge key={pref} variant="outline" className="text-xs">
                      {`${pref.slice(0, 2)}-${pref.slice(2)}`} · {n} distrito{n > 1 ? 's' : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditandoId(null)}>Cancelar</Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <CardTitle>Instituciones registradas</CardTitle>
            <CardDescription>
              {filasFiltradas.length} de {filas.length} instituciones
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filtroTipo} onValueChange={v => { setFiltroTipo(v); setPagina(1) }}>
              <SelectTrigger className="flex-1 min-w-[110px] sm:flex-none sm:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tiposExistentes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroDep || 'todos'}
                    onValueChange={v => { setFiltroDep(v === 'todos' ? '' : v); setPagina(1) }}>
              <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-40"><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el Perú</SelectItem>
                {departamentos.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroProv || 'todas'} disabled={!filtroDep}
                    onValueChange={v => { setFiltroProv(v === 'todas' ? '' : v); setPagina(1) }}>
              <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-40"><SelectValue placeholder="Provincia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {filtroProvincias.map(p => <SelectItem key={p.codigo} value={p.codigo}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroDist || 'todos'} disabled={!filtroProv}
                    onValueChange={v => { setFiltroDist(v === 'todos' ? '' : v); setPagina(1) }}>
              <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-40"><SelectValue placeholder="Distrito" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {filtroDistritos.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="w-full sm:w-56" placeholder="Buscar..." value={busqueda}
                   onChange={e => { setBusqueda(e.target.value); setPagina(1) }} />
          </div>
          {puedeEditar && (
            <Button onClick={abrirNuevo} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" /> Nueva institución
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {cargando ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
          ) : (
            <>
            {/* Móvil: cards en lugar de tabla */}
            <div className="sm:hidden space-y-2">
              {filasPagina.map(f => (
                <div key={f.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug flex-1">{f.nombre}</p>
                    {puedeEditar && (
                      <div className="flex gap-1 shrink-0 -mt-1 -mr-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Editar ${f.nombre}`}
                                onClick={() => abrirEditar(f.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-red-600"
                                aria-label={`Eliminar ${f.nombre}`} onClick={() => setEliminando(f)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{f.tipo}</Badge>
                    <Badge className={f.estado === 'activo' ? 'bg-green-600' : 'bg-gray-400'}>{f.estado}</Badge>
                    <BadgeAcreditacion valor={f.acreditacion} />
                  </div>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    {f.departamento && <span>{f.departamento}</span>}
                    <span>{f.nDistritos} distrito{f.nDistritos !== 1 ? 's' : ''}</span>
                    <span className={`inline-flex items-center gap-1 ${f.lat != null && f.lng != null ? 'text-green-700' : ''}`}>
                      <MapPin className={`h-3.5 w-3.5 ${f.lat == null || f.lng == null ? 'opacity-40' : ''}`} />
                      {f.lat != null && f.lng != null ? 'Con coordenadas' : 'Sin coordenadas'}
                    </span>
                  </p>
                </div>
              ))}
              {filasFiltradas.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
              )}
            </div>

            {/* Escritorio: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Departamento</th>
                    <th className="py-2 pr-3">Distritos cubiertos</th>
                    <th className="py-2 pr-3">Acreditación</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Ubicación</th>
                    {puedeEditar && <th className="py-2">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filasPagina.map(f => (
                    <tr key={f.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-3 font-medium">{f.nombre}</td>
                      <td className="py-2 pr-3"><Badge variant="secondary">{f.tipo}</Badge></td>
                      <td className="py-2 pr-3">{f.departamento ?? '—'}</td>
                      <td className="py-2 pr-3">{f.nDistritos}</td>
                      <td className="py-2 pr-3"><BadgeAcreditacion valor={f.acreditacion} /></td>
                      <td className="py-2 pr-3">
                        <Badge className={f.estado === 'activo' ? 'bg-green-600' : 'bg-gray-400'}>
                          {f.estado}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        {f.lat != null && f.lng != null ? (
                          <span className="inline-flex items-center gap-1 text-green-700"
                                title="Tiene coordenadas registradas">
                            <MapPin className="h-4 w-4" /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground"
                                title="Sin coordenadas registradas">
                            <MapPin className="h-4 w-4 opacity-40" /> No
                          </span>
                        )}
                      </td>
                      {puedeEditar && (
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" aria-label={`Editar ${f.nombre}`}
                                    onClick={() => abrirEditar(f.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600"
                                    onClick={() => setEliminando(f)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filasFiltradas.length === 0 && (
                    <tr><td colSpan={puedeEditar ? 8 : 7} className="py-6 text-center text-muted-foreground">
                      Sin resultados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación (compartida por cards y tabla) */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  Página {paginaActual} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-10 sm:h-8" disabled={paginaActual <= 1}
                          onClick={() => setPagina(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" className="h-10 sm:h-8" disabled={paginaActual >= totalPaginas}
                          onClick={() => setPagina(p => p + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmación de eliminación */}
      <AlertDialog open={eliminando !== null} onOpenChange={(o) => { if (!o) setEliminando(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar institución?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará “{eliminando?.nombre}” y toda su cobertura territorial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEliminando(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                               onClick={() => { if (eliminando) eliminar(eliminando.id); setEliminando(null) }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
