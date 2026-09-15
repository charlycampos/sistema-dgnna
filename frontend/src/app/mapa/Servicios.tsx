'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle, Building2, CheckCircle2, Clock, Copy, Navigation,
  FileSpreadsheet, LayoutGrid, MapPin, Phone, PhoneCall, RefreshCw, Search,
  Table as TableIcon, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck,
  HeartHandshake, Home, Landmark, Check, X, RotateCcw
} from 'lucide-react'

interface UbigeoDetalle {
  codigo: string
  distrito: string
  provincia: string
  departamento: string
}

interface Institucion {
  id: string
  nombre: string
  tipo: string
  direccion?: string | null
  telefono?: string | null
  horario?: string | null
  acreditacion?: string | null
  departamento?: string | null
  ubigeo?: string | null
  distritoNombre?: string | null
  provinciaNombre?: string | null
  departamentoNombre?: string | null
}

interface Cobertura {
  instituciones: Institucion[]
  distritos: Record<string, number[]>
  totalesDep: Record<string, number>
  totalesProv: Record<string, number>
  catalogoUbigeo?: Record<string, UbigeoDetalle>
}

interface Opcion { codigo: string; nombre: string }
interface DistritoOpcion extends Opcion { provincia: string }

const TODOS = 'todos'
const ITEMS_POR_PAGINA = 20

function getEstiloTipo(tipo: string) {
  const tipoUpper = (tipo || '').toUpperCase()
  if (tipoUpper.includes('DEMUNA')) {
    return {
      borde: 'border-t-4 border-t-sky-500',
      badge: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100',
      icono: Landmark,
      colorIcono: 'text-sky-600',
      kpiActivo: 'border-sky-500 bg-sky-50 ring-2 ring-sky-100',
    }
  }
  if (tipoUpper.includes('CEM')) {
    return {
      borde: 'border-t-4 border-t-purple-500',
      badge: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
      icono: HeartHandshake,
      colorIcono: 'text-purple-600',
      kpiActivo: 'border-purple-500 bg-purple-50 ring-2 ring-purple-100',
    }
  }
  if (tipoUpper.includes('UPE')) {
    return {
      borde: 'border-t-4 border-t-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      icono: ShieldCheck,
      colorIcono: 'text-emerald-600',
      kpiActivo: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100',
    }
  }
  if (tipoUpper.includes('HRT') || tipoUpper.includes('SAR')) {
    return {
      borde: 'border-t-4 border-t-amber-500',
      badge: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
      icono: Home,
      colorIcono: 'text-amber-600',
      kpiActivo: 'border-amber-500 bg-amber-50 ring-2 ring-amber-100',
    }
  }
  return {
    borde: 'border-t-4 border-t-slate-400',
    badge: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100',
    icono: Building2,
    colorIcono: 'text-slate-600',
    kpiActivo: 'border-slate-500 bg-slate-50 ring-2 ring-slate-100',
  }
}

function badgeAcreditacion(valor?: string | null) {
  if (!valor) return null
  const clase = valor === 'Acreditada'
    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
    : valor === 'Inoperativa'
      ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
      : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100'
  return <Badge variant="outline" className={clase}>{valor}</Badge>
}

export default function Servicios() {
  const [cobertura, setCobertura] = useState<Cobertura | null>(null)
  const [departamentos, setDepartamentos] = useState<Opcion[]>([])
  const [provincias, setProvincias] = useState<Opcion[]>([])
  const [distritos, setDistritos] = useState<DistritoOpcion[]>([])
  const [departamento, setDepartamento] = useState(TODOS)
  const [provincia, setProvincia] = useState(TODOS)
  const [distrito, setDistrito] = useState(TODOS)
  const [tipo, setTipo] = useState(TODOS)
  const [filtroAcreditacion, setFiltroAcreditacion] = useState(TODOS)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'cards' | 'tabla'>('cards')
  const [paginaActual, setPaginaActual] = useState(1)
  const [idCopiado, setIdCopiado] = useState<string | null>(null)
  const [mostrarMasFiltros, setMostrarMasFiltros] = useState(false)

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
    setPaginaActual(1)
    if (!departamento || departamento === TODOS) return
    fetch(`/api/mapa/ubigeo/provincias?dep=${departamento}`)
      .then(r => r.ok ? r.json() as Promise<Opcion[]> : [])
      .then(setProvincias).catch(() => setProvincias([]))
  }, [departamento])

  useEffect(() => {
    setDistrito(TODOS)
    setDistritos([])
    setPaginaActual(1)
    if (!departamento || departamento === TODOS || provincia === TODOS) return
    fetch(`/api/mapa/ubigeo/distritos?dep=${departamento}&prov=${provincia}`)
      .then(r => r.ok ? r.json() as Promise<DistritoOpcion[]> : [])
      .then(setDistritos).catch(() => setDistritos([]))
  }, [departamento, provincia])

  useEffect(() => {
    setPaginaActual(1)
  }, [tipo, busqueda, filtroAcreditacion, distrito, departamento, provincia])

  const indicesAmbito = useMemo(() => {
    const indices = new Set<number>()
    if (!cobertura) return indices

    // Si no se selecciona departamento específico, consideramos todo el país
    if (!departamento || departamento === TODOS) {
      cobertura.instituciones.forEach((_, idx) => indices.add(idx))
      return indices
    }

    const prefijo = distrito !== TODOS
      ? distrito
      : provincia !== TODOS ? departamento + provincia : departamento

    Object.entries(cobertura.distritos).forEach(([ubigeo, ids]) => {
      if (ubigeo.startsWith(prefijo)) ids.forEach(id => indices.add(id))
    })
    return indices
  }, [cobertura, departamento, provincia, distrito])

  // Mapa inverso de índice de institución -> código ubigeo distrito
  const instIdToUbigeo = useMemo(() => {
    const mapa = new Map<string, string>()
    if (!cobertura) return mapa
    Object.entries(cobertura.distritos).forEach(([ubigeo, ids]) => {
      ids.forEach(idx => {
        const inst = cobertura.instituciones[idx]
        if (inst && !mapa.has(inst.id)) {
          mapa.set(inst.id, ubigeo)
        }
      })
    })
    return mapa
  }, [cobertura])

  const institucionesAmbito = useMemo(() => {
    if (!cobertura) return []
    const cat = cobertura.catalogoUbigeo || {}
    const unicas = new Map<string, Institucion>()
    indicesAmbito.forEach(indice => {
      const institucion = cobertura.instituciones[indice]
      if (institucion) {
        const ubigeo = instIdToUbigeo.get(institucion.id) || institucion.ubigeo || null
        const ubiInfo = ubigeo ? cat[ubigeo] : null
        unicas.set(institucion.id, {
          ...institucion,
          ubigeo: ubigeo || institucion.ubigeo || null,
          distritoNombre: ubiInfo?.distrito || null,
          provinciaNombre: ubiInfo?.provincia || null,
          departamentoNombre: ubiInfo?.departamento || institucion.departamento || null,
        })
      }
    })
    return Array.from(unicas.values()).sort((a, b) =>
      a.tipo.localeCompare(b.tipo, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
  }, [cobertura, indicesAmbito, instIdToUbigeo])

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
      if (filtroAcreditacion !== TODOS) {
        if (filtroAcreditacion === 'Acreditada' && i.acreditacion !== 'Acreditada') return false
        if (filtroAcreditacion === 'No acreditada' && (i.acreditacion === 'Acreditada' || !i.acreditacion)) return false
        if (filtroAcreditacion === 'Inoperativa' && i.acreditacion !== 'Inoperativa') return false
      }
      if (!termino) return true
      return [i.nombre, i.tipo, i.direccion, i.telefono, i.horario, i.ubigeo, i.distritoNombre, i.provinciaNombre, i.departamentoNombre]
        .some(valor => valor?.toLocaleLowerCase('es').includes(termino))
    })
  }, [institucionesAmbito, tipo, filtroAcreditacion, busqueda])

  const totalPaginas = Math.ceil(listado.length / ITEMS_POR_PAGINA) || 1
  const listadoPaginado = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
    return listado.slice(inicio, inicio + ITEMS_POR_PAGINA)
  }, [listado, paginaActual])

  const nombreDepartamento = departamentos.find(d => d.codigo === departamento)?.nombre
  const nombreProvincia = provincias.find(p => p.codigo === provincia)?.nombre
  const nombreDistrito = distritos.find(d => d.codigo === distrito)?.nombre
  const esNacional = !departamento || departamento === TODOS
  const nombreAmbito = esNacional ? 'Todo el Perú (Ámbito Nacional)' : (nombreDistrito ?? nombreProvincia ?? nombreDepartamento)

  const limpiarFiltros = () => {
    setDepartamento(TODOS)
    setProvincia(TODOS)
    setDistrito(TODOS)
    setTipo(TODOS)
    setFiltroAcreditacion(TODOS)
    setBusqueda('')
    setPaginaActual(1)
  }

  const copiarFicha = (inst: Institucion) => {
    const texto = [
      `🏛️ ${inst.tipo}: ${inst.nombre}`,
      inst.acreditacion ? `Estado: ${inst.acreditacion}` : null,
      inst.direccion ? `📍 Dirección: ${inst.direccion}` : null,
      inst.telefono ? `📞 Teléfono: ${inst.telefono}` : null,
      inst.horario ? `🕒 Horario: ${inst.horario}` : null,
      inst.distritoNombre || inst.provinciaNombre || inst.departamentoNombre
        ? `Ubicación: ${[inst.distritoNombre, inst.provinciaNombre, inst.departamentoNombre].filter(Boolean).join(', ')}${inst.ubigeo ? ` (UBIGEO: ${inst.ubigeo})` : ''}`
        : `Ámbito: ${nombreAmbito || ''}`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(texto)
      .then(() => {
        setIdCopiado(inst.id)
        toast.success('Ficha de servicio copiada al portapapeles')
        setTimeout(() => setIdCopiado(null), 2000)
      })
      .catch(() => toast.error('No se pudo copiar la ficha'))
  }

  const exportarExcel = () => {
    if (listado.length === 0) {
      toast.warning('No hay servicios para exportar')
      return
    }

    const filas = listado.map((i, idx) => ({
      'N°': idx + 1,
      'UBIGEO': i.ubigeo || '',
      'Departamento': i.departamentoNombre || (esNacional ? 'Nacional' : (nombreDepartamento || 'Nacional')),
      'Provincia': i.provinciaNombre || (provincia !== TODOS ? (nombreProvincia || provincia) : 'Todas'),
      'Distrito': i.distritoNombre || (distrito !== TODOS ? (nombreDistrito || distrito) : 'Todos'),
      'Tipo de Servicio': i.tipo,
      'Nombre de la Sede': i.nombre,
      'Acreditación': i.acreditacion || 'No aplica',
      'Dirección': i.direccion || 'Sin dirección registrada',
      'Teléfono': i.telefono || 'Sin teléfono registrado',
      'Horario de Atención': i.horario || 'Sin horario registrado',
      'Estado': i.acreditacion === 'Inoperativa' ? 'Inoperativo' : 'Activo'
    }))

    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Directorio')
    const fecha = new Date().toISOString().slice(0, 10)
    const nombreArchivo = `Directorio_Servicios_${nombreAmbito?.replace(/\s+/g, '_') || 'DGNNA'}_${fecha}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    toast.success('Directorio exportado a Excel exitosamente')
  }

  if (cargando) return <div className="py-16 text-center text-sm text-muted-foreground">Cargando directorio de servicios…</div>
  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700" role="alert">
      <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> {error}</div>
      <Button variant="outline" size="sm" onClick={() => { setError(''); setCargando(true); setIntento(valor => valor + 1) }}>
        <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
      </Button>
    </div>
  )

  const hayFiltrosActivos = !esNacional || tipo !== TODOS || filtroAcreditacion !== TODOS || busqueda.trim().length > 0
  const cantidadFiltrosSecundarios = Number(provincia !== TODOS) + Number(distrito !== TODOS) + Number(filtroAcreditacion !== TODOS)

  return (
    <div className="space-y-3">
      {/* ── Buscador Global y Filtro Territorial ─────────────────────── */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="bg-white p-3 text-slate-900">
          <div className="grid items-end gap-2 lg:grid-cols-[minmax(280px,1fr)_190px_190px_auto_auto]">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre de sede, distrito, dirección o teléfono..."
                className="h-10 rounded-lg border-slate-200 bg-slate-50/60 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select value={departamento} onValueChange={setDepartamento}>
              <SelectTrigger aria-label="Departamento" className="bg-white text-xs sm:text-sm">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los departamentos</SelectItem>
                {departamentos.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger aria-label="Tipo de servicio" className="bg-white text-xs sm:text-sm">
                <SelectValue placeholder="Tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los servicios</SelectItem>
                {resumen.map(r => <SelectItem key={r.nombre} value={r.nombre}>{r.nombre} ({r.cantidad})</SelectItem>)}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant={mostrarMasFiltros ? 'secondary' : 'outline'}
              size="sm"
              className="h-10 gap-1.5 whitespace-nowrap"
              aria-expanded={mostrarMasFiltros}
              onClick={() => setMostrarMasFiltros(valor => !valor)}
            >
              Más filtros{cantidadFiltrosSecundarios > 0 ? ` ${cantidadFiltrosSecundarios}` : ''}
              <ChevronDown className={`h-4 w-4 transition-transform ${mostrarMasFiltros ? 'rotate-180' : ''}`} />
            </Button>

            {hayFiltrosActivos && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-10 gap-1 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="bg-white px-3 pb-3 pt-0">
          {mostrarMasFiltros && (
          <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
            <div className="hidden">
              <span className="block text-[11px] font-medium text-slate-500">Departamento</span>
            <Select value={departamento} onValueChange={setDepartamento}>
              <SelectTrigger aria-label="Departamento" className="bg-white text-xs sm:text-sm">
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los departamentos (Nacional)</SelectItem>
                {departamentos.map(d => (
                  <SelectItem key={d.codigo} value={d.codigo}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-1">
              <span className="block text-[11px] font-medium text-slate-500">Provincia</span>
            <Select value={provincia} onValueChange={setProvincia} disabled={esNacional}>
              <SelectTrigger aria-label="Provincia" className="bg-white text-xs sm:text-sm">
                <SelectValue placeholder="Todas las provincias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas las provincias</SelectItem>
                {provincias.map(p => (
                  <SelectItem key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-1">
              <span className="block text-[11px] font-medium text-slate-500">Distrito</span>
            <Select value={distrito} onValueChange={setDistrito} disabled={esNacional || provincia === TODOS}>
              <SelectTrigger aria-label="Distrito" className="bg-white text-xs sm:text-sm">
                <SelectValue placeholder="Todos los distritos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los distritos</SelectItem>
                {distritos.map(d => (
                  <SelectItem key={d.codigo} value={d.codigo}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="hidden">
              <span className="block text-[11px] font-medium text-slate-500">Tipo de servicio</span>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger aria-label="Tipo de servicio" className="bg-white text-xs sm:text-sm">
                <SelectValue placeholder="Todos los servicios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los servicios</SelectItem>
                {resumen.map(r => (
                  <SelectItem key={r.nombre} value={r.nombre}>
                    {r.nombre} ({r.cantidad})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-1">
              <span className="block text-[11px] font-medium text-slate-500">Acreditación</span>
              <Select value={filtroAcreditacion} onValueChange={setFiltroAcreditacion}>
                <SelectTrigger aria-label="Acreditación" className="bg-white text-xs sm:text-sm">
                  <SelectValue placeholder="Acreditación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas las acreditaciones</SelectItem>
                  <SelectItem value="Acreditada">Solo Acreditadas</SelectItem>
                  <SelectItem value="No acreditada">No Acreditadas</SelectItem>
                  <SelectItem value="Inoperativa">Inoperativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          {hayFiltrosActivos && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2" aria-label="Filtros activos">
              <span className="text-[11px] font-medium text-slate-500">Aplicados:</span>
              {!esNacional && <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">{nombreDepartamento}<button type="button" aria-label="Quitar departamento" onClick={() => setDepartamento(TODOS)}><X className="h-3 w-3" /></button></Badge>}
              {provincia !== TODOS && <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">{nombreProvincia}<button type="button" aria-label="Quitar provincia" onClick={() => setProvincia(TODOS)}><X className="h-3 w-3" /></button></Badge>}
              {distrito !== TODOS && <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">{nombreDistrito}<button type="button" aria-label="Quitar distrito" onClick={() => setDistrito(TODOS)}><X className="h-3 w-3" /></button></Badge>}
              {tipo !== TODOS && <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">{tipo}<button type="button" aria-label="Quitar tipo de servicio" onClick={() => setTipo(TODOS)}><X className="h-3 w-3" /></button></Badge>}
              {filtroAcreditacion !== TODOS && <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">{filtroAcreditacion}<button type="button" aria-label="Quitar acreditación" onClick={() => setFiltroAcreditacion(TODOS)}><X className="h-3 w-3" /></button></Badge>}
              {busqueda.trim() && <Badge variant="secondary" className="max-w-xs gap-1 truncate bg-slate-100 text-slate-700 hover:bg-slate-100">“{busqueda.trim()}”<button type="button" aria-label="Quitar búsqueda" onClick={() => setBusqueda('')}><X className="h-3 w-3" /></button></Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Métricas y KPIs por Servicio ────────────────────────── */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900" aria-live="polite">{listado.length} servicios encontrados</h2>
            <p className="text-xs text-slate-500">{nombreAmbito}</p>
          </div>
        </div>

        <div className="grid grid-flow-col auto-cols-fr gap-2 overflow-x-auto pb-1">
          {resumen.map(item => {
            const estilo = getEstiloTipo(item.nombre)
            const Icono = estilo.icono
            const activo = tipo === item.nombre
            return (
              <button
                key={item.nombre}
                type="button"
                aria-pressed={activo}
                aria-label={`Filtrar por ${item.nombre}: ${item.cantidad} sedes`}
                onClick={() => setTipo(activo ? TODOS : item.nombre)}
                className={`group rounded-lg border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${activo ? estilo.kpiActivo : 'bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-900">{item.cantidad}</span>
                  <Icono className={`h-4 w-4 ${activo ? estilo.colorIcono : 'text-slate-400 group-hover:' + estilo.colorIcono}`} />
                </div>
                <span className="block text-xs font-medium text-slate-600">{item.nombre}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Barra de Herramientas y Acciones ───────────────────── */}
      <section className="space-y-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Directorio de sedes</h3>
          </div>

          {/* Controles de Filtro Acreditación, Exportación y Modo de Vista */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportarExcel}
              className="gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-white"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span> Excel
            </Button>

            <div className="flex items-center rounded-lg border bg-slate-50 p-0.5" aria-label="Modo de visualización">
              <Button
                variant={vista === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setVista('cards')}
                aria-pressed={vista === 'cards'}
                title="Vista Mosaico (5 Columnas)"
              >
                <LayoutGrid className="h-4 w-4" />
                Mosaico
              </Button>
              <Button
                variant={vista === 'tabla' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setVista('tabla')}
                aria-pressed={vista === 'tabla'}
                title="Vista Tabla"
              >
                <TableIcon className="h-4 w-4" />
                Tabla
              </Button>
            </div>
          </div>
        </div>

        {listado.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 p-12 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-semibold text-slate-700">No se encontraron servicios para los filtros o texto ingresado.</p>
            <p className="text-xs">Prueba borrando términos de búsqueda o seleccionando "Todos los departamentos".</p>
            <Button variant="outline" size="sm" onClick={limpiarFiltros} className="mt-2 text-xs">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restablecer filtros
            </Button>
          </div>
        ) : vista === 'cards' ? (
          /* ── VISTA 5 COLUMNAS DE CARDS ──────────────────────── */
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {listadoPaginado.map(i => {
              const estilo = getEstiloTipo(i.tipo)
              const queryMaps = encodeURIComponent([i.nombre, i.direccion, nombreAmbito, 'Perú'].filter(Boolean).join(', '))
              const urlMaps = `https://www.google.com/maps/search/?api=1&query=${queryMaps}`
              const telLimpio = i.telefono ? i.telefono.replace(/[^0-9+]/g, '') : ''
              const inoperativa = i.acreditacion === 'Inoperativa'

              return (
                <Card
                  key={i.id}
                  className={`group flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${estilo.borde}`}
                >
                  <CardContent className="flex flex-1 flex-col justify-between space-y-3 p-3 sm:p-3.5">
                    <div className="space-y-2.5">
                      {/* Cabecera del Card */}
                      <div className="flex items-start justify-between gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`font-semibold text-[10px] sm:text-xs px-2 py-0.5 ${estilo.badge}`}>
                          {i.tipo}
                        </Badge>
                        {badgeAcreditacion(i.acreditacion)}
                      </div>

                      {/* Nombre de la Institución */}
                      <h4 className="font-semibold text-slate-900 leading-snug text-xs sm:text-sm tracking-tight line-clamp-3">
                        {i.nombre}
                      </h4>

                      {/* Datos de Contacto con enlaces directos */}
                      <div className="space-y-1.5 text-xs text-slate-600">
                        {i.direccion && (
                          <a
                            href={urlMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver ubicación en Google Maps"
                            className="flex items-start gap-1.5 hover:text-sky-700 transition-colors group/addr"
                          >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover/addr:text-sky-600 transition-colors" />
                            <span className="line-clamp-2 text-[11px] leading-tight">{i.direccion}</span>
                          </a>
                        )}
                        {i.telefono && (
                          <a
                            href={`tel:${telLimpio}`}
                            title="Llamar directamente"
                            className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>{i.telefono}</span>
                          </a>
                        )}
                        {i.horario && (
                          <p className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-tight">
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{i.horario}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pie y Botonera Interactiva */}
                    <div className="border-t border-slate-100 pt-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${inoperativa ? 'text-red-700' : 'text-emerald-700'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${inoperativa ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {inoperativa ? 'Servicio inoperativo' : 'Servicio activo'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        {telLimpio ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-1.5 text-[11px] font-medium gap-1 border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-900 transition-colors"
                          >
                            <a href={`tel:${telLimpio}`} title={`Llamar a ${i.telefono}`}>
                              <PhoneCall className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span className="truncate">Llamar</span>
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="h-8 px-1 text-[10px] text-muted-foreground opacity-50 bg-slate-50 border border-slate-100"
                          >
                            <Phone className="h-2.5 w-2.5 mr-0.5 text-slate-300" />
                            Sin telf.
                          </Button>
                        )}

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-1.5 text-[11px] font-medium gap-1 border-sky-200 bg-sky-50/70 text-sky-800 hover:bg-sky-100 hover:border-sky-300 hover:text-sky-900 transition-colors"
                        >
                          <a href={urlMaps} target="_blank" rel="noopener noreferrer" title="Abrir ubicación en Google Maps">
                            <Navigation className="h-3 w-3 text-sky-600 fill-sky-200 shrink-0" />
                              <span className="truncate">Ubicar</span>
                          </a>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copiarFicha(i)}
                          className={`h-8 px-1.5 text-[11px] font-medium gap-1 transition-colors ${
                            idCopiado === i.id
                              ? 'border-green-300 bg-green-50 text-green-800'
                              : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Copiar ficha de contacto"
                        >
                          {idCopiado === i.id ? (
                            <>
                              <Check className="h-3 w-3 text-green-600 shrink-0" />
                              <span className="truncate">Listo</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate">Copiar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* ── VISTA TABLA COMPACTA ────────────────────────────── */
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wider text-slate-700">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Nombre del Servicio</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Acreditación</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listadoPaginado.map(i => {
                  const estilo = getEstiloTipo(i.tipo)
                  const queryMaps = encodeURIComponent([i.nombre, i.direccion, nombreAmbito, 'Perú'].filter(Boolean).join(', '))
                  const urlMaps = `https://www.google.com/maps/search/?api=1&query=${queryMaps}`
                  const telLimpio = i.telefono ? i.telefono.replace(/[^0-9+]/g, '') : ''

                  return (
                    <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={estilo.badge}>
                          {i.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs">
                        {i.nombre}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                        {i.direccion || <span className="text-muted-foreground italic">Sin dirección</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {i.telefono ? (
                          <a href={`tel:${telLimpio}`} className="text-sky-700 hover:underline font-mono">
                            {i.telefono}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">Sin teléfono</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[150px] truncate text-slate-600">
                        {i.horario || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {badgeAcreditacion(i.acreditacion) || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {telLimpio && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-medium gap-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              title={`Llamar a ${i.telefono}`}
                            >
                              <a href={`tel:${telLimpio}`}>
                                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">Llamar</span>
                              </a>
                            </Button>
                          )}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium gap-1 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                            title="Ver en Google Maps"
                          >
                            <a href={urlMaps} target="_blank" rel="noopener noreferrer">
                              <Navigation className="h-3.5 w-3.5 text-sky-600 fill-sky-100" />
                              <span className="hidden sm:inline">Mapa</span>
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copiarFicha(i)}
                            className="h-7 px-2 text-xs font-medium gap-1 text-slate-700 hover:bg-slate-100"
                            title="Copiar Ficha"
                          >
                            {idCopiado === i.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                                <span className="hidden sm:inline text-green-600">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Copiar</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Paginación y Resumen ────────────────────────────── */}
        {listado.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 pt-2 text-xs text-muted-foreground sm:flex-row">
            <p>
              Mostrando{' '}
              <span className="font-semibold text-slate-800">
                {Math.min((paginaActual - 1) * ITEMS_POR_PAGINA + 1, listado.length)}
              </span>{' '}
              a{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(paginaActual * ITEMS_POR_PAGINA, listado.length)}
              </span>{' '}
              de <span className="font-semibold text-slate-800">{listado.length}</span> servicios
            </p>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </Button>
                <span className="px-2 text-xs font-medium">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
